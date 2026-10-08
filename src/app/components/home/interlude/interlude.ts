import { NgOptimizedImage } from '@angular/common';
import { Component, input } from '@angular/core';
import { Photo } from '../../../models/photo';
import { Reveal } from '../../../shared/reveal';

/** Pausa visual a sangre entre secciones: solo una fotografía y un pie mínimo. */
@Component({
  selector: 'app-interlude',
  imports: [NgOptimizedImage, Reveal],
  template: `
    <figure class="interlude">
      <div class="interlude-media" appReveal="clip">
        <img
          [ngSrc]="photo().src"
          [alt]="photo().alt"
          fill
          sizes="100vw"
          [style.object-position]="photo().focus ?? 'center'"
        />
      </div>
      <figcaption class="interlude-caption">{{ caption() }}</figcaption>
    </figure>
  `,
  styleUrl: './interlude.css',
})
export class Interlude {
  readonly photo = input.required<Photo>();
  readonly caption = input.required<string>();
}
