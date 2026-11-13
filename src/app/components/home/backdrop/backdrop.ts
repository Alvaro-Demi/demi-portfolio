import { NgOptimizedImage } from '@angular/common';
import { afterNextRender, Component, DestroyRef, ElementRef, inject, input } from '@angular/core';
import { Photo } from '../../../models/photo';

/** Scroll (en pantallas) en el que el fondo termina de desenfocarse y oscurecerse. */
const TRANSITION_SCREENS = 0.85;

/**
 * Fondo de la Home: la foto del hero, fija detrás de todas las secciones.
 *
 * Arriba del todo es la propia foto del hero (en tablet y escritorio; en móvil el hero tiene
 * su foto en bloque y este fondo empieza invisible). Al hacer scroll, durante la primera
 * pantalla, la foto se desenfoca, se oscurece y se acerca un poco: queda como textura de
 * fondo del resto de secciones.
 *
 * Para no recalcular un desenfoque a pantalla completa en cada frame, hay dos capas: la foto
 * nítida y otra ya desenfocada (pequeña: total, está borrosa). El scroll solo cambia
 * opacidades y una escala, escritas en una variable CSS (--backdrop-p, de 0 a 1).
 * Es decorativo: la foto ya está descrita en el hero.
 */
@Component({
  selector: 'app-backdrop',
  imports: [NgOptimizedImage],
  host: { 'aria-hidden': 'true' },
  template: `
    <div class="backdrop-zoom">
      <img
        class="backdrop-sharp"
        [ngSrc]="photo().src"
        alt=""
        fill
        priority
        sizes="(max-aspect-ratio: 1/1) 210vw, 100vw"
        [style.--focus]="photo().focus ?? null"
        [style.--focus-mobile]="photo().mobile?.focus ?? null"
      />
      <img
        class="backdrop-soft"
        [ngSrc]="photo().src"
        alt=""
        fill
        sizes="16vw"
        [style.--focus]="photo().focus ?? null"
        [style.--focus-mobile]="photo().mobile?.focus ?? null"
      />
    </div>
    <div class="backdrop-veil"></div>
    <div class="backdrop-shade"></div>
  `,
  styleUrl: './backdrop.css',
})
export class Backdrop {
  readonly photo = input.required<Photo>();

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      let frame = 0;
      const update = () => {
        frame = 0;
        const progress = Math.min(1, Math.max(0, scrollY / (innerHeight * TRANSITION_SCREENS)));
        host.style.setProperty('--backdrop-p', progress.toFixed(3));
      };
      const schedule = () => {
        if (!frame) frame = requestAnimationFrame(update);
      };

      update();
      addEventListener('scroll', schedule, { passive: true });
      addEventListener('resize', schedule);
      destroyRef.onDestroy(() => {
        cancelAnimationFrame(frame);
        removeEventListener('scroll', schedule);
        removeEventListener('resize', schedule);
      });
    });
  }
}
