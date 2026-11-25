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
 * Los `.svg` (placeholders) no tienen variantes: se sirven tal cual.
 */
export const photoLoader: ImageLoader = ({ src, width }) =>
  src.endsWith('.svg') ? src : `images/photos/${src}-${snap(width ?? FALLBACK_WIDTH)}.webp`;

/**
 * `sizes` de la foto del hero. La usan el hero y el fondo fijo (app-backdrop): con el mismo valor
 * el navegador la descarga una sola vez.
 * En vertical la foto se recorta y se ve más ancha que la pantalla (hasta ~2× su ancho). En
 * móviles de densidad 3x basta la variante de 1600 px (499 → 144 KB, sin diferencia visible);
 * en 2x (tablets, algunos móviles) se mantiene la de 2400, porque la de 1080 se notaría.
 * Si cambia, actualiza también la precarga del hero en src/index.html (imagesizes).
 */
export const HERO_SIZES =
  '(max-aspect-ratio: 1/1) and (min-resolution: 2.5dppx) 120vw, (max-aspect-ratio: 1/1) 210vw, 100vw';

/** Limita el `srcset` automático a los anchos que existen para todas las fotos. */
export const photoImageConfig: ImageConfig = { breakpoints: [...PHOTO_WIDTHS] };
