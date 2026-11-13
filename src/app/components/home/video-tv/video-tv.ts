import { DOCUMENT, NgOptimizedImage } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Photo } from '../../../models/photo';
import {
  YOUTUBE_EMBED_ORIGIN,
  YoutubeVideo,
  youtubeEmbedUrl,
  youtubeWatchUrl,
} from '../../../shared/youtube';

/** Enlace de respaldo para verlo en su plataforma. */
export interface TvLink {
  readonly label: string;
  readonly url: string;
}

/**
 * Lo que se ve en la tele: un vídeo de YouTube (iframe sin cookies) o un vídeo propio
 * (`<video>`), con la proporción de su pantalla y el enlace a su plataforma.
 */
export type TvMedia =
  | { readonly kind: 'youtube'; readonly video: YoutubeVideo }
  | { readonly kind: 'file'; readonly src: string; readonly ratio: number; readonly link: TvLink };

/** Apertura: la portada vuela y crece, se abren las bandas y el marco sale de la pantalla. */
const OPEN_MS = 950;
/** Fracción de la apertura en la que la pantalla ya está en su sitio (después, el marco). */
const SCREEN_AT = 0.62;
/** Cierre: algo más rápido que la apertura (las salidas no deben hacer esperar). */
const CLOSE_MS = 700;
/** Fracción del cierre en la que el marco ya se ha recogido sobre la pantalla. */
const FRAME_AT = 0.28;
/** Con movimiento reducido: solo un fundido. */
const FADE_MS = 200;
/** Curvas: el vuelo, suave en los dos extremos; el marco y el fondo, frenando. */
const EASE_FLIGHT = 'cubic-bezier(0.7, 0, 0.2, 1)';
const EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)';
/** Si YouTube no confirma la reproducción (autoplay bloqueado), se enseña su reproductor igual. */
const REVEAL_FALLBACK_MS = 1600;

let nextId = 0;

type Phase = 'opening' | 'open' | 'closing';

interface Box {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

const inset = (top: number, right: number, bottom: number, left: number, radius: number) =>
  `inset(${top.toFixed(2)}px ${right.toFixed(2)}px ${bottom.toFixed(2)}px ${left.toFixed(2)}px round ${radius.toFixed(2)}px)`;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

/**
 * La tele: reproduce un vídeo dentro de la web, en un `<dialog>` modal. Sirve para los
 * videoclips de YouTube (pantalla 16:9) y para los reels propios (pantalla vertical).
 *
 * Se abre como una transformación de la tarjeta de origen (técnica FLIP con la Web Animations
 * API): la tele se coloca en su sitio final y un solo elemento anima `transform` y `clip-path`
 * desde el rectángulo de la tarjeta. Primero vuela la portada; luego se abren las bandas negras
 * de la pantalla 16:9; al final, el marco sale de la pantalla hacia fuera. El cierre recorre
 * el camino inverso hasta donde esté la tarjeta en ese momento.
 *
 * View Transitions no sirve aquí: la tarjeta es un punto de 0×0 del que cuelgan franjas en 3D,
 * y la API calcula la geometría con la caja del elemento.
 *
 * Accesibilidad: `showModal()` deja inerte el resto de la página, retiene el foco dentro y lo
 * devuelve al cerrar. Escape, el botón y un clic fuera de la tele cierran. Bloquea el scroll.
 */
@Component({
  selector: 'app-video-tv',
  imports: [NgOptimizedImage],
  templateUrl: './video-tv.html',
  styleUrl: './video-tv.css',
})
export class VideoTv {
  readonly heading = input.required<string>();
  readonly meta = input.required<string>();
  /** Portada de la tarjeta: se ve entera en la pantalla hasta que arranca el vídeo. */
  readonly poster = input.required<Photo>();
  /** `sizes` del póster: el mismo que en la tarjeta, así la imagen ya está en caché. */
  readonly posterSizes = input.required<string>();
  readonly media = input.required<TvMedia>();
  /** Rectángulo en pantalla de la tarjeta de origen; se mide al abrir y otra vez al cerrar. */
  readonly origin = input.required<() => DOMRect | null>();
  /** Radio de las esquinas de la tarjeta de origen, como fracción de su alto. */
  readonly originRadius = input(0.05);
  /** Empieza el cierre: la tarjeta de origen puede volver a verse. */
  readonly closing = output<void>();
  /** Terminó el cierre: ya se puede retirar el componente. */
  readonly closed = output<void>();

  private readonly document = inject(DOCUMENT);
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly titleId = `tv-title-${nextId++}`;

