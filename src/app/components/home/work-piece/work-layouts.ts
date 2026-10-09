import { WorkLayout } from '../../../models/photo';
import { RevealMode } from '../../../shared/reveal';

/**
 * Lo que cada papel necesita además de su posición en la rejilla (que vive en el CSS
 * de su sección):
 *   - `sizes`: ancho que ocupa la imagen, para que el navegador elija la resolución.
 *     En móvil los videoclips se ven enteros, sin recorte: screen y wide a sangre (100vw).
 *   - `reveal`: cómo entra en escena. La "pantalla" se abre de izquierda a derecha,
 *     las verticales se descubren de abajo arriba y las secundarias solo aparecen.
 */
export const WORK_LAYOUTS: Record<WorkLayout, { readonly sizes: string; readonly reveal: RevealMode }> = {
  screen: { sizes: '(min-width: 64rem) 58vw, (min-width: 48rem) 73vw, 100vw', reveal: 'wipe' },
  wide: { sizes: '(min-width: 64rem) 58vw, (min-width: 48rem) 73vw, 100vw', reveal: 'wipe' },
  coda: { sizes: '(min-width: 64rem) 40vw, (min-width: 48rem) 62vw, 84vw', reveal: 'wipe' },
  lead: { sizes: '(min-width: 64rem) 38vw, (min-width: 48rem) 58vw, 84vw', reveal: 'clip' },
  'pair-start': { sizes: '(min-width: 64rem) 22vw, (min-width: 48rem) 34vw, 70vw', reveal: 'clip' },
  'pair-end': { sizes: '(min-width: 64rem) 22vw, (min-width: 48rem) 46vw, 70vw', reveal: 'clip' },
};
