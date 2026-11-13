import { NgOptimizedImage } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { SocialReel } from '../../../models/photo';
import { TvMedia, VideoTv } from '../video-tv/video-tv';
import { centerSlot, loopFor, offsetFromCenter, positionFor, slotCount, STEP, VISIBLE_SIDE } from './wheel-layout';

/** Giro automático: una casilla cada AUTO_MS, y no antes de AUTO_MS desde el último gesto. */
const AUTO_MS = 4000;
/** Muelle crítico (sin rebote) de 0,7 s, como el de shared/glide.ts. */
const OMEGA = (2 * Math.PI) / 0.7;
/** Movimiento mínimo (px) para que un gesto cuente como arrastre y no como clic. */
const DRAG_THRESHOLD = 6;
/** Inercia al soltar: casillas que avanza por cada casilla/s de velocidad. */
const FLING = 0.18;
/** Volumen del bucle de la central al pasar el ratón (bajito) y duración de su fundido. */
const LOOP_VOLUME = 0.35;
const SOUND_FADE_MS = 400;
/** Desfase entre copias del mismo reel, como fracción del bucle. */
const LOOP_SHIFT = 0.38;
const MAX_FLING = 2;
/** Radio de las esquinas de las tarjetas, como fracción de su alto (ver .reel-card). */
export const CARD_RADIUS = 0.035;
/** `sizes` de los pósters: la tele lo reutiliza, así la imagen ya está en caché. */
export const POSTER_SIZES = '(min-width: 64rem) 22rem, (min-width: 48rem) 40vw, 60vw';

interface Playing {
  readonly reel: SocialReel;
  readonly media: TvMedia;
  readonly slot: number;
  readonly origin: () => DOMRect | null;
}

/**
 * Rueda de reels: tarjetas verticales colgadas de una rueda cuyo eje queda por debajo de la
 * sección. La del centro va recta y delante; las vecinas, giradas y medio tapadas.
 *
 *   - Gira sola una casilla cada pocos segundos mientras se ve, salvo con el ratón encima, el
 *     foco dentro, un arrastre en curso, la pestaña oculta o la tele abierta. El botón de pausa
 *     la detiene del todo (WCAG 2.2.2); con movimiento reducido empieza en pausa.
 *   - Se arrastra (ratón o dedo) con inercia, y encaja en la casilla más cercana.
 *   - Todas las que se ven reproducen su bucle en silencio; las copias del mismo reel alternan
 *     tramos distintos del vídeo (`loops`), así no parece que se repita. Con el ratón sobre la central, su bucle suena bajito. La pausa también
 *     detiene los vídeos (vuelven los pósters).
 *   - Clic en la del centro: se transforma en la tele (vertical) y suena el reel completo.
 *     Clic en otra: gira hasta ella. Con Ctrl/⌘/Mayús o la rueda, el enlace abre Instagram.
 *
 * Como la cinta de videoclips, un bucle de requestAnimationFrame escribe los transform
 * directamente en el DOM y solo corre mientras algo se mueve.
 */
@Component({
  selector: 'app-reel-wheel',
  imports: [NgOptimizedImage, VideoTv],
  templateUrl: './reel-wheel.html',
  styleUrl: './reel-wheel.css',
})
export class ReelWheel {
  readonly reels = input.required<readonly SocialReel[]>();

  protected readonly posterSizes = POSTER_SIZES;
  protected readonly cardRadius = CARD_RADIUS;

  /** Casillas de la rueda: cada una con su reel (los reels se repiten en orden). */
  protected readonly slots = computed(() => {
    const reels = this.reels();
    return Array.from({ length: slotCount(reels.length) }, (_, slot) => {
      const reel = reels[slot % reels.length];
      const copy = Math.floor(slot / reels.length);
      return {
        slot,
        index: slot % reels.length,
        reel,
        /** Su tramo: las copias vecinas del mismo reel enseñan partes distintas. */
        loopUrl: `videos/${reel.video}-loop-${loopFor(copy, reel.loops.length) + 1}.mp4`,
        /** Solo la primera vuelta llega al tabulador y a los lectores de pantalla. */
        first: slot < reels.length,
      };
    });
  });

