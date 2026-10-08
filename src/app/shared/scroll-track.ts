import { afterNextRender, DestroyRef, Directive, ElementRef, inject, input, signal } from '@angular/core';

/**
 * Cuándo se activa: pantallas anchas y con altura suficiente, y sin movimiento reducido.
 * En el resto, la sección se queda en su versión estática (CSS).
 */
const TRACK_MEDIA = '(min-width: 64rem) and (min-height: 36rem) and (prefers-reduced-motion: no-preference)';

/**
 * Convierte el scroll vertical en desplazamiento horizontal de una tira, sin
 * secuestrar el scroll: la sección crece en alto lo que la tira sobresale en ancho
 * (`--travel`), su contenido queda `sticky` y el progreso (`--progress`, 0 → 1)
 * se lee de la posición de la sección. Rueda, trackpad y teclado funcionan porque
 * el documento sigue haciendo scroll normal; al acabar la tira, la página continúa.
 *
 * El CSS de la sección usa `.is-tracking`, `--travel` y `--progress`.
 */
@Directive({
  selector: '[appScrollTrack]',
  exportAs: 'scrollTrack',
  host: {
    '[class.is-tracking]': 'active()',
  },
})
export class ScrollTrack {
  /** Elemento que se desplaza en horizontal. */
  readonly appScrollTrack = input.required<HTMLElement>();

  /** `true` mientras el efecto está activo (pantalla adecuada y la tira no cabe). */
  readonly active = signal(false);

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const strip = this.appScrollTrack();
      const media = matchMedia(TRACK_MEDIA);
      let travel = 0;
      let frame = 0;

      // Se escribe directamente en el estilo: cambia en cada fotograma de scroll y no
      // debe pasar por la detección de cambios de Angular.
      const paint = () => {
        frame = 0;
        const progress = travel > 0 ? -host.getBoundingClientRect().top / travel : 0;
        host.style.setProperty('--progress', Math.min(Math.max(progress, 0), 1).toFixed(4));
      };

      const measure = () => {
        travel = media.matches ? Math.max(0, Math.round(strip.offsetWidth - host.clientWidth)) : 0;
        this.active.set(travel > 0);
        host.style.setProperty('--travel', `${travel}px`);
        paint();
      };

      const onScroll = () => {
        if (travel > 0 && frame === 0) frame = requestAnimationFrame(paint);
      };

      // El ancho de la tira depende de la altura de la ventana: se mide al cambiar de tamaño.
      // Se aplaza al siguiente fotograma porque medir cambia el alto de la propia sección,
      // y hacerlo dentro del callback provoca el aviso "ResizeObserver loop".
      let measureFrame = 0;
      const resize = new ResizeObserver(() => {
        cancelAnimationFrame(measureFrame);
        measureFrame = requestAnimationFrame(measure);
      });
      resize.observe(strip);
      resize.observe(host);
      media.addEventListener('change', measure);
      window.addEventListener('scroll', onScroll, { passive: true });

      destroyRef.onDestroy(() => {
        resize.disconnect();
        media.removeEventListener('change', measure);
        window.removeEventListener('scroll', onScroll);
        cancelAnimationFrame(frame);
        cancelAnimationFrame(measureFrame);
      });
    });
  }
}
