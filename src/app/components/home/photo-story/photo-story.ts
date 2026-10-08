import { NgOptimizedImage } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { PhotoStory as Story } from '../../../models/photo';
import { Reveal } from '../../../shared/reveal';
import { ScrollTrack } from '../../../shared/scroll-track';
import { cropBox } from '../../../shared/story-crop';

/** Anchura de cada panel en móvil, según su forma: los más estrechos van en pareja. */
type CropShape = 'full' | 'portrait' | 'tall';

function shapeOf(width: number, height: number): CropShape {
  const ratio = width / height;
  if (ratio >= 0.75) return 'full';
  return ratio >= 0.55 ? 'portrait' : 'tall';
}

/**
 * Photo story: una composición panorámica de un directo.
 *   - Escritorio: la sección queda fija y el scroll vertical recorre la tira en horizontal.
 *   - Movimiento reducido / pantallas bajas: la tira es una región con scroll horizontal nativo.
 *   - Móvil y tablet: los paneles clave, sueltos y apilados.
 */
@Component({
  selector: 'app-photo-story',
  imports: [NgOptimizedImage, Reveal, ScrollTrack],
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

  /**
   * Paneles para móvil, con su tamaño real y su colocación:
   * los anchos van a sangre, los verticales alternan de lado y
   * dos estrechos seguidos forman pareja (izquierda + derecha).
   */
  protected readonly crops = computed(() => {
    const { photo, crops } = this.story();
    let side: 'start' | 'end' = 'start';
    let previous: { shape: CropShape; placement: string } | null = null;

    return crops.map((crop) => {
      const { width, height } = cropBox(photo, crop);
      const shape = shapeOf(width, height);
      let placement: 'full' | 'start' | 'end';

      if (shape === 'full') {
        placement = 'full';
      } else if (shape === 'tall') {
        placement = previous?.shape === 'tall' && previous.placement === 'start' ? 'end' : 'start';
      } else {
        placement = side;
        side = side === 'start' ? 'end' : 'start';
      }

      previous = { shape, placement };
      return { ...crop, width, height, shape, placement };
    });
  });
}
