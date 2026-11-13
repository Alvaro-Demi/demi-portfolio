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
import { centerSlot, offsetFromCenter, positionFor, slotCount, STEP, VISIBLE_SIDE } from './wheel-layout';

/** Giro automático: una casilla cada AUTO_MS, y no antes de AUTO_MS desde el último gesto. */
const AUTO_MS = 4000;
/** Muelle crítico (sin rebote) de 0,7 s, como el de shared/glide.ts. */
const OMEGA = (2 * Math.PI) / 0.7;
/** Movimiento mínimo (px) para que un gesto cuente como arrastre y no como clic. */
const DRAG_THRESHOLD = 6;
/** Inercia al soltar: casillas que avanza por cada casilla/s de velocidad. */
const FLING = 0.18;
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
 *   - La del centro reproduce su bucle mudo; las demás enseñan el póster.
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
    return Array.from({ length: slotCount(reels.length) }, (_, slot) => ({
      slot,
      index: slot % reels.length,
      reel: reels[slot % reels.length],
      /** Solo la primera vuelta llega al tabulador y a los lectores de pantalla. */
      first: slot < reels.length,
    }));
  });

  /** Casilla del centro (su vídeo es el único que suena, mudo). */
  protected readonly active = signal(0);
  protected readonly activeIndex = computed(() => {
    const count = this.reels().length;
    return count ? this.active() % count : 0;
  });
  protected readonly count = computed(() => this.reels().length);
  /** La sección está en pantalla: solo entonces gira y reproduce. */
  protected readonly visible = signal(false);
  /** Pausa pedida por el usuario (o por movimiento reducido). */
  protected readonly paused = signal(false);
  /** El bucle de la tarjeta central ya se está viendo (se funde sobre el póster). */
  protected readonly loopPlaying = signal(false);

  protected readonly playing = signal<Playing | null>(null);
  /** Casilla oculta mientras «es» la tele (vuelve a verse en cuanto empieza el cierre). */
  protected readonly lent = signal(-1);

  protected readonly number = (i: number) => String(i + 1).padStart(2, '0');
  protected readonly meta = (reel: SocialReel) =>
    [reel.context, reel.year].filter((part) => part !== null).join(' · ');
  protected readonly label = (reel: SocialReel) => `${reel.title}, ${this.meta(reel)}. Reproducir reel`;
  protected readonly loopUrl = (reel: SocialReel) => `videos/${reel.video}-loop.mp4`;

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

    // 2. Cada tarjeta, en su ángulo de la rueda. Delante, la más cercana al centro.
    this.cards.forEach((card, slot) => {
      const offset = offsetFromCenter(slot, this.position, slots);
      const hidden = Math.abs(offset) > VISIBLE_SIDE;
      card.style.visibility = hidden ? 'hidden' : 'visible';
      if (hidden) return;
      card.style.transform = `rotate(${(offset * STEP).toFixed(3)}deg)`;
      card.style.zIndex = String(100 - Math.round(Math.abs(offset) * 10));
      card.style.setProperty('--f', Math.max(0, 1 - Math.abs(offset)).toFixed(3));
    });

    // 3. La del centro: su vídeo y el contador.
    const center = centerSlot(this.position, slots);
    if (center !== this.active()) {
      this.active.set(center);
      this.loopPlaying.set(false);
    }

    const moving = this.dragging || this.position !== this.target;
    if (moving) this.kick();
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
