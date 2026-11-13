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
import { WorkEntry } from '../../../models/photo';
import { unionRect } from '../../../shared/rect';
import { parseYoutubeUrl } from '../../../shared/youtube';
import { TvMedia, VideoTv } from '../video-tv/video-tv';
import { COPIES, COVER_SIZES, layoutRibbon, RibbonCard, wrap } from './ribbon-layout';

/** El videoclip que suena en la tele y la tarjeta de la que salió. */
interface Playing {
  readonly entry: WorkEntry;
  readonly media: TvMedia;
  readonly card: number;
  readonly origin: () => DOMRect | null;
}

/** Franjas por tarjeta: cada una se coloca en la onda, así la tarjeta se curva de verdad. */
const SLICES = 8;
/** La onda: largo (en u), amplitud en reposo y máxima (en u, hacia la cámara y hacia atrás). */
const WAVE_LENGTH = 3.2;
const REST_AMPLITUDE = 0.07;
const MAX_AMPLITUDE = 0.34;
/** Cuánto crece la onda con la velocidad (u de amplitud por u/s) y cuánto se desplaza con ella. */
const AMPLITUDE_PER_SPEED = 0.05;
const WAVE_DRIFT = 0.5;
/** Inercia al soltar (frenada por segundo) y velocidad por debajo de la cual encaja (px/s). */
const FRICTION = 3.2;
const SNAP_BELOW = 40;
/** Rapidez de los ajustes suaves: encaje, amplitud y elevación al pasar el ratón. */
const SNAP_RESPONSE = 7;
const AMPLITUDE_RESPONSE = 5;
const LIFT_RESPONSE = 10;
/** Elevación de la tarjeta bajo el ratón, en u. */
const LIFT = 0.12;
/** Movimiento mínimo (px) para que un gesto cuente como arrastre y no como clic. */
const DRAG_THRESHOLD = 6;
/** Pausa tras la rueda/trackpad horizontal antes de encajar (ms). */
const WHEEL_IDLE = 140;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Cinta de videoclips: las portadas en una cinta flexible en 3D que se arrastra (ratón),
 * se desliza (dedo) o se mueve con la rueda horizontal. Al moverla, las tarjetas se doblan
 * como tela; al soltarla, conserva la inercia y encaja la tarjeta más cercana en el centro.
 *
 *   - La tarjeta del centro se ve nítida y con el título grande; las demás, tras un velo
 *     de cristal esmerilado. Es gradual: depende de lo cerca que esté cada una del centro.
 *   - Clic en la del centro: la tarjeta se transforma en una tele (VideoTv) que reproduce el
 *     videoclip sin salir de la web. Con Ctrl/⌘/Mayús o la rueda, se abre YouTube como un
 *     enlace normal. Clic en otra: la trae al centro (así no hace falta arrastrar para
 *     recorrerla, WCAG 2.5.7). Con teclado, la tarjeta que recibe el foco se centra sola.
 *   - Hover: la tarjeta se adelanta, se aclara el velo y un reflejo la recorre.
 *   - No se mueve sola: no necesita botón de pausa.
 *
 * Las posiciones las escribe un bucle de requestAnimationFrame directamente en el DOM (no
 * pasa por Angular) y solo corre mientras algo se mueve.
 */
@Component({
  selector: 'app-video-ribbon',
  imports: [NgOptimizedImage, VideoTv],
  templateUrl: './video-ribbon.html',
  styleUrl: './video-ribbon.css',
})
export class VideoRibbon {
  readonly entries = input.required<readonly WorkEntry[]>();

  protected readonly layout = computed(() => layoutRibbon(this.entries()));
  protected readonly slices = Array.from({ length: SLICES }, (_, k) => k);
  protected readonly copies = COPIES;
  protected readonly coverSizes = COVER_SIZES;

  /** Índice (en la lista original) de la tarjeta del centro: para el contador. */
  protected readonly active = signal(0);
  protected readonly near = signal(false);

  /** El vídeo de cada entrada (en la lista original), o `null` si no se puede reproducir aquí. */
  protected readonly videos = computed(() => this.entries().map((entry) => parseYoutubeUrl(entry.youtubeUrl)));
  /** Lo que suena en la tele; solo uno a la vez. */
  protected readonly playing = signal<Playing | null>(null);
  /** Tarjeta oculta mientras «es» la tele (vuelve a verse en cuanto empieza el cierre). */
  protected readonly lent = signal(-1);

