/** Una fotografía con lo que necesita NgOptimizedImage para reservar su espacio. */
export interface Photo {
  /** Id de la foto (nombre del original en images-src/); el loader construye las URLs. */
  readonly src: string;
  readonly alt: string;
  readonly width: number;
  readonly height: number;
  /** Punto de interés para el recorte (`object-position`), p. ej. '50% 30%'. */
  readonly focus?: string;
  /** Encuadre específico para pantallas estrechas, cuando el general no funciona. */
  readonly mobile?: MobileCrop;
}

export interface MobileCrop {
  /** Proporción del recorte en móvil (`aspect-ratio`), p. ej. '4 / 5'. Sin ella se respeta la original. */
  readonly aspectRatio?: string;
  /** Punto de interés en móvil (`object-position`). */
  readonly focus: string;
}

/**
 * Papel de cada pieza dentro de su sección.
 *   Videoclip: screen (pantalla a sangre) · wide (panorámica secundaria) · coda (cierre)
 *   Retrato:   pair-start / pair-end (las dos mitades del díptico)
 */
export type WorkLayout = 'screen' | 'wide' | 'coda' | 'pair-start' | 'pair-end';

export type WorkType = 'photo' | 'video';

export interface WorkEntry {
  readonly id: string;
  /** Artista o proyecto. */
  readonly artist: string;
  /** Título de la obra (p. ej. el del videoclip). `null` si la pieza no tiene título propio. */
  readonly title: string | null;
  /** Contexto de la foto: 'Directo', 'Retrato', 'Videoclip'… */
  readonly context: string;
  readonly type: WorkType;
  /** `null` mientras no se confirme. */
  readonly year: number | null;
  /** Solo para `type: 'video'`. `null` mientras no exista el enlace. */
  readonly youtubeUrl: string | null;
  readonly layout: WorkLayout;
  readonly photo: Photo;
}

/**
 * Panel de una photo story que se muestra suelto en móvil. Se recorta a todo el alto
 * de la composición; `left` y `width` son porcentajes de su ancho.
 * `npm run images` genera el archivo `{src}-{ancho}.webp` a partir de la composición.
 */
export interface StoryCrop {
  readonly src: string;
  readonly left: number;
  readonly width: number;
  readonly alt: string;
}

/** Composición panorámica de un directo: en escritorio se recorre en horizontal con el scroll. */
export interface PhotoStory {
  /** También es el ancla de la sección (#live-01). */
  readonly id: string;
  readonly artist: string;
  /** 'Live', 'Gira'… */
  readonly context: string;
  /** `null` mientras no se confirme. */
  readonly place: string | null;
  readonly year: number | null;
  readonly photo: Photo;
  readonly crops: readonly StoryCrop[];
}
