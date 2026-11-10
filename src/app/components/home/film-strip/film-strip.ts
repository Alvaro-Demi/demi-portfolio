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
import { SequenceFrame } from '../../../models/photo';
import { layoutStrip } from './film-layout';

/** Velocidad de crucero, en alturas de película por segundo. */
const SPEED = 0.75;
/** Con el ratón encima, la tira casi se detiene (fracción de la velocidad). */
const HOVER_SPEED = 0.18;
/** Scroll → velocidad: px/s de scroll que suman una velocidad de crucero más, y el tope. */
const SCROLL_PER_SPEED = 450;
const MAX_SCROLL_BOOST = 5;
/** Lo que tarda la velocidad en alcanzar su objetivo (más alto, más rápido). */
const RESPONSE = 3.5;
/** Inclinación máxima (grados) al entrar y al salir de la pantalla. */
const MAX_TILT = 9;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Detrás de las cámaras: las fotos de rodaje montadas en una tira de película curvada que
 * gira sin parar, como un anillo visto desde fuera.
 *
 *   - Hover: la tira frena; la foto señalada se adelanta y las demás se apagan.
 *   - Scroll: hacer scroll acelera la tira en ese sentido, y la tira se inclina según la
 *     sección entra o sale de la pantalla.
 *   - Pausa: la tira frena hasta pararse. Movimiento reducido: quieta y sin inclinación.
 *
 * El giro lo lleva un bucle de requestAnimationFrame que escribe dos variables CSS (--spin y
 * --tilt) directamente en el DOM: no pasa por Angular. Solo corre con la sección a la vista.
 */
@Component({
  selector: 'app-film-strip',
  imports: [NgOptimizedImage],
  templateUrl: './film-strip.html',
  styleUrl: './film-strip.css',
})
export class FilmStrip {
  readonly frames = input.required<readonly SequenceFrame[]>();

  protected readonly layout = computed(() => layoutStrip(this.frames()));
  protected readonly label = (i: number) => String(i + 1).padStart(2, '0');

  /** La sección está a menos de una pantalla: a partir de ahí se montan (y cargan) las fotos. */
  protected readonly near = signal(false);
  private readonly inView = signal(false);
  private readonly ready = signal(false);
  protected readonly userPaused = signal(false);
  protected readonly reducedMotion = signal(false);
  private hovering = false;

  private readonly running = computed(() => this.ready() && this.inView() && !this.reducedMotion());

  private readonly stage = viewChild.required<ElementRef<HTMLElement>>('stage');
  private readonly ring = viewChild.required<ElementRef<HTMLElement>>('ring');

  /** Estado del bucle: se conserva entre arranques para no saltar al volver a la sección. */
  private spin = 0;
  private speed = 1;

  constructor() {
    const destroyRef = inject(DestroyRef);

    effect((onCleanup) => {
      if (!this.running()) return;
      const frame = this.loop();
      onCleanup(() => cancelAnimationFrame(frame()));
    });

    afterNextRender(() => {
      const stage = this.stage().nativeElement;

      const motion = matchMedia('(prefers-reduced-motion: reduce)');
      const onMotion = () => {
        this.reducedMotion.set(motion.matches);
        if (motion.matches) {
          this.ring().nativeElement.style.removeProperty('--spin');
          stage.style.removeProperty('--tilt');
        }
      };
      onMotion();
      motion.addEventListener('change', onMotion);

      const visibility = new IntersectionObserver(([entry]) => this.inView.set(!!entry?.isIntersecting));
      visibility.observe(stage);

      const proximity = new IntersectionObserver(
        ([entry]) => {
          if (!entry?.isIntersecting) return;
          this.near.set(true);
          proximity.disconnect();
        },
        { rootMargin: '100% 0px' },
      );
      proximity.observe(stage);

      this.ready.set(true);

      destroyRef.onDestroy(() => {
        motion.removeEventListener('change', onMotion);
        visibility.disconnect();
        proximity.disconnect();
      });
    });
  }

  /** Arranca el bucle de animación; devuelve el id del frame pendiente para cancelarlo. */
  private loop(): () => number {
    const stage = this.stage().nativeElement;
    const ring = this.ring().nativeElement;
    let last = 0;
    let lastScroll = scrollY;
    let pending = 0;

    const tick = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
      last = now;

      const { radius, period } = this.layout();
      const scrollSpeed = dt ? (scrollY - lastScroll) / dt : 0;
      lastScroll = scrollY;

      const paused = this.userPaused();
      const cruise = paused ? 0 : this.hovering ? HOVER_SPEED : 1;
      const boost = paused ? 0 : clamp(scrollSpeed / SCROLL_PER_SPEED, -MAX_SCROLL_BOOST, MAX_SCROLL_BOOST);
      this.speed += (cruise + boost - this.speed) * (1 - Math.exp(-dt * RESPONSE));

      // Hacia la izquierda: el ángulo baja. Se mantiene dentro de una vuelta de la secuencia.
      this.spin -= ((this.speed * SPEED) / radius) * (180 / Math.PI) * dt;
      this.spin = ((this.spin % period) - period) % period;
      ring.style.setProperty('--spin', `${this.spin.toFixed(3)}deg`);

      // Inclinación: +MAX al asomar por abajo, 0 en el centro, -MAX al salir por arriba.
      const rect = stage.getBoundingClientRect();
      const progress = clamp((innerHeight - rect.top) / (innerHeight + rect.height), 0, 1);
      stage.style.setProperty('--tilt', `${((0.5 - progress) * 2 * MAX_TILT).toFixed(2)}deg`);

      pending = requestAnimationFrame(tick);
    };
    pending = requestAnimationFrame(tick);
    return () => pending;
  }

  protected toggle(): void {
    this.userPaused.update((paused) => !paused);
  }

  /** Solo con ratón: en táctil, el «hover» llega al tocar y frenaría la tira sin motivo. */
  protected hover(event: PointerEvent, over: boolean): void {
    if (event.pointerType === 'mouse') this.hovering = over;
  }
}