  /** Casilla del centro. */
  protected readonly active = signal(0);
  /** Casillas que se ven en pantalla: cada una reproduce su bucle. */
  protected readonly shown = signal<ReadonlySet<number>>(new Set());
  /** Casilla cuyo bucle suena (la central, con el ratón encima). */
  protected readonly sounding = signal(-1);
  protected readonly activeIndex = computed(() => {
    const count = this.reels().length;
    return count ? this.active() % count : 0;
  });
  protected readonly count = computed(() => this.reels().length);
  /** La sección está en pantalla: solo entonces gira y reproduce. */
  protected readonly visible = signal(false);
  /** Pausa pedida por el usuario (o por movimiento reducido): ni giro ni vídeos (WCAG 2.2.2). */
  protected readonly paused = signal(false);

  protected readonly playing = signal<Playing | null>(null);
  /** Casilla oculta mientras «es» la tele (vuelve a verse en cuanto empieza el cierre). */
  protected readonly lent = signal(-1);

  protected readonly number = (i: number) => String(i + 1).padStart(2, '0');
  protected readonly meta = (reel: SocialReel) =>
    [reel.context, reel.year].filter((part) => part !== null).join(' · ');
  protected readonly label = (reel: SocialReel) => `${reel.title}, ${this.meta(reel)}. Reproducir reel`;

  private readonly stage = viewChild.required<ElementRef<HTMLElement>>('stage');

  /** Posición de la rueda, en casillas (0: la primera casilla en el centro). */
  private position = 0;
  private velocity = 0;
  private target = 0;
  private dragging = false;
  private hovering = false;
  private focused = false;
  private hidden = false;
  private reducedMotion = false;
  private lastGesture = 0;
  private frame = 0;
  private last = 0;
  private cards: HTMLElement[] = [];
  private slotWidth = 0;
  /** Medidas para saber qué tarjetas caen dentro de la pantalla (se recalculan al redimensionar). */
  private geometry: { width: number; height: number; radius: number; halfView: number } | null = null;
  /** Casilla con el ratón encima (solo ratón). */
  private hoveredSlot = -1;
  /** Fundido de volumen en curso de cada vídeo: el último manda. */
  private readonly fades = new WeakMap<HTMLVideoElement, number>();

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const stage = this.stage().nativeElement;
      const doc = stage.ownerDocument;

      const motion = matchMedia('(prefers-reduced-motion: reduce)');
      this.reducedMotion = motion.matches;
      if (this.reducedMotion) this.paused.set(true);
      const onMotion = () => (this.reducedMotion = motion.matches);
      motion.addEventListener('change', onMotion);

      const observer = new IntersectionObserver(([entry]) => {
        this.visible.set(!!entry?.isIntersecting);
        this.lastGesture = performance.now();
      });
      observer.observe(stage);

      const onVisibility = () => (this.hidden = doc.visibilityState === 'hidden');
      doc.addEventListener('visibilitychange', onVisibility);

      const onResize = () => {
        this.slotWidth = 0;
        this.geometry = null;
        this.kick();
      };
      addEventListener('resize', onResize);

      const auto = window.setInterval(() => this.autoAdvance(), 250);
      const stopInput = this.listen(stage);
      this.kick();

