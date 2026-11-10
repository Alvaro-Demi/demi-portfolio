import { SequenceFrame } from '../../../models/photo';

/*
 * Geometría de la tira. Todo se mide en «u»: el alto de la película (el CSS lo convierte con
 * --film-u). Las fotos van en un anillo que gira sobre un eje vertical; solo se ve el frente.
 */

/** Alto de la foto dentro de la película (el resto son las bandas perforadas). */
export const PHOTO_HEIGHT = 0.68;
/** Separación entre fotos. */
export const FRAME_GAP = 0.05;
/** Proporciones límite: las muy panorámicas o muy verticales se recortan hasta aquí. */
const MIN_RATIO = 0.72;
const MAX_RATIO = 1.5;
/**
 * Radio mínimo del anillo. Cuanto mayor, más suave la curva: con menos fotos de las
 * necesarias, la secuencia se repite alrededor del anillo hasta llegar a él.
 */
const MIN_RADIUS = 2.5;

export interface StripCard {
  readonly frame: SequenceFrame;
  /** Posición en la secuencia original (para el número del borde). */
  readonly index: number;
  /** Vuelta de la secuencia: solo la 0 se anuncia a lectores de pantalla. */
  readonly copy: number;
  /** Ángulo del centro de la foto en el anillo, en grados. */
  readonly angle: number;
  /** Ancho del fotograma (foto + separación), en u. */
  readonly width: number;
}

export interface StripLayout {
  readonly cards: readonly StripCard[];
  /** Radio del anillo, en u. */
  readonly radius: number;
  /** Grados que ocupa una vuelta de la secuencia: girar esto deja la tira igual. */
  readonly period: number;
}

export function layoutStrip(frames: readonly SequenceFrame[]): StripLayout {
  const widths = frames.map((frame) => {
    const ratio = Math.min(MAX_RATIO, Math.max(MIN_RATIO, frame.width / frame.height));
    return ratio * PHOTO_HEIGHT + FRAME_GAP;
  });
  const sequence = widths.reduce((sum, w) => sum + w, 0);
  if (sequence === 0) return { cards: [], radius: MIN_RADIUS, period: 360 };

  const copies = Math.max(2, Math.ceil((2 * Math.PI * MIN_RADIUS) / sequence));
  const radius = (copies * sequence) / (2 * Math.PI);
  const toDegrees = 180 / Math.PI / radius;

  const cards: StripCard[] = [];
  let start = 0;
  for (let copy = 0; copy < copies; copy++) {
    frames.forEach((frame, index) => {
      const width = widths[index];
      cards.push({ frame, index, copy, width, angle: (start + width / 2) * toDegrees });
      start += width;
    });
  }
  return { cards, radius, period: 360 / copies };
}
