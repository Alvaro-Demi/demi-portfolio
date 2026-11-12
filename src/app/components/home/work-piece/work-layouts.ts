import { WorkLayout } from '../../../models/photo';
import { RevealMode } from '../../../shared/reveal';

/**
 * Lo que cada papel necesita además de su posición en la rejilla (que vive en el CSS
 * de su sección):
 *   - `sizes`: ancho que ocupa la imagen, para que el navegador elija la resolución.
 *     En móvil los videoclips se ven enteros, sin recorte: screen y wide a sangre (100vw).
 *   - `reveal`: cómo entra en escena. Las pantallas se abren de izquierda a derecha.
 */
export const WORK_LAYOUTS: Record<WorkLayout, { readonly sizes: string; readonly reveal: RevealMode }> = {
  screen: { sizes: '(min-width: 64rem) 58vw, (min-width: 48rem) 73vw, 100vw', reveal: 'wipe' },
  wide: { sizes: '(min-width: 64rem) 58vw, (min-width: 48rem) 73vw, 100vw', reveal: 'wipe' },
  coda: { sizes: '(min-width: 64rem) 40vw, (min-width: 48rem) 62vw, 84vw', reveal: 'wipe' },
};
