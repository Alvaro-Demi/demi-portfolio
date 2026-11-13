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

/** Velocidad de crucero, en alturas de foto por segundo. */
const SPEED = 1.1;
/** Con el ratón encima, la tira casi se detiene (fracción de la velocidad). */
const HOVER_SPEED = 0.18;
/** Scroll → velocidad: px/s de scroll que suman una velocidad de crucero más, y el tope. */
const SCROLL_PER_SPEED = 450;
const MAX_SCROLL_BOOST = 5;
/** Lo que tarda la velocidad en alcanzar su objetivo (más alto, más rápido). */
const RESPONSE = 3.5;
/** Tras soltar un arrastre, la tira sigue con la inercia del gesto y frena más despacio. */
const GLIDE_RESPONSE = 1.2;
/** Tope de la inercia al lanzar la tira (en velocidades de crucero). */
const MAX_THROW = 25;
/** Si el dedo o el ratón se quedan quietos más que esto antes de soltar, no hay inercia (ms). */
const THROW_IDLE = 100;
/** Botones anterior/siguiente: lo rápido que llega a la foto de al lado. */
const NUDGE_RESPONSE = 6;
/** Inclinación máxima (grados) al entrar y al salir de la pantalla. */
const MAX_TILT = 9;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const RAD_TO_DEG = 180 / Math.PI;

