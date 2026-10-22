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
import { SequenceFrame } from '../../../models/photo';
import { Reveal } from '../../../shared/reveal';

/** Tiempo que se ve cada foto y duración del wipe, en ms. Llegan al CSS como variables. */
const HOLD = 5000;
const TRANSITION = 1200;

/** Diferencia de proporción (foto / marco) a partir de la cual la foto se muestra entera. */
const CONTAIN_RATIO = 1.35;

type SlideState = 'active' | 'leaving' | 'next';

/**
 * Interludio: secuencia «detrás de las cámaras». Las fotos se suceden con un wipe de cine
 * dentro de un marco estable (sin saltos de layout).
 *
 * El ritmo lo marca la animación CSS de la barra de progreso de la foto activa: al terminar
 * (`animationend`) pasa a la siguiente. Pausar es congelar esa animación, así que no hay
 * temporizadores que sincronizar. Solo corre con la sección a la vista, sin el ratón encima,
 * sin pausa manual y sin movimiento reducido. Solo hay tres fotos montadas a la vez: la
 * activa, la que sale y la siguiente (que así se precarga).
 */
@Component({
  selector: 'app-interlude',
  imports: [NgOptimizedImage, Reveal],
  templateUrl: './interlude.html',
  styleUrl: './interlude.css',
  host: {
    '[style.--sequence-hold.ms]': 'hold',
    '[style.--sequence-transition.ms]': 'transition',
  },
})
export class Interlude {
  readonly frames = input.required<readonly SequenceFrame[]>();

  protected readonly hold = HOLD;
  protected readonly transition = TRANSITION;

  protected readonly index = signal(0);
  private readonly upcoming = signal(1);
  private readonly leaving = signal<number | null>(null);

  protected readonly userPaused = signal(false);
  private readonly hovering = signal(false);
  private readonly inView = signal(false);
  /** La sección está a menos de una pantalla: a partir de ahí se montan (y cargan) las fotos. */
  private readonly near = signal(false);
  protected readonly reducedMotion = signal(false);
  /** Proporción ancho/alto del marco, para decidir cómo encaja cada foto. */
  private readonly frameRatio = signal(16 / 9);

  /** Texto para lectores de pantalla, solo cuando el usuario cambia de foto a mano. */
  protected readonly announcement = signal('');

  protected readonly playing = computed(
    () => this.inView() && !this.userPaused() && !this.hovering() && !this.reducedMotion(),
  );

  protected readonly count = computed(() => this.frames().length);
  protected readonly label = (i: number) => String(i + 1).padStart(2, '0');

  /**
   * Fotos montadas, con su estado y su encaje. El resto no está en el DOM.
   * Van en el orden de la lista: así Angular nunca mueve un nodo (moverlo cortaría su wipe);
   * el apilado lo decide el CSS según el estado.
   */
  protected readonly slides = computed(() => {
    const frames = this.frames();
    if (!this.near()) return [];
    const states = new Map<number, SlideState>();
    if (frames.length > 1) states.set(this.upcoming(), 'next');
    const leaving = this.leaving();
    if (leaving !== null) states.set(leaving, 'leaving');
    states.set(this.index(), 'active');

    return [...states].map(([i, state]) => {
      const frame = frames[i];
      const mismatch = Math.abs(Math.log(frame.width / frame.height / this.frameRatio()));
      const fit = frame.fit ?? (mismatch < Math.log(CONTAIN_RATIO) ? 'cover' : 'contain');
      return { frame, i, state, fit };
    }).sort((a, b) => a.i - b.i);
  });

  private readonly stage = viewChild.required<ElementRef<HTMLElement>>('stage');
  private cleanup = 0;

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const stage = this.stage().nativeElement;

      const motion = matchMedia('(prefers-reduced-motion: reduce)');
      const onMotion = () => {
        this.reducedMotion.set(motion.matches);
        // Con movimiento reducido no hay avance automático: arranca en pausa.
        if (motion.matches) this.userPaused.set(true);
      };
      onMotion();
      motion.addEventListener('change', onMotion);

      const visibility = new IntersectionObserver(([entry]) => this.inView.set(!!entry?.isIntersecting), {
        threshold: 0.5,
      });
      visibility.observe(stage);

      // Las fotos montadas se cargan sin diferir (la siguiente está oculta por clip-path y el
      // lazy loading no la pediría): por eso no se montan hasta que la sección se acerca.
      const proximity = new IntersectionObserver(
        ([entry]) => {
          if (!entry?.isIntersecting) return;
          this.near.set(true);
          proximity.disconnect();
        },
        { rootMargin: '100% 0px' },
      );
      proximity.observe(stage);

      const size = new ResizeObserver(([entry]) => {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) this.frameRatio.set(width / height);
      });
      size.observe(stage);

      destroyRef.onDestroy(() => {
        motion.removeEventListener('change', onMotion);
        visibility.disconnect();
        proximity.disconnect();
        size.disconnect();
        clearTimeout(this.cleanup);
      });
    });
  }

  /** Pasa a la foto preparada como siguiente, con el wipe. */
  protected advance(): void {
    const count = this.count();
    if (count < 2) return;
    const to = this.upcoming();
    this.leaving.set(this.index());
    this.index.set(to);
    this.upcoming.set((to + 1) % count);
    clearTimeout(this.cleanup);
    this.cleanup = window.setTimeout(() => this.leaving.set(null), TRANSITION + 100);
  }

  /** Salto a una foto concreta: se monta primero como siguiente para que el wipe se vea. */
  protected go(target: number): void {
    if (target === this.index()) return;
    const frames = this.frames();
    this.announcement.set(`Foto ${target + 1} de ${frames.length}: ${frames[target].alt}`);
    if (target === this.upcoming()) {
      this.advance();
      return;
    }
    this.upcoming.set(target);
    requestAnimationFrame(() => requestAnimationFrame(() => this.advance()));
  }

  protected toggle(): void {
    this.userPaused.update((paused) => !paused);
  }

  /** Solo con ratón: mirar una foto la detiene; en táctil, el "hover" llega al tocar. */
  protected hover(event: PointerEvent, over: boolean): void {
    if (event.pointerType === 'mouse') this.hovering.set(over);
  }
}
