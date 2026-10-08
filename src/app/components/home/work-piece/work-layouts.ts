import { WorkLayout } from '../../../models/photo';
import { RevealMode } from '../../../shared/reveal';

/**
 * Lo que cada papel necesita además de su posición en la rejilla (que vive en el CSS
 * de su sección):
 *   - `sizes`: ancho que ocupa la imagen, para que el navegador elija la resolución.
 *     En móvil, las panorámicas recortadas (screen, wide) se escalan por su alto:
 *     la imagen renderizada es ~2,5 veces más ancha que la pantalla.
 *   - `reveal`: cómo entra en escena. La "pantalla" se abre de izquierda a derecha,
 *     las verticales se descubren de abajo arriba y las secundarias solo aparecen.
 */
export const WORK_LAYOUTS: Record<WorkLayout, { readonly sizes: string; readonly reveal: RevealMode }> = {
  screen: { sizes: '(min-width: 64rem) 93vw, (min-width: 48rem) 94vw, 252vw', reveal: 'wipe' },
  wide: { sizes: '(min-width: 64rem) 93vw, (min-width: 48rem) 94vw, 252vw', reveal: 'wipe' },
  coda: { sizes: '(min-width: 64rem) 40vw, (min-width: 48rem) 62vw, 84vw', reveal: 'wipe' },
  'pair-start': { sizes: '(min-width: 64rem) 30vw, (min-width: 48rem) 46vw, 72vw', reveal: 'clip' },
  'pair-end': { sizes: '(min-width: 64rem) 30vw, (min-width: 48rem) 46vw, 72vw', reveal: 'clip' },
};
