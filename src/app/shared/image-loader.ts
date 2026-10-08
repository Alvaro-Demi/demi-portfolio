import type { ImageConfig, ImageLoader } from '@angular/common';

/** Anchos que genera `npm run images` (scripts/images.mjs) para todas las fotos. */
export const PHOTO_WIDTHS = [640, 1080, 1600, 2400] as const;

/**
 * Anchos extra para las composiciones panorámicas (≈ 720, 1080 y 1350 px de alto).
 * Solo los pide quien los declara con `ngSrcset`.
 */
export const PANORAMA_WIDTHS = [3456, 5184, 6480] as const;

/** A partir de esta proporción, el script trata la foto como panorámica. */
export const PANORAMA_MIN_RATIO = 3;

const ALL_WIDTHS = [...PHOTO_WIDTHS, ...PANORAMA_WIDTHS];
const FALLBACK_WIDTH = 1600;

/** Redondea al ancho generado más cercano por arriba, sin pasar del mayor. */
function snap(width: number): number {
  return ALL_WIDTHS.find((w) => w >= width) ?? ALL_WIDTHS[ALL_WIDTHS.length - 1];
}

/**
 * Convierte el id de una foto (`ngSrc="hero"`) en la URL de la variante adecuada.
 * NgOptimizedImage lo llama una vez por cada ancho del `srcset`.
 */
export const photoLoader: ImageLoader = ({ src, width }) =>
  `images/photos/${src}-${snap(width ?? FALLBACK_WIDTH)}.webp`;

/** Limita el `srcset` automático a los anchos que existen para todas las fotos. */
export const photoImageConfig: ImageConfig = { breakpoints: [...PHOTO_WIDTHS] };
