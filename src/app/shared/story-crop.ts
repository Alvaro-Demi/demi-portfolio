import type { Photo, StoryCrop } from '../models/photo';

/**
 * Rectángulo en píxeles de un panel dentro de su composición.
 * Lo usan el componente (width/height de la imagen) y scripts/images.mjs (para recortarla),
 * así ambos redondean igual.
 */
export function cropBox(photo: Photo, crop: StoryCrop) {
  const left = Math.round((photo.width * crop.left) / 100);
  const width = Math.min(Math.round((photo.width * crop.width) / 100), photo.width - left);
  return { left, top: 0, width, height: photo.height };
}
