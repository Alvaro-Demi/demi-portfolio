import { afterNextRender, DestroyRef, Directive, ElementRef, inject, input } from '@angular/core';

/** Móvil y tablet: tira con línea de progreso propia. En escritorio manda appScrollTrack. */
const LAYOUT_MEDIA = '(max-width: 63.99rem)';
/** El paneo automático, además, solo sin movimiento reducido. */
const MOTION_MEDIA = `${LAYOUT_MEDIA} and (prefers-reduced-motion: no-preference)`;

/**
 * Muelle crítico (sin rebote) de 0,5 s, el equivalente a `{ type: 'spring', duration: 0.5, bounce: 0 }`:
 * ω = 2π / 0,5 s → rigidez ω², amortiguación 2ω (masa 1).
 */
const OMEGA = (2 * Math.PI) / 0.5;
const STIFFNESS = OMEGA * OMEGA;
const DAMPING = 2 * OMEGA;

/** Tiempo sin contacto ni scroll tras el que el usuario devuelve el control al paneo, en ms. */
const RELEASE_DELAY = 180;

/**
 * Paneo de cámara: mientras la tira cruza la pantalla, el scroll vertical de la página la
 * recorre en horizontal de principio a fin. No va pegada al scroll: la sigue un muelle,
 * así que flota y se asienta con inercia.
 *
 * Mueve el scroll nativo del contenedor (no un transform), de modo que el dedo, la rueda o
 * el teclado pueden tomar el control en cualquier momento. Al soltar, el paneo continúa
 * desde donde se dejó, sin saltos. `glideProgress` es la línea que marca la posición; se
 * actualiza también con movimiento reducido (ahí la tira no se mueve sola, solo con el dedo).
 */
@Directive({ selector: '[appGlide]' })
export class Glide {
  /** Línea de progreso (opcional): se escala en horizontal de 0 a 1. */
  readonly glideProgress = input<HTMLElement>();

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const layout = matchMedia(LAYOUT_MEDIA);
      const motion = matchMedia(MOTION_MEDIA);
      const root = getComputedStyle(document.documentElement);
      const headerHeight = parseFloat(root.getPropertyValue('--header-height')) * parseFloat(root.fontSize);

      let visible = false;
      let frame = 0;
      let last = 0;
      let position = host.scrollLeft;
      let velocity = 0;
      // Desplazamiento que añadió el usuario: el paneo lo conserva al retomarse.
      let offset = 0;
      // El usuario controla la tira (dedo, rueda, teclado) y si el dedo sigue apoyado.
      let user = false;
      let touching = false;
      let releaseTimer = 0;

      const maxScroll = () => host.scrollWidth - host.clientWidth;

      /** Posición que pide el scroll vertical: 0 al asomar por abajo, el final al irse bajo el header. */
      const panTarget = () => {
        const rect = host.getBoundingClientRect();
        const range = innerHeight - headerHeight + rect.height;
        const progress = Math.min(Math.max((innerHeight - rect.top) / range, 0), 1);
        return progress * maxScroll();
      };

      const paintProgress = () => {
        const line = this.glideProgress();
        if (!line) return;
        if (!layout.matches) {
          line.style.removeProperty('transform');
          return;
        }
        const max = maxScroll();
        line.style.transform = `scaleX(${(max > 0 ? host.scrollLeft / max : 0).toFixed(4)})`;
      };

      const step = (time: number) => {
        const dt = last ? Math.min((time - last) / 1000, 1 / 30) : 1 / 60;
        last = time;
        const target = Math.min(Math.max(panTarget() + offset, 0), maxScroll());

        velocity += (STIFFNESS * (target - position) - DAMPING * velocity) * dt;
        position += velocity * dt;

        const settled = Math.abs(target - position) < 0.5 && Math.abs(velocity) < 5;
        if (settled) {
          position = target;
          velocity = 0;
        }
        host.scrollLeft = position;
        frame = settled ? 0 : requestAnimationFrame(step);
      };

      const kick = () => {
        if (frame === 0 && visible && !user && motion.matches && maxScroll() > 0) {
          last = 0;
          frame = requestAnimationFrame(step);
        }
      };

      const takeOver = () => {
        user = true;
        cancelAnimationFrame(frame);
        frame = 0;
        velocity = 0;
        clearTimeout(releaseTimer);
      };

      // Devuelve el control cuando nada se ha movido durante RELEASE_DELAY: incluye la inercia nativa.
      const scheduleRelease = () => {
        clearTimeout(releaseTimer);
        releaseTimer = window.setTimeout(() => {
          if (touching) return;
          user = false;
          position = host.scrollLeft;
          offset = position - panTarget();
          kick();
        }, RELEASE_DELAY);
      };

      const listeners: [EventTarget, string, () => void][] = [
        // Táctil: touchstart/touchend, porque al empezar el arrastre el navegador cancela el pointer.
        [host, 'touchstart', () => ((touching = true), takeOver())],
        [host, 'touchend', () => ((touching = false), scheduleRelease())],
        [host, 'touchcancel', () => ((touching = false), scheduleRelease())],
        [host, 'mousedown', () => ((touching = true), takeOver())],
        [window, 'mouseup', () => touching && ((touching = false), scheduleRelease())],
        [host, 'wheel', () => (takeOver(), scheduleRelease())],
        [host, 'keydown', () => (takeOver(), scheduleRelease())],
        [host, 'scroll', () => (paintProgress(), user && !touching && scheduleRelease())],
        [window, 'scroll', kick],
      ];
      for (const [target, type, handler] of listeners) {
        target.addEventListener(type, handler, { passive: true });
      }

      const observer = new IntersectionObserver(([entry]) => {
        visible = !!entry?.isIntersecting;
        if (visible) {
          position = host.scrollLeft;
          kick();
        }
      });
      observer.observe(host);

      const onLayoutChange = () => paintProgress();
      const onMotionChange = () => (motion.matches ? kick() : (cancelAnimationFrame(frame), (frame = 0)));
      layout.addEventListener('change', onLayoutChange);
      motion.addEventListener('change', onMotionChange);
      paintProgress();

      destroyRef.onDestroy(() => {
        for (const [target, type, handler] of listeners) target.removeEventListener(type, handler);
        observer.disconnect();
        layout.removeEventListener('change', onLayoutChange);
        motion.removeEventListener('change', onMotionChange);
        cancelAnimationFrame(frame);
        clearTimeout(releaseTimer);
      });
    });
  }
}
