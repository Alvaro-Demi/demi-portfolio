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

/** Número de casillas: múltiplo del número de reels, para que la rueda cierre sin saltos. */
export function slotCount(reels: number): number {
  if (reels <= 0) return 0;
  return Math.ceil(MIN_SLOTS / reels) * reels;
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

/** Posición más cercana a `position` en la que `slot` queda en el centro (el camino corto). */
export function positionFor(slot: number, position: number, slots: number): number {
  return position + offsetFromCenter(slot, position, slots);
}