/**
 * Detrás de las cámaras: las fotos de rodaje en una tira curvada que gira sin parar, como un
 * anillo visto desde fuera.
 *
 *   - Arrastrar (ratón) o deslizar (dedo): la tira sigue el gesto y, al soltar, conserva su
 *     inercia y vuelve poco a poco a su ritmo. Los botones ← → la mueven una foto.
 *   - Hover: la tira frena; la foto señalada se adelanta y las demás se apagan.
 *   - Scroll: hacer scroll acelera la tira en ese sentido, y la tira se inclina según la
 *     sección entra o sale de la pantalla.
 *   - Pausa: la tira frena hasta pararse. Movimiento reducido: quieta y sin inclinación
 *     (arrastrar y los botones siguen funcionando).
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

  /** Estado del movimiento: se conserva entre arranques para no saltar al volver. */
  private spin = 0;
  /** Velocidad actual, en velocidades de crucero (positiva: hacia la izquierda). */
  private speed = 1;
  private response = RESPONSE;
  /** Grados pendientes de recorrer por los botones ← →. */
  private nudge = 0;
  private dragging = false;

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
        if (motion.matches) stage.style.removeProperty('--tilt');
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

      const stopDragging = this.listenToDrag(stage);
      this.ready.set(true);

      destroyRef.onDestroy(() => {
        motion.removeEventListener('change', onMotion);
        visibility.disconnect();
        proximity.disconnect();
        stopDragging();
      });
    });
  }

  /** Mueve la tira una foto (de media) hacia atrás (-1) o hacia delante (1). */
  protected step(direction: -1 | 1): void {
    this.nudge -= (direction * this.layout().period) / Math.max(1, this.frames().length);
    // Sin bucle (movimiento reducido), el salto es inmediato.
    if (!this.running()) {
      this.spin += this.nudge;
      this.nudge = 0;
      this.applySpin();
    }
  }

  protected toggle(): void {
    this.userPaused.update((paused) => !paused);
  }

  /** Solo con ratón: en táctil, el «hover» llega al tocar y frenaría la tira sin motivo. */
  protected hover(event: PointerEvent, over: boolean): void {
    if (event.pointerType === 'mouse') this.hovering = over;
  }

  /** Grados por segundo a velocidad de crucero. */
  private cruise(): number {
    return (SPEED / this.layout().radius) * RAD_TO_DEG;
  }

  /** Escribe el giro, siempre dentro de una vuelta de la secuencia. */
  private applySpin(): void {
    const { period } = this.layout();
    this.spin = ((this.spin % period) - period) % period;
    this.ring().nativeElement.style.setProperty('--spin', `${this.spin.toFixed(3)}deg`);
  }

  /** Arrastrar con el ratón y deslizar con el dedo. Devuelve la función que lo desmonta. */
  private listenToDrag(stage: HTMLElement): () => void {
    let pointer: number | null = null;
    let lastX = 0;
    let lastTime = 0;
    let velocity = 0; // grados por segundo
    let unit = 100; // px por u: el alto de una foto

    const down = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      unit = stage.querySelector<HTMLElement>('.film-frame')?.offsetHeight || 100;
      pointer = event.pointerId;
      lastX = event.clientX;
      lastTime = event.timeStamp;
      velocity = 0;
      this.dragging = true;
      this.nudge = 0;
      stage.setPointerCapture?.(event.pointerId);
      stage.dataset['dragging'] = '';
    };

    const move = (event: PointerEvent) => {
      if (!this.dragging || event.pointerId !== pointer) return;
      // Arrastrar a la derecha lleva las fotos a la derecha: el giro sube.
      const degrees = ((event.clientX - lastX) / (this.layout().radius * unit)) * RAD_TO_DEG;
      const elapsed = (event.timeStamp - lastTime) / 1000;
      if (elapsed > 0) velocity = velocity * 0.5 + (degrees / elapsed) * 0.5;
      lastX = event.clientX;
      lastTime = event.timeStamp;
      this.spin += degrees;
      this.applySpin();
    };

    const up = (event: PointerEvent) => {
      if (!this.dragging || event.pointerId !== pointer) return;
      this.dragging = false;
      pointer = null;
      delete stage.dataset['dragging'];
      // Lanzamiento: la velocidad del gesto pasa a la tira y se va frenando sola.
      const idle = event.timeStamp - lastTime > THROW_IDLE;
      this.speed = idle ? 0 : clamp(-velocity / this.cruise(), -MAX_THROW, MAX_THROW);
      this.response = GLIDE_RESPONSE;
    };

    stage.addEventListener('pointerdown', down);
    stage.addEventListener('pointermove', move);
    stage.addEventListener('pointerup', up);
    stage.addEventListener('pointercancel', up);
    stage.addEventListener('lostpointercapture', up);
    return () => {
      stage.removeEventListener('pointerdown', down);
      stage.removeEventListener('pointermove', move);
      stage.removeEventListener('pointerup', up);
      stage.removeEventListener('pointercancel', up);
      stage.removeEventListener('lostpointercapture', up);
    };
  }

  /** Arranca el bucle de animación; devuelve el id del frame pendiente para cancelarlo. */
  private loop(): () => number {
    const stage = this.stage().nativeElement;
    let last = 0;
    let lastScroll = scrollY;
    let pending = 0;

    const tick = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
      last = now;

      const scrollSpeed = dt ? (scrollY - lastScroll) / dt : 0;
      lastScroll = scrollY;

      // Mientras se arrastra, manda el gesto: la tira no avanza sola.
      if (!this.dragging) {
        const paused = this.userPaused();
        const cruise = paused ? 0 : this.hovering ? HOVER_SPEED : 1;
        const boost = paused ? 0 : clamp(scrollSpeed / SCROLL_PER_SPEED, -MAX_SCROLL_BOOST, MAX_SCROLL_BOOST);
        const target = cruise + boost;
        this.speed += (target - this.speed) * (1 - Math.exp(-dt * this.response));
        if (Math.abs(target - this.speed) < 0.05) this.response = RESPONSE;
        this.spin -= this.speed * this.cruise() * dt;

        const nudged = this.nudge * (1 - Math.exp(-dt * NUDGE_RESPONSE));
        this.spin += nudged;
        this.nudge -= nudged;
        this.applySpin();
      }

      // Inclinación: +MAX al asomar por abajo, 0 en el centro, -MAX al salir por arriba.
      const rect = stage.getBoundingClientRect();
      const progress = clamp((innerHeight - rect.top) / (innerHeight + rect.height), 0, 1);
      stage.style.setProperty('--tilt', `${((0.5 - progress) * 2 * MAX_TILT).toFixed(2)}deg`);

      pending = requestAnimationFrame(tick);
    };
    pending = requestAnimationFrame(tick);
    return () => pending;
  }
}
