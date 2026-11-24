/*
 * Geometría de la rueda de reels. Las tarjetas cuelgan de una rueda cuyo eje queda por debajo
 * de la sección: cada casilla está girada STEP grados respecto a la anterior. Los reels se
 * repiten alrededor de la rueda para llenarla (con 3 reels, 5 vueltas de 3).
 */

/** Grados entre casillas vecinas. */
export const STEP = 24;
/** Casillas a cada lado del centro que llegan a verse (las demás quedan ocultas). */
export const VISIBLE_SIDE = 2.6;
/** Casillas mínimas en la rueda: con menos, se verían los huecos de detrás. */
const MIN_SLOTS = 15;
/**
 * Las vueltas (copias de cada reel) son múltiplo de 6: así, con 1, 2 o 3 tramos por reel, dos
 * copias vecinas nunca repiten tramo, tampoco donde la rueda se cierra.
 */
const COPIES_MULTIPLE = 6;

/** Número de casillas: múltiplo del número de reels, para que la rueda cierre sin saltos. */
export function slotCount(reels: number): number {
  if (reels <= 0) return 0;
  const copies = Math.ceil(Math.ceil(MIN_SLOTS / reels) / COPIES_MULTIPLE) * COPIES_MULTIPLE;
  return copies * reels;
}

/** Tramo (empezando en 0) que enseña la copia `copy` de un reel con `loops` tramos. */
export function loopFor(copy: number, loops: number): number {
  return loops > 0 ? copy % loops : 0;
}

/**
 * Distancia (en casillas) de la casilla `slot` al centro cuando la rueda está en `position`,
 * llevada al tramo [-slots/2, slots/2): la rueda es un bucle.
 */
export function offsetFromCenter(slot: number, position: number, slots: number): number {
  return ((((slot - position + slots / 2) % slots) + slots) % slots) - slots / 2;
}

/** Casilla que está en el centro. */
export function centerSlot(position: number, slots: number): number {
  return ((Math.round(position) % slots) + slots) % slots;
}

/**
 * Casillas accesibles (tabulador y lectores de pantalla): la vuelta de reels a la que pertenece
 * la casilla del centro. Una por reel, en orden: con el tabulador se recorren los reels una vez
 * (centrándose cada uno al recibir el foco) y se sale de la rueda.
 */
export function reachableSlots(position: number, slots: number, reels: number): Set<number> {
  if (reels <= 0 || slots <= 0) return new Set();
  const center = centerSlot(position, slots);
  const first = center - (center % reels);
  return new Set(Array.from({ length: reels }, (_, i) => first + i));
}

/** Posición más cercana a `position` en la que `slot` queda en el centro (el camino corto). */
export function positionFor(slot: number, position: number, slots: number): number {
  return position + offsetFromCenter(slot, position, slots);
}
