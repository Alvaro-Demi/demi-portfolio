import { NgOptimizedImage } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { PhotoStory as Story } from '../../../models/photo';
import { Glide } from '../../../shared/glide';
import { Reveal } from '../../../shared/reveal';
import { ScrollTrack } from '../../../shared/scroll-track';

/**
 * Photo story: una composición panorámica de un directo, siempre entera, en una tira.
 *   - Escritorio: la sección queda fija y el scroll vertical recorre la tira en horizontal.
 *   - Móvil y tablet: paneo de cámara; el scroll vertical desliza la tira con un muelle
 *     y el dedo puede tomar el control en cualquier momento.
 *   - Movimiento reducido / pantallas bajas: región con scroll horizontal nativo.
 */
@Component({
  selector: 'app-photo-story',
  imports: [NgOptimizedImage, Reveal, ScrollTrack, Glide],
  templateUrl: './photo-story.html',
  styleUrl: './photo-story.css',
})
export class PhotoStory {
  readonly story = input.required<Story>();
  /** Número del capítulo en la Home, p. ej. '02'. */
  readonly chapter = input.required<string>();

  protected readonly titleId = computed(() => `${this.story().id}-title`);
  protected readonly eyebrowId = computed(() => `${this.story().id}-chapter`);

  protected readonly meta = computed(() => {
    const { context, place, year } = this.story();
    return [context, place, year].filter((part) => part !== null).join(' / ');
  });

  protected readonly regionLabel = computed(
    () =>
      `Photo story ${this.chapter()}, secuencia completa de ${this.story().artist}. Desplázate en horizontal para recorrerla.`,
  );
}
