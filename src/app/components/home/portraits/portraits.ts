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
import { Portrait } from '../../../models/photo';
import { Reveal } from '../../../shared/reveal';

/** Tiempo que se ve cada retrato en grande y duración del cambio, en ms. Llegan al CSS. */
const HOLD = 2600;
const MOVE = 700;

/**
 * 03 — Retrato: una foto grande y el resto en una columna de miniaturas. Cada pocos segundos
 * la primera miniatura crece hasta el hueco grande (y llega desenfocada, como al pasar el
 * foco), la grande baja al final de la columna y las demás suben un puesto.
 *
 * El ritmo lo marca la animación CSS de la línea de progreso: al terminar (`animationend`)
 * pasa al siguiente. Pausar es congelar esa animación. Solo corre con la sección a la vista,
 * sin el ratón encima, sin pausa manual y sin movimiento reducido.
 *   - Hover en la grande: se para y aparece el visor de la cámara.
 *   - Hover en una miniatura: se ilumina; al pulsarla pasa a la grande.
 */
@Component({
  selector: 'app-portraits',
  imports: [NgOptimizedImage, Reveal],
  templateUrl: './portraits.html',
  styleUrl: './portraits.css',
  host: {
    '[style.--portraits-hold.ms]': 'hold',
    '[style.--portraits-move.ms]': 'move',
  },
})
export class Portraits {
  readonly entries = input.required<readonly Portrait[]>();

  protected readonly hold = HOLD;
  protected readonly move = MOVE;

  /** Índice del retrato en grande. */
  protected readonly active = signal(0);
  protected readonly count = computed(() => this.entries().length);
  protected readonly label = (i: number) => String(i + 1).padStart(2, '0');

  /**
   * Hueco de cada retrato: 0 es el grande; 1, 2, 3… las miniaturas de arriba abajo.
   * Mantienen su orden en el DOM (moverlos cortaría la transición); el CSS los coloca.
   */
  protected readonly cards = computed(() => {
    const count = this.count();
    const active = this.active();
    return this.entries().map((portrait, i) => ({ portrait, i, slot: (i - active + count) % count }));
  });

  protected readonly current = computed(() => this.entries()[this.active()]);
  protected readonly meta = computed(() => {
    const { context, year } = this.current();
    return [context, year].filter((part) => part !== null).join(' · ');
  });

  protected readonly userPaused = signal(false);
  private readonly hovering = signal(false);
  private readonly inView = signal(false);
  protected readonly reducedMotion = signal(false);

  /** Texto para lectores de pantalla, solo cuando el usuario cambia de retrato a mano. */
  protected readonly announcement = signal('');

  protected readonly playing = computed(
    () =>
      this.inView() && !this.userPaused() && !this.hovering() && !this.reducedMotion() && this.count() > 1,
  );

  private readonly stage = viewChild.required<ElementRef<HTMLElement>>('stage');

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const motion = matchMedia('(prefers-reduced-motion: reduce)');
      const onMotion = () => this.reducedMotion.set(motion.matches);
      onMotion();
      motion.addEventListener('change', onMotion);

      const visibility = new IntersectionObserver(([entry]) => this.inView.set(!!entry?.isIntersecting), {
        threshold: 0.5,
      });
      visibility.observe(this.stage().nativeElement);

      destroyRef.onDestroy(() => {
        motion.removeEventListener('change', onMotion);
        visibility.disconnect();
      });
    });
  }

  protected advance(): void {
    const count = this.count();
    if (count > 1) this.active.update((i) => (i + 1) % count);
  }

  /** Pasa un retrato concreto a la grande (al pulsar su miniatura). */
  protected go(index: number): void {
    if (index === this.active()) return;
    this.active.set(index);
    this.announcement.set(`Retrato ${index + 1} de ${this.count()}: ${this.entries()[index].photo.alt}`);
  }

  protected toggle(): void {
    this.userPaused.update((paused) => !paused);
  }

  /** Solo con ratón: mirar un retrato lo detiene; en táctil, el «hover» llega al tocar. */
  protected hover(event: PointerEvent, over: boolean): void {
    if (event.pointerType === 'mouse') this.hovering.set(over);
  }
}