  protected readonly phase = signal<Phase>('opening');
  /** El vídeo no se puede reproducir aquí (YouTube no lo deja insertar, o falla el archivo). */
  protected readonly failed = signal(false);
  private readonly morphed = signal(false);
  private readonly playing = signal(false);
  private readonly timedOut = signal(false);

  /** El vídeo de YouTube, si lo es. */
  protected readonly youtube = computed(() => {
    const media = this.media();
    return media.kind === 'youtube' ? media.video : null;
  });
  /** El archivo de vídeo propio, si lo es. */
  protected readonly file = computed(() => {
    const media = this.media();
    return media.kind === 'file' ? media.src : null;
  });
  protected readonly link = computed<TvLink>(() => {
    const media = this.media();
    return media.kind === 'file' ? media.link : { label: 'YouTube', url: youtubeWatchUrl(media.video) };
  });
  /** Proporción de la pantalla: 16:9 para YouTube; la del archivo para los propios (9:16 en reels). */
  protected readonly screenRatio = computed(() => {
    const media = this.media();
    return media.kind === 'file' ? media.ratio : 16 / 9;
  });
  /** La URL se construye solo con un id validado (11 caracteres [A-Za-z0-9_-]). */
  protected readonly embedUrl = computed(() => {
    const video = this.youtube();
    return video
      ? this.sanitizer.bypassSecurityTrustResourceUrl(youtubeEmbedUrl(video, this.document.location.origin))
      : null;
  });
  /** El reproductor existe mientras la tele está abierta: quitarlo al cerrar corta el sonido en seco. */
  protected readonly showFrame = computed(() => !this.failed() && this.phase() !== 'closing');
  /** El vídeo se funde sobre el póster cuando la pantalla está en su sitio y ya reproduce. */
  protected readonly revealed = computed(
    () => this.showFrame() && this.morphed() && (this.playing() || this.timedOut()),
  );
  /** Piloto rojo encendido mientras suena: «en el aire». */
  protected readonly onAir = computed(() => this.revealed() && this.playing());

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly backdrop = viewChild.required<ElementRef<HTMLElement>>('backdrop');
  private readonly tv = viewChild.required<ElementRef<HTMLElement>>('tv');
  private readonly screen = viewChild.required<ElementRef<HTMLElement>>('screen');
  private readonly chin = viewChild.required<ElementRef<HTMLElement>>('chin');
  private readonly frame = viewChild<ElementRef<HTMLIFrameElement>>('frame');

  private animations: Animation[] = [];
  private reducedMotion = false;
  private done = false;
  private previousFocus: HTMLElement | null = null;
  private restoreScroll: () => void = () => {};
  private timers: number[] = [];

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const view = this.document.defaultView!;
      this.reducedMotion = view.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.previousFocus = this.document.activeElement as HTMLElement | null;
      this.restoreScroll = this.lockScroll();

      // Mide la tarjeta antes de abrir: el modal deja la página inerte, pero no la mueve.
      const from = this.origin()();
      this.dialog().nativeElement.showModal?.();
      this.open(from);

