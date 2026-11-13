import { WorkEntry } from '../../../models/photo';

/*
 * Geometría de la cinta. Todo se mide en «u»: el alto de las tarjetas (el CSS lo convierte
 * con --rib-u). Las tarjetas van en fila, con su proporción real, y la fila se repite para
 * poder arrastrar sin fin.
 */

/** Separación entre tarjetas. */
export const CARD_GAP = 0.1;
/** Proporciones límite: así ninguna portada queda ni minúscula ni interminable. */
const MIN_RATIO = 1.3;
const MAX_RATIO = 2.4;
/** Veces que se repite la fila: con tres basta para que nunca se vea el salto del bucle. */
export const COPIES = 3;

export interface RibbonCard {
  readonly entry: WorkEntry;
  /** Posición en la lista original. */
  readonly index: number;
  /** Repetición de la fila: solo la 0 llega a lectores de pantalla y al tabulador. */
  readonly copy: number;
  /** Ancho de la tarjeta, en u. */
  readonly width: number;
  /** Centro de la tarjeta desde el principio de la cinta, en u. */
  readonly start: number;
}

export interface RibbonLayout {
  readonly cards: readonly RibbonCard[];
  /** Largo de una fila (todas las tarjetas y sus separaciones), en u. */
  readonly period: number;
}

export function layoutRibbon(entries: readonly WorkEntry[]): RibbonLayout {
  const widths = entries.map(({ photo }) =>
    Math.min(MAX_RATIO, Math.max(MIN_RATIO, photo.width / photo.height)),
  );
  const period = widths.reduce((sum, w) => sum + w + CARD_GAP, 0);

  const cards: RibbonCard[] = [];
  for (let copy = 0; copy < COPIES; copy++) {
    let start = copy * period;
    entries.forEach((entry, index) => {
      const width = widths[index];
      cards.push({ entry, index, copy, width, start: start + width / 2 });
      start += width + CARD_GAP;
    });
  }
  return { cards, period };
}

/**
 * Lleva una posición a la ventana [-total/2, total/2): la cinta es un bucle y cada tarjeta
 * aparece siempre en la repetición más cercana al centro.
 */
export function wrap(value: number, total: number): number {
  return ((((value + total / 2) % total) + total) % total) - total / 2;
}