      destroyRef.onDestroy(() => {
        motion.removeEventListener('change', onMotion);
        observer.disconnect();
        doc.removeEventListener('visibilitychange', onVisibility);
        removeEventListener('resize', onResize);
        clearInterval(auto);
        stopInput();
        cancelAnimationFrame(this.frame);
      });
    });
  }

  protected togglePause(): void {
    this.paused.update((paused) => !paused);
    this.lastGesture = performance.now();
  }

  /**
   * Además de alternar tramos, cada copia arranca en otro punto de su tramo: las que comparten
   * tramo (nunca vecinas) tampoco van sincronizadas.
   */
  protected startAt(video: HTMLVideoElement, slot: number): void {
    const copy = Math.floor(slot / Math.max(1, this.reels().length));
    if (copy > 0 && Number.isFinite(video.duration)) video.currentTime = ((copy * LOOP_SHIFT) % 1) * video.duration;
  }

  /** El bucle ya se mueve: se funde sobre el póster (y suena si es el que toca). */
  protected loopStarted(video: HTMLVideoElement, slot: number): void {
    video.classList.add('is-playing');
    if (slot === this.sounding()) this.fade(video, LOOP_VOLUME);
  }

  /** Ratón sobre una tarjeta: si es la central, su reel suena bajito. */
  protected hoverCard(event: PointerEvent, slot: number): void {
    if (event.pointerType !== 'mouse') return;
    this.hoveredSlot = slot;
    this.updateSound();
  }

  /** La tele terminó de cerrarse. */
  protected stopped(): void {
    this.lent.set(-1);
    this.playing.set(null);
    this.lastGesture = performance.now();
  }

  /** Avanza una casilla si toca: en pantalla, sin pausa, sin interacción y sin tele abierta. */
  private autoAdvance(): void {
    const idle = performance.now() - this.lastGesture >= AUTO_MS;
    const blocked = this.paused() || !this.visible() || this.hidden || this.playing() !== null;
    if (!idle || blocked || this.dragging || this.hovering || this.focused) return;
    this.target = Math.round(this.target) + 1;
    this.lastGesture = performance.now();
    this.kick();
  }

  private kick(): void {
    if (!this.frame) this.frame = requestAnimationFrame((now) => this.tick(now));
  }

  private tick(now: number): void {
    this.frame = 0;
    const stage = this.stage().nativeElement;
    if (!this.cards.length || !this.cards[0].isConnected) {
      this.cards = [...stage.querySelectorAll<HTMLElement>('.reel-card')];
    }
    const slots = this.cards.length;
    if (!slots) return;
    const dt = this.last && now - this.last < 100 ? (now - this.last) / 1000 : 1 / 60;
    this.last = now;

    // 1. Muelle hacia la casilla destino (salvo mientras se arrastra).
    if (!this.dragging) {
      if (this.reducedMotion) {
        this.position = this.target;
        this.velocity = 0;
      } else {
        this.velocity += (OMEGA * OMEGA * (this.target - this.position) - 2 * OMEGA * this.velocity) * dt;
        this.position += this.velocity * dt;
        if (Math.abs(this.target - this.position) < 0.001 && Math.abs(this.velocity) < 0.01) {
          this.position = this.target;
          this.velocity = 0;
        }
      }
    }

    // 2. Cada tarjeta, en su ángulo de la rueda. Delante, la más cercana al centro. Las que
    //    caen fuera de la pantalla se ocultan (y no reproducen nada).
    const geometry = this.measure(stage);
    const shown = new Set<number>();
    this.cards.forEach((card, slot) => {
      const offset = offsetFromCenter(slot, this.position, slots);
      const angle = (offset * STEP * Math.PI) / 180;
      // Centro de la tarjeta respecto al eje vertical, y su medio ancho una vez girada
      const x = geometry.radius * Math.sin(angle);
      const extent = (geometry.width / 2) * Math.cos(angle) + (geometry.height / 2) * Math.abs(Math.sin(angle));
      const onScreen = Math.abs(offset) <= VISIBLE_SIDE && Math.abs(x) - extent < geometry.halfView;
      card.style.visibility = onScreen ? 'visible' : 'hidden';
      if (!onScreen) return;
      shown.add(slot);
      card.style.transform = `rotate(${(offset * STEP).toFixed(3)}deg)`;
      card.style.zIndex = String(100 - Math.round(Math.abs(offset) * 10));
      card.style.setProperty('--f', Math.max(0, 1 - Math.abs(offset)).toFixed(3));
    });
    const current = this.shown();
    if (shown.size !== current.size || [...shown].some((slot) => !current.has(slot))) this.shown.set(shown);

    // 3. La del centro: el contador y, si tiene el ratón encima, el sonido.
    const center = centerSlot(this.position, slots);
    if (center !== this.active()) {
      this.active.set(center);
      this.updateSound();
    }

    const moving = this.dragging || this.position !== this.target;
    if (moving) this.kick();
  }

  /**
   * Alto y ancho de las tarjetas, distancia de su centro al eje de la rueda y media pantalla.
   * Sin medidas todavía (antes de maquetar), todas las cercanas cuentan como visibles.
   */
  private measure(stage: HTMLElement) {
    if (!this.geometry) {
      const height = this.cards[0]?.offsetHeight ?? 0;
      const pivot = parseFloat(getComputedStyle(stage).getPropertyValue('--pivot-ratio')) || 1.3;
      const halfView = stage.clientWidth / 2 || Infinity;
      const geometry = { width: (height * 9) / 16, height, radius: height * pivot, halfView };
      if (!height) return geometry;
      this.geometry = geometry;
    }
    return this.geometry;
  }

  /**
   * Suena (bajito) el bucle de la central si tiene el ratón encima, sin arrastre ni tele.
   * Los navegadores solo dejan sonar audio después de que el usuario haya interactuado con la
   * página (un clic, una tecla); hasta entonces, sigue en silencio.
   */
  private updateSound(): void {
    const activated = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation
      ?.hasBeenActive ?? true;
    const wanted =
      activated && !this.dragging && !this.playing() && this.hoveredSlot === this.active() ? this.hoveredSlot : -1;
    const previous = this.sounding();
    if (wanted === previous) return;
    this.sounding.set(wanted);
    const videoOf = (slot: number) => this.cards[slot]?.querySelector('video') ?? null;
    const before = videoOf(previous);
    if (before) this.fade(before, 0);
    const after = videoOf(wanted);
    if (after?.classList.contains('is-playing')) this.fade(after, LOOP_VOLUME);
  }

  /** Sube o baja el volumen de un bucle con un fundido corto; a 0, queda en silencio. */
  private fade(video: HTMLVideoElement, to: number): void {
    const token = (this.fades.get(video) ?? 0) + 1;
    this.fades.set(video, token);
    const from = video.muted ? 0 : video.volume;
    if (to > 0 && video.muted) {
      video.volume = 0;
      video.muted = false;
      // Si el navegador no deja sonar, se queda mudo y sigue reproduciéndose.
      video.play()?.catch(() => {
        video.muted = true;
        video.play()?.catch(() => {});
      });
    }
    let start = 0;
    const step = (now: number) => {
      if (this.fades.get(video) !== token) return;
      start ||= now;
      // Acotado: el volumen fuera de [0, 1] lanza un error y cortaría el fundido.
      const t = Math.min(1, Math.max(0, (now - start) / SOUND_FADE_MS));
      video.volume = Math.min(1, Math.max(0, from + (to - from) * t));
      if (t < 1) requestAnimationFrame(step);
      else if (to === 0) video.muted = true;
    };
    requestAnimationFrame(step);
  }

  /** Lleva al centro la casilla `slot` por el camino corto. */
  private center(slot: number): void {
    this.target = positionFor(slot, this.target, this.cards.length || slotCount(this.reels().length));
    this.lastGesture = performance.now();
    this.kick();
  }

  /** Abre la tele con el reel de la casilla `slot` (que ya está en el centro). */
  private play(slot: number): void {
    if (this.playing()) return;
    const { reel } = this.slots()[slot];
    const card = this.cards[slot];
    this.playing.set({
      reel,
      slot,
      media: {
        kind: 'file',
        src: `videos/${reel.video}.mp4`,
        ratio: reel.photo.width / reel.photo.height,
        link: { label: 'Instagram', url: reel.instagramUrl },
      },
      origin: () => (card?.isConnected && card.style.visibility !== 'hidden' ? card.getBoundingClientRect() : null),
    });
    this.lent.set(slot);
    // La tele suena con su propio vídeo: el bucle se calla.
    this.updateSound();
  }

  /** Arrastre, clics, foco y hover. Devuelve cómo desmontarlo. */
  private listen(stage: HTMLElement): () => void {
    let pointer: number | null = null;
    let startX = 0;
    let lastX = 0;
    let lastTime = 0;
    let startPosition = 0;
    let suppressClick = false;

    const slotOf = (target: EventTarget | null) =>
      this.cards.indexOf((target as Element | null)?.closest<HTMLElement>('.reel-card') as HTMLElement);
    /** Píxeles que hay que arrastrar para avanzar una casilla: lo que separa dos tarjetas. */
    const slotWidth = () => {
      if (!this.slotWidth) {
        const card = this.cards[0];
        const height = card?.offsetHeight ?? 0;
        const pivot = parseFloat(getComputedStyle(stage).getPropertyValue('--pivot-ratio')) || 1.3;
        this.slotWidth = Math.max(1, height * pivot * Math.sin((STEP * Math.PI) / 180));
      }
      return this.slotWidth;
    };

    const down = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      pointer = event.pointerId;
      startX = lastX = event.clientX;
      lastTime = event.timeStamp;
      startPosition = this.position;
      suppressClick = false;
    };

    const move = (event: PointerEvent) => {
      if (event.pointerId !== pointer) return;
      if (!this.dragging) {
        if (Math.abs(event.clientX - startX) < DRAG_THRESHOLD) return;
        this.dragging = true;
        suppressClick = true;
        this.velocity = 0;
        startPosition = this.position;
        startX = event.clientX;
        stage.setPointerCapture?.(event.pointerId);
        stage.dataset['dragging'] = '';
        this.updateSound();
      }
      const elapsed = (event.timeStamp - lastTime) / 1000;
      if (elapsed > 0) {
        const speed = -(event.clientX - lastX) / slotWidth() / elapsed;
        this.velocity = this.velocity * 0.5 + speed * 0.5;
      }
      lastX = event.clientX;
      lastTime = event.timeStamp;
      // Arrastrar a la izquierda trae las de la derecha: la rueda gira con el dedo.
      this.position = startPosition - (event.clientX - startX) / slotWidth();
      this.lastGesture = performance.now();
      this.kick();
    };

    const up = (event: PointerEvent) => {
      if (event.pointerId !== pointer) return;
      pointer = null;
      if (!this.dragging) return;
      this.dragging = false;
      delete stage.dataset['dragging'];
      const idle = event.timeStamp - lastTime > 100;
      // Inercia, como mucho MAX_FLING casillas: un gesto rápido no debe hacer girar media rueda.
      const fling = idle || this.reducedMotion ? 0 : Math.max(-MAX_FLING, Math.min(MAX_FLING, this.velocity * FLING));
      this.target = Math.round(this.position + fling);
      this.velocity = 0;
      this.lastGesture = performance.now();
      this.updateSound();
      this.kick();
    };

    // Clic: tras un arrastre, nada; en una lateral, girar hasta ella; en la central, la tele.
    const click = (event: MouseEvent) => {
      if (suppressClick) {
        suppressClick = false;
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      const slot = slotOf(event.target);
      if (slot < 0) return;
      if (slot !== this.active()) {
        event.preventDefault();
        this.center(slot);
        return;
      }
      const modified = event.ctrlKey || event.metaKey || event.shiftKey || event.altKey;
      if (modified) return;
      event.preventDefault();
      this.play(slot);
    };

    const focusIn = (event: FocusEvent) => {
      this.focused = true;
      const slot = slotOf(event.target);
      if (slot >= 0 && slot !== this.active()) this.center(slot);
    };
    const focusOut = (event: FocusEvent) => {
      if (!stage.contains(event.relatedTarget as Node | null)) this.focused = false;
    };
    const enter = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') this.hovering = true;
    };
    const leave = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      this.hovering = false;
      this.hoveredSlot = -1;
      this.updateSound();
      this.lastGesture = performance.now();
    };

    const listeners: [string, EventListener, AddEventListenerOptions?][] = [
      ['pointerdown', down as EventListener],
      ['pointermove', move as EventListener],
      ['pointerup', up as EventListener],
      ['pointercancel', up as EventListener],
      ['pointerenter', enter as EventListener],
      ['pointerleave', leave as EventListener],
      ['click', click as EventListener, { capture: true }],
      ['focusin', focusIn as EventListener],
      ['focusout', focusOut as EventListener],
    ];
    for (const [type, handler, options] of listeners) stage.addEventListener(type, handler, options);
    return () => {
      for (const [type, handler, options] of listeners) stage.removeEventListener(type, handler, options);
    };
  }
}