      view.addEventListener('message', this.onMessage);
      destroyRef.onDestroy(() => {
        view.removeEventListener('message', this.onMessage);
        this.timers.forEach((timer) => clearTimeout(timer));
        this.animations.forEach((animation) => animation.cancel());
        this.restoreScroll();
      });
    });
  }

  /** Cierra con la transición inversa. Se puede llamar en cualquier momento, también abriendo. */
  close(): void {
    if (this.phase() === 'closing' || this.done) return;
    const morphed = this.morphed();
    this.phase.set('closing');
    this.closing.emit();

    const tv = this.tv().nativeElement;
    const backdrop = this.backdrop().nativeElement;
    const chin = this.chin().nativeElement;
    // Punto de partida: donde esté ahora (también a mitad de la apertura).
    const now = getComputedStyle(tv);
    const current = { transform: now.transform, clipPath: now.clipPath, opacity: now.opacity };
    const backdropOpacity = getComputedStyle(backdrop).opacity;
    const chinOpacity = getComputedStyle(chin).opacity;
    this.stopAnimations();

    if (!this.canAnimate(tv)) {
      this.finish();
      return;
    }
    const to = this.origin()();
    if (this.reducedMotion || !to) {
      const fade = { duration: FADE_MS, easing: 'linear', fill: 'forwards' } as const;
      this.run(tv.animate([{ opacity: current.opacity }, { opacity: 0 }], fade));
      this.run(backdrop.animate([{ opacity: backdropOpacity }, { opacity: 0 }], fade)).finished.then(
        () => this.finish(),
        () => {},
      );
      return;
    }

    const morph = this.morph(to);
    const keyframes: Keyframe[] = morphed
      ? [
          { transform: 'none', clipPath: morph.full, opacity: 1, easing: EASE_OUT },
          { transform: 'none', clipPath: morph.screen, opacity: 1, offset: FRAME_AT, easing: EASE_FLIGHT },
          { opacity: 1, offset: 0.88 },
          { transform: morph.transform, clipPath: morph.card, opacity: 0 },
        ]
      : [
          { ...current, easing: EASE_FLIGHT },
          { opacity: 1, offset: 0.88 },
          { transform: morph.transform, clipPath: morph.card, opacity: 0 },
        ];
    const duration = morphed ? CLOSE_MS : CLOSE_MS * (1 - FRAME_AT);
    this.run(tv.animate(keyframes, { duration, fill: 'forwards' }));
    this.run(chin.animate([{ opacity: chinOpacity }, { opacity: 0 }], { duration: 160, fill: 'forwards' }));
    this.run(
      backdrop.animate([{ opacity: backdropOpacity }, { opacity: 0 }], {
        duration,
        easing: 'cubic-bezier(0.4, 0, 0.6, 1)',
        fill: 'forwards',
      }),
    ).finished.then(
      () => this.finish(),
      () => {},
    );
  }

  /** Escape: el navegador cerraría en seco; se cierra con la transición. */
  protected onCancel(event: Event): void {
    event.preventDefault();
    this.close();
  }

  /** Si el navegador cierra el diálogo por su cuenta (p. ej. Escape dos veces), se termina ya. */
  protected onNativeClose(): void {
    if (this.done) return;
    if (this.phase() !== 'closing') {
      this.phase.set('closing');
      this.closing.emit();
    }
    this.finish();
  }

  /** El iframe cargó: se le pide a YouTube que informe de su estado y de sus errores. */
  protected onFrameLoad(): void {
    const target = this.frame()?.nativeElement.contentWindow;
    if (!target) return;
    const listen = () =>
      target.postMessage(JSON.stringify({ event: 'listening', id: this.titleId, channel: 'widget' }), YOUTUBE_EMBED_ORIGIN);
    listen();
    // YouTube no siempre atiende el primer aviso: se repite unas veces, como hace su propia API.
    for (let i = 1; i <= 8; i++) this.timers.push(window.setTimeout(listen, i * 250));
    this.timers.push(window.setTimeout(() => this.timedOut.set(true), REVEAL_FALLBACK_MS));
  }

  /** Vídeo propio: si el navegador no deja arrancar con sonido, se enseñan sus controles igual. */
  protected onVideoReady(): void {
    this.timers.push(window.setTimeout(() => this.timedOut.set(true), REVEAL_FALLBACK_MS));
  }

  protected onVideoState(playing: boolean): void {
    this.playing.set(playing);
  }

  private readonly onMessage = (event: MessageEvent) => {
    if (event.origin !== YOUTUBE_EMBED_ORIGIN) return;
    if (event.source !== this.frame()?.nativeElement.contentWindow) return;
    let data: unknown = event.data;
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch {
        return;
      }
    }
    if (!isRecord(data)) return;

    // 2: id no válido · 5: error del reproductor · 100: no existe · 101/150: no admite inserción
    if (data['event'] === 'onError') {
      this.failed.set(true);
      return;
    }
    const state =
      data['event'] === 'onStateChange'
        ? data['info']
        : data['event'] === 'infoDelivery' && isRecord(data['info'])
          ? data['info']['playerState']
          : undefined;
    // 1: reproduciendo · 3: cargando (ya se ve imagen)
    if (state === 1 || state === 3) this.playing.set(true);
    if (state === 2 || state === 0) this.playing.set(false);
  };

  private open(from: DOMRect | null): void {
    const tv = this.tv().nativeElement;
    const backdrop = this.backdrop().nativeElement;
    const chin = this.chin().nativeElement;

    if (!this.canAnimate(tv)) {
      this.opened();
      return;
    }
    if (this.reducedMotion || !from) {
      const fade = { duration: FADE_MS, easing: 'linear' } as const;
      this.run(backdrop.animate([{ opacity: 0 }, { opacity: 1 }], fade));
      this.run(tv.animate([{ opacity: 0 }, { opacity: 1 }], fade)).finished.then(
        () => this.opened(),
        () => {},
      );
      return;
    }

    const morph = this.morph(from);
    this.run(
      backdrop.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: OPEN_MS * 0.7,
        easing: 'cubic-bezier(0.4, 0, 0.6, 1)',
      }),
    );
    this.run(
      tv.animate(
        [
          { transform: morph.transform, clipPath: morph.card, easing: EASE_FLIGHT },
          { transform: 'none', clipPath: morph.screen, offset: SCREEN_AT, easing: EASE_OUT },
          { transform: 'none', clipPath: morph.full },
        ],
        { duration: OPEN_MS },
      ),
    ).finished.then(
      () => this.opened(),
      () => {},
    );
    this.run(
      chin.animate([{ opacity: 0, transform: 'translateY(0.5rem)' }, { opacity: 1, transform: 'none' }], {
        duration: 420,
        delay: OPEN_MS * 0.72,
        easing: EASE_OUT,
        fill: 'backwards',
      }),
    );
  }

  private opened(): void {
    if (this.phase() !== 'opening') return;
    this.stopAnimations();
    this.phase.set('open');
    this.morphed.set(true);
  }

  private finish(): void {
    if (this.done) return;
    this.done = true;
    const dialog = this.dialog().nativeElement;
    if (dialog.open) dialog.close?.();
    this.restoreScroll();
    this.restoreScroll = () => {};
    // El diálogo ya devuelve el foco; esto cubre a los navegadores que no lo hacen.
    const active = this.document.activeElement;
    if ((!active || active === this.document.body) && this.previousFocus?.isConnected) {
      this.previousFocus.focus({ preventScroll: true });
    }
    this.closed.emit();
  }

  /**
   * Geometría de la transformación, en coordenadas de la tele sin transformar (offset*, que no
   * se ven afectadas por las animaciones en curso):
   *   - transform: lleva la portada de la pantalla encima de la tarjeta.
   *   - card: recorte con la forma de la tarjeta. screen: solo la pantalla. full: la tele.
   * La portada se ve entera en la pantalla (contain, con bandas negras), igual que en la
   * tarjeta: así el primer fotograma coincide con lo que había en la cinta.
   */
  private morph(card: DOMRect): { transform: string; card: string; screen: string; full: string } {
    const tvEl = this.tv().nativeElement;
    const screenEl = this.screen().nativeElement;
    const tv: Box = { x: tvEl.offsetLeft, y: tvEl.offsetTop, w: tvEl.offsetWidth, h: tvEl.offsetHeight };
    const screen: Box = { x: screenEl.offsetLeft, y: screenEl.offsetTop, w: screenEl.offsetWidth, h: screenEl.offsetHeight };
    const tvRadius = parseFloat(getComputedStyle(tvEl).borderTopLeftRadius) || 0;
    const screenRadius = parseFloat(getComputedStyle(screenEl).borderTopLeftRadius) || 0;

    // La portada dentro de la pantalla (contain).
    const { width, height } = this.poster();
    const ratio = width / height;
    const posterW = Math.min(screen.w, screen.h * ratio);
    const posterH = posterW / ratio;
    const cx = screen.x + screen.w / 2;
    const cy = screen.y + screen.h / 2;

    // Escala para que la portada cubra la tarjeta, y la zona visible (la tarjeta) sin escalar.
    const scale = Math.max(card.width / posterW, card.height / posterH);
    const visibleW = card.width / scale;
    const visibleH = card.height / scale;
    const tx = card.left + card.width / 2 - tv.x - scale * cx;
    const ty = card.top + card.height / 2 - tv.y - scale * cy;
    // Las esquinas de la tarjeta de origen (p. ej. .rib-face redondea un 5 % de su alto).
    const cardRadius = (card.height * this.originRadius()) / scale;

    return {
      transform: `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${scale.toFixed(4)})`,
      card: inset(
        cy - visibleH / 2,
        tv.w - (cx + visibleW / 2),
        tv.h - (cy + visibleH / 2),
        cx - visibleW / 2,
        cardRadius,
      ),
      screen: inset(screen.y, tv.w - screen.x - screen.w, tv.h - screen.y - screen.h, screen.x, screenRadius),
      full: inset(0, 0, 0, 0, tvRadius),
    };
  }

  /** Bloquea el scroll del documento sin que la página salte al desaparecer la barra. */
  private lockScroll(): () => void {
    const root = this.document.documentElement;
    const { overflow, scrollbarGutter } = root.style;
    const hasScrollbar = root.scrollHeight > root.clientHeight;
    root.style.overflow = 'hidden';
    if (hasScrollbar) root.style.scrollbarGutter = 'stable';
    return () => {
      root.style.overflow = overflow;
      root.style.scrollbarGutter = scrollbarGutter;
    };
  }

  /** Sin Web Animations API (entornos de prueba, navegadores muy antiguos): sin transición. */
  private canAnimate(element: HTMLElement): boolean {
    return typeof element.animate === 'function';
  }

  private run(animation: Animation): Animation {
    this.animations.push(animation);
    return animation;
  }

  private stopAnimations(): void {
    this.animations.forEach((animation) => animation.cancel());
    this.animations = [];
  }
}