  protected readonly count = computed(() => this.entries().length);
  protected readonly number = (i: number) => String(i + 1).padStart(2, '0');
  protected readonly heading = (entry: WorkEntry) => entry.title ?? entry.artist;
  protected readonly meta = (entry: WorkEntry) =>
    [entry.context, entry.year].filter((part) => part !== null).join(' · ');
  protected readonly linkLabel = (entry: WorkEntry, index: number) =>
    `${this.heading(entry)}, ${this.meta(entry)}. ` +
    (this.videos()[index] ? 'Reproducir videoclip' : 'Ver en YouTube (se abre en una pestaña nueva)');

  private readonly stage = viewChild.required<ElementRef<HTMLElement>>('stage');

  /** Desplazamiento de la cinta, en px (0: la primera tarjeta en el centro). */
  private offset = 0;
  private velocity = 0;
  private target: number | null = null;
  private amplitude = REST_AMPLITUDE;
  private phase = 0;
  private dragging = false;
  private wheelUntil = 0;
  private hovered = -1;
  private lifts: number[] = [];
  private reducedMotion = false;
  private frame = 0;
  private last = 0;
  private lastOffset = 0;

  /** Medidas y nodos, que se recogen en cuanto existen las tarjetas. */
  private unit = 0;
  private previousUnit = 0;
  private cards: HTMLElement[] = [];
  private sliceNodes: HTMLElement[][] = [];
  private activeCard = -1;

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const stage = this.stage().nativeElement;

      const motion = matchMedia('(prefers-reduced-motion: reduce)');
      const onMotion = () => (this.reducedMotion = motion.matches);
      onMotion();
      motion.addEventListener('change', onMotion);

      // Las tarjetas se montan (y piden sus fotos) cuando la sección se acerca.
      const proximity = new IntersectionObserver(
        ([entry]) => {
          if (!entry?.isIntersecting) return;
          this.near.set(true);
          proximity.disconnect();
          requestAnimationFrame(() => this.kick());
        },
        { rootMargin: '100% 0px' },
      );
      proximity.observe(stage);

      const onResize = () => {
        this.unit = 0;
        this.kick();
      };
      addEventListener('resize', onResize);
      const stopInput = this.listen(stage);

