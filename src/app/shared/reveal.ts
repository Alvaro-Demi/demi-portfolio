import { afterNextRender, DestroyRef, Directive, ElementRef, inject, input, signal } from '@angular/core';

export type RevealMode = 'fade' | 'clip' | 'wipe';

/**
 * Revela el elemento la primera vez que entra en el viewport.
 * Los estilos (.reveal / .is-revealed) viven en styles.css.
 *   - 'fade' → opacidad + desplazamiento corto (textos, piezas secundarias)
 *   - 'clip' → la imagen se descubre de abajo arriba (fotografías verticales)
 *   - 'wipe' → la imagen se descubre de izquierda a derecha (panorámicas, como una pantalla)
 * `revealDelay` (ms) escalona elementos que entran a la vez, p. ej. foto y pie.
 */
@Directive({
  selector: '[appReveal]',
  host: {
    class: 'reveal',
    '[attr.data-reveal]': 'appReveal() || "fade"',
    '[class.is-revealed]': 'revealed()',
    '[style.--reveal-delay.ms]': 'revealDelay()',
  },
})
export class Reveal {
  readonly appReveal = input<RevealMode | ''>('fade');
  readonly revealDelay = input(0);

  protected readonly revealed = signal(false);

  constructor() {
    const element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);

    // IntersectionObserver solo existe en el navegador: se crea tras el primer render.
    afterNextRender(() => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting) {
            this.revealed.set(true);
            observer.disconnect();
          }
        },
        { rootMargin: '0px 0px -10% 0px' },
      );
      observer.observe(element);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}
