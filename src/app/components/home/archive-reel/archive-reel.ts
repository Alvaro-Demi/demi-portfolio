import { NgOptimizedImage } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { Photo } from '../../../models/photo';
import { Reveal } from '../../../shared/reveal';

/** Cada cuánto avanza una tarjeta y cuánto dura el desplazamiento, en ms. */
const STEP = 1500;
const MOVE = 750;

/**
 * Posiciones en la diagonal, relativas a la tarjeta enfocada (0):
 *   2 → entra (oculta, arriba a la derecha) · 1 → la siguiente, asomando
 *   0 → enfocada, en el centro · -1…-4 → el montón, abajo a la izquierda
 *   -5 → sale (se desvanece) · 'rest' → en espera, oculta donde entran
 * La geometría de cada posición vive en el CSS.
 */
const ENTRY = 2;
const EXIT = -5;

/**
 * Archivo: animación isométrica hecha con las propias fotos de la web. Las tarjetas pasan
 * en diagonal, de arriba a la derecha hacia un montón abajo a la izquierda, como si vinieran
 * hacia la cámara.
 *
 * Avanza sola mientras se ve y sin pausa manual. Con movimiento reducido queda quieta.
 * Las fotos se montan cuando la sección se acerca (a una pantalla de distancia).
 */
@Component({
  selector: 'app-archive-reel',
  imports: [NgOptimizedImage, Reveal],
  templateUrl: './archive-reel.html',
  styleUrl: './archive-reel.css',
  host: {
    '[style.--reel-move.ms]': 'move',
  },
})
export class ArchiveReel {
  readonly cards = input.required<readonly Photo[]>();
  /** Número del capítulo en la Home, p. ej. '05'. */
  readonly chapter = input.required<string>();

  protected readonly move = MOVE;

  /** Índice de la tarjeta enfocada. */
  protected readonly active = signal(0);
  /** Cambia en cada paso: reinicia el desenfoque de movimiento del CSS. */
  protected readonly phase = signal(false);

  protected readonly near = signal(false);
  private readonly inView = signal(false);
  protected readonly userPaused = signal(false);
  protected readonly reducedMotion = signal(false);

  protected readonly playing = computed(
    () => this.inView() && !this.userPaused() && !this.reducedMotion() && this.cards().length > 1,
  );

  protected readonly count = computed(() => this.cards().length);
  protected readonly label = (i: number) => String(i + 1).padStart(2, '0');

  /** Posición de cada tarjeta. Mantienen su orden en el DOM: el apilado lo decide el CSS. */
  protected readonly slots = computed(() => {
    const count = this.count();
    const active = this.active();
    return this.cards().map((photo, i) => {
      const distance = (i - active + count) % count;
      const slot = distance <= ENTRY ? distance : distance - count;
      return { photo, i, slot: slot < EXIT ? 'rest' : String(slot) };
    });
  });

  private readonly track = viewChild.required<ElementRef<HTMLElement>>('track');

  constructor() {
    const destroyRef = inject(DestroyRef);

    // Un paso cada STEP ms mientras se reproduce. `playing` nunca es true en el servidor.
    effect((onCleanup) => {
      if (!this.playing()) return;
      this.active(); // tras cada paso, se programa el siguiente
      const timer = setTimeout(() => this.advance(), STEP);
      onCleanup(() => clearTimeout(timer));
    });

    afterNextRender(() => {
      const track = this.track().nativeElement;

      const motion = matchMedia('(prefers-reduced-motion: reduce)');
      const onMotion = () => this.reducedMotion.set(motion.matches);
      onMotion();
      motion.addEventListener('change', onMotion);

      const visibility = new IntersectionObserver(([entry]) => this.inView.set(!!entry?.isIntersecting), {
        threshold: 0.25,
      });
      visibility.observe(track);

      const proximity = new IntersectionObserver(
        ([entry]) => {
          if (!entry?.isIntersecting) return;
          this.near.set(true);
          proximity.disconnect();
        },
        { rootMargin: '100% 0px' },
      );
      proximity.observe(track);

      destroyRef.onDestroy(() => {
        motion.removeEventListener('change', onMotion);
        visibility.disconnect();
        proximity.disconnect();
      });
    });
  }

  protected advance(): void {
    this.active.update((i) => (i + 1) % this.count());
    this.phase.update((p) => !p);
  }

  protected toggle(): void {
    this.userPaused.update((paused) => !paused);
  }
}