      destroyRef.onDestroy(() => {
        motion.removeEventListener('change', onMotion);
        proximity.disconnect();
        removeEventListener('resize', onResize);
        stopInput();
        cancelAnimationFrame(this.frame);
      });
    });
  }

  /** Pasar el ratón por una tarjeta la adelanta (solo ratón: en táctil no hay hover). */
  protected hover(event: PointerEvent, card: number): void {
    if (event.pointerType !== 'mouse') return;
    this.hovered = card;
    this.kick();
  }

  /** La tele terminó de cerrarse. */
  protected stopped(): void {
    this.lent.set(-1);
    this.playing.set(null);
  }

  /** Abre la tele con el videoclip de la tarjeta i (que ya está en el centro). */
  private play(i: number): boolean {
    const card = this.layout().cards[i];
    const video = card && this.videos()[card.index];
    if (!video) return false;
    if (!this.playing()) {
      this.playing.set({
        entry: card.entry,
        media: { kind: 'youtube', video },
        card: i,
        origin: () => this.cardRect(i),
      });
      this.lent.set(i);
    }
    return true;
  }

  /** Rectángulo en pantalla de la tarjeta i: la unión de sus franjas. `null` si no se ve. */
  private cardRect(i: number): DOMRect | null {
    const card = this.cards[i];
    if (!card?.isConnected || card.style.visibility === 'hidden') return null;
    return unionRect(this.sliceNodes[i] ?? []);
  }

  /** Pide un frame si no hay uno ya en marcha. */
  private kick(): void {
    if (!this.frame) this.frame = requestAnimationFrame((now) => this.tick(now));
  }

  /**
   * Recoge los nodos y mide el alto de las tarjetas (u, en px). La primera vez centra la
   * primera tarjeta; si cambia el tamaño, escala el desplazamiento y vuelve a encajar.
   */
  private measure(): boolean {
    const stage = this.stage().nativeElement;
    if (!this.cards.length || !this.cards[0].isConnected) {
      this.cards = [...stage.querySelectorAll<HTMLElement>('.rib-card')];
      this.sliceNodes = this.cards.map((card) => [...card.querySelectorAll<HTMLElement>('.rib-slice')]);
      this.lifts = this.cards.map(() => 0);
      this.unit = 0;
    }
    if (this.unit) return true;

    const unit = this.sliceNodes[0]?.[0]?.offsetHeight ?? 0;
    if (!unit) return false;
    if (this.previousUnit) {
      this.offset *= unit / this.previousUnit;
    } else {
      this.offset = -this.layout().cards[0].start * unit;
    }
    this.lastOffset = this.offset;
    this.target = null;
    this.unit = this.previousUnit = unit;
    return true;
  }

  private tick(now: number): void {
    this.frame = 0;
    if (!this.measure()) return;
    const dt = this.last && now - this.last < 100 ? (now - this.last) / 1000 : 1 / 60;
    this.last = now;
    const layout = this.layout();
    const unit = this.unit;

    // 1. Movimiento: inercia, y luego encaje en la tarjeta más cercana al centro.
    if (!this.dragging && now > this.wheelUntil) {
      if (Math.abs(this.velocity) > SNAP_BELOW) {
        this.offset += this.velocity * dt;
        this.velocity *= Math.exp(-FRICTION * dt);
      } else {
        this.velocity = 0;
        this.target ??= this.offset - this.nearest(layout.cards, unit).x;
        const step = this.reducedMotion ? 1 : 1 - Math.exp(-SNAP_RESPONSE * dt);
        this.offset += (this.target - this.offset) * step;
        if (Math.abs(this.target - this.offset) < 0.3) this.offset = this.target;
      }
    }

    // 2. La onda crece con la velocidad (en u/s) y se desplaza un poco con ella.
    const speed = (this.offset - this.lastOffset) / dt / unit;
    this.lastOffset = this.offset;
    const wanted = this.reducedMotion
      ? REST_AMPLITUDE
      : REST_AMPLITUDE + Math.min(MAX_AMPLITUDE - REST_AMPLITUDE, Math.abs(speed) * AMPLITUDE_PER_SPEED);
    this.amplitude += (wanted - this.amplitude) * (1 - Math.exp(-AMPLITUDE_RESPONSE * dt));
    if (!this.reducedMotion) this.phase += speed * WAVE_DRIFT * dt;

    // 3. Coloca cada franja de cada tarjeta en la onda.
    const total = COPIES * layout.period * unit;
    const halfView = this.stage().nativeElement.clientWidth / 2;
    const k = (2 * Math.PI) / (WAVE_LENGTH * unit);
    // (z = amp·cos(k·x + fase): la del centro queda en una cresta, un poco hacia la cámara)
    const amp = this.amplitude * unit;
    let settled = !this.dragging && this.velocity === 0 && this.offset === this.target && now > this.wheelUntil;
    settled &&= Math.abs(this.amplitude - wanted) < 0.002;

    layout.cards.forEach((card, i) => {
      const x = wrap(card.start * unit + this.offset, total);
      const width = card.width * unit;
      const focus = clamp(1 - Math.abs(x) / (width * 0.8), 0, 1);
      this.cards[i].style.setProperty('--f', focus.toFixed(3));

      const lift = this.hovered === i && !this.dragging ? LIFT * unit : 0;
      this.lifts[i] += (lift - this.lifts[i]) * (this.reducedMotion ? 1 : 1 - Math.exp(-LIFT_RESPONSE * dt));
      if (Math.abs(lift - this.lifts[i]) > 0.3) settled = false;

      // Fuera de la vista: oculta (sus franjas no se recolocan y no deben tapar nada)
      const hidden = Math.abs(x) - width / 2 > halfView + width / 2;
      this.cards[i].style.visibility = hidden ? 'hidden' : 'visible';
      if (hidden) return;

      // Cada franja empieza donde acaba la anterior, siguiendo la curva: al doblarse, la
      // tarjeta se acorta un poco (como una tela) y no se abren rendijas entre franjas.
      const sliceWidth = width / SLICES;
      let left = x - width / 2;
      let z = amp * Math.cos(k * left + this.phase);
      this.sliceNodes[i].forEach((slice) => {
        const slope = -amp * k * Math.sin(k * (left + sliceWidth / 2) + this.phase);
        const tilt = Math.atan(slope);
        slice.style.transform =
          `translate3d(${left.toFixed(1)}px,0,${(z + this.lifts[i]).toFixed(1)}px) rotateY(${(-tilt).toFixed(4)}rad)`;
        left += sliceWidth * Math.cos(tilt);
        z += sliceWidth * Math.sin(tilt);
      });
    });

    // 4. La del centro: enlace activo y contador.
    const center = this.nearest(layout.cards, unit);
    if (center.i !== this.activeCard) {
      this.cards[this.activeCard]?.removeAttribute('data-active');
      this.cards[center.i]?.setAttribute('data-active', '');
      this.activeCard = center.i;
      this.active.set(layout.cards[center.i].index);
    }

    if (!settled) this.kick();
  }

  /** La tarjeta más cercana al centro y su posición (px desde el centro). */
  private nearest(cards: readonly RibbonCard[], unit: number): { i: number; x: number } {
    const total = COPIES * this.layout().period * unit;
    let best = { i: 0, x: Infinity };
    cards.forEach((card, i) => {
      const x = wrap(card.start * unit + this.offset, total);
      if (Math.abs(x) < Math.abs(best.x)) best = { i, x };
    });
    return best;
  }

  /** Lleva al centro la tarjeta i (clic en una lateral, o foco con el teclado). */
  private center(i: number): void {
    if (!this.measure()) return;
    const card = this.layout().cards[i];
    const total = COPIES * this.layout().period * this.unit;
    this.velocity = 0;
    this.target = this.offset - wrap(card.start * this.unit + this.offset, total);
    this.kick();
  }

  /** Arrastre, deslizamiento, rueda horizontal, clics y foco. Devuelve cómo desmontarlo. */
  private listen(stage: HTMLElement): () => void {
    let pointer: number | null = null;
    let startX = 0;
    let lastX = 0;
    let lastTime = 0;
    let suppressClick = false;

    const indexOf = (target: EventTarget | null) =>
      this.cards.indexOf((target as Element | null)?.closest<HTMLElement>('.rib-card') as HTMLElement);

    const down = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      pointer = event.pointerId;
      startX = lastX = event.clientX;
      lastTime = event.timeStamp;
      suppressClick = false;
    };

    const move = (event: PointerEvent) => {
      if (event.pointerId !== pointer) return;
      // Hasta superar el umbral es un clic: sin capturar el puntero, el enlace funciona.
      if (!this.dragging) {
        if (Math.abs(event.clientX - startX) < DRAG_THRESHOLD) return;
        this.dragging = true;
        suppressClick = true;
        this.velocity = 0;
        this.target = null;
        stage.setPointerCapture?.(event.pointerId);
        stage.dataset['dragging'] = '';
      }
      const dx = event.clientX - lastX;
      const elapsed = (event.timeStamp - lastTime) / 1000;
      if (elapsed > 0) this.velocity = this.velocity * 0.5 + (dx / elapsed) * 0.5;
      lastX = event.clientX;
      lastTime = event.timeStamp;
      this.offset += dx;
      this.kick();
    };

    const up = (event: PointerEvent) => {
      if (event.pointerId !== pointer) return;
      pointer = null;
      if (!this.dragging) return;
      this.dragging = false;
      delete stage.dataset['dragging'];
      const idle = event.timeStamp - lastTime > 100;
      if (idle || this.reducedMotion) this.velocity = 0;
      this.target = null;
      this.kick();
    };

    // Rueda o trackpad en horizontal (o con mayúsculas): mueve la cinta. En vertical, la página.
    const wheel = (event: WheelEvent) => {
      const dx = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.shiftKey ? event.deltaY : 0;
      if (!dx) return;
      event.preventDefault();
      this.offset -= dx * (event.deltaMode === 1 ? 16 : 1);
      this.velocity = 0;
      this.target = null;
      this.wheelUntil = performance.now() + WHEEL_IDLE;
      this.kick();
    };

    // Clic: tras un arrastre, nada; en una tarjeta lateral, centrarla; en la del centro, la
    // tele. Con una tecla modificadora, el enlace hace lo suyo (YouTube en otra pestaña).
    const click = (event: MouseEvent) => {
      if (suppressClick) {
        suppressClick = false;
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      const i = indexOf(event.target);
      if (i < 0) return;
      if (i !== this.activeCard) {
        event.preventDefault();
        this.center(i);
        return;
      }
      const modified = event.ctrlKey || event.metaKey || event.shiftKey || event.altKey;
      if (!modified && this.play(i)) event.preventDefault();
    };

    const focus = (event: FocusEvent) => {
      const i = indexOf(event.target);
      if (i >= 0 && i !== this.activeCard) this.center(i);
    };

    stage.addEventListener('pointerdown', down);
    stage.addEventListener('pointermove', move);
    stage.addEventListener('pointerup', up);
    stage.addEventListener('pointercancel', up);
    stage.addEventListener('wheel', wheel, { passive: false });
    stage.addEventListener('click', click, true);
    stage.addEventListener('focusin', focus);
    return () => {
      stage.removeEventListener('pointerdown', down);
      stage.removeEventListener('pointermove', move);
      stage.removeEventListener('pointerup', up);
      stage.removeEventListener('pointercancel', up);
      stage.removeEventListener('wheel', wheel);
      stage.removeEventListener('click', click, true);
      stage.removeEventListener('focusin', focus);
    };
  }
}
