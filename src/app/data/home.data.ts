import type { Photo, PhotoStory, WorkEntry } from '../models/photo';

/*
 * Contenido de la Home. `src` es el id de la foto, no una ruta.
 *
 * Para cambiar una fotografía:
 *   1. Copia la foto a images-src/ con su id (p. ej. images-src/hero.jpg).
 *   2. Ejecuta `npm run images` (lee este archivo: solo publica las fotos que se usan aquí).
 *   3. Copia aquí `width` y `height` de la tabla que imprime, y escribe el `alt`.
 *   4. Ajusta `focus` (y `mobile`) si el recorte corta lo importante.
 *
 * Orden de la Home: Hero → 01 Videoclip → Interludio → 02 Live → 03 Retrato → 04 Live → About → Contact.
 */

/** Marca visible de dato pendiente: búscala para completar el contenido. */
const PENDING_ARTIST = '[Artista]';

export const HERO_PHOTO: Photo = {
  src: 'hero',
  alt: 'Concierto en blanco y negro: DEMI graba con un estabilizador mientras dos artistas se abrazan sobre el escenario frente al público',
  width: 6000,
  height: 4000,
  focus: '50% 45%',
  // En vertical se ve la mitad del ancho: se encuadra desde DEMI (izquierda) hasta los artistas.
  mobile: { focus: '26% 50%' },
};

/*
 * 01 — Videoclip. Primero tras el hero: el color cálido contrasta con el B/N del directo
 * y deja claro desde el principio que DEMI también trabaja alrededor del videoclip.
 *   01 «Mírame»  → la pantalla: el momento más grande.
 *   02 «Abuela»  → tríptico con mucha información: secundario.
 *   03 «Odiseo»  → otra pantalla a sangre; Atenas enlaza con el interludio en Grecia.
 */
export const VIDEOCLIPS: readonly WorkEntry[] = [
  {
    id: 'mirame',
    artist: '·',
    title: 'Mírame - Al Safir X Jime',
    context: 'Videoclip',
    type: 'video',
    year: 2026,
    youtubeUrl: 'https://www.youtube.com/watch?v=x-do0kjojXc&list=RDx-do0kjojXc&start_radio=1', // Pendiente: URL de YouTube del videoclip.
    layout: 'screen',
    photo: {
      src: 'work-01',
      alt: 'Tríptico del videoclip «Mírame»: una mujer, una pareja a contraluz al atardecer y un retrato del artista',
      width: 3546,
      height: 1566,
    },
  },
  {
    id: 'abuela',
    artist: PENDING_ARTIST,
    title: 'ABUELA - AL SAFIR X OMAR MONTES', // Pendiente: título del videoclip.
    context: 'Videoclip',
    type: 'video',
    year: 2026,
    youtubeUrl:'https://www.youtube.com/watch?v=k1-Gh7qZDlc&list=RDk1-Gh7qZDlc&start_radio=1', // Pendiente: URL de YouTube del videoclip.
    layout: 'wide',
    photo: {
      src: 'work-05',
      alt: 'Tríptico de rodaje: un grupo posa en una nave, dos artistas junto a una mujer mayor sentada en un trono y una escena en un interior',
      width: 3546,
      height: 1566,
    },
  },
  {
    id: 'odiseo',
    artist: PENDING_ARTIST,
    title: 'Odiseo - al safir',
    context: 'Videoclip',
    type: 'video',
    year: 2025,
    youtubeUrl: 'https://www.youtube.com/watch?v=8mCN0b5XTSw&list=RD8mCN0b5XTSw&start_radio=1', // Pendiente: URL de YouTube del videoclip.
    layout: 'screen',
    photo: {
      src: 'work-03',
      alt: 'Portada del videoclip «Odiseo»: título dorado sobre Atenas y dos retratos del artista',
      // Tamaño real del original (16:9): con otra proporción se recortaría el título.
      width: 1920,
      height: 1080,
    },
  },
];

/*
 * 02 y 04 — Live. Dos composiciones panorámicas, una por artista. Van separadas por
 * los retratos: dos secuencias seguidas en B/N con el mismo mecanismo cansarían.
 * Se ven siempre enteras, en una tira que se recorre en horizontal.
 */
export const PHOTO_STORIES: readonly PhotoStory[] = [
  {
    id: 'live-01',
    artist: 'AL SAFIR EN CONCIERTO',
    context: 'Live',
    place: null, // Pendiente: ciudad o sala.
    year: null,
    photo: {
      src: 'composicion1',
      alt: 'Secuencia en blanco y negro de un concierto: el artista canta a contraluz, entre columnas de humo, a hombros de otro artista y rodeado de bailarinas',
      width: 6480,
      height: 1350,
    },
  },
  {
    id: 'live-02',
    artist: 'JAVI BAMBINI EN CONCIERTO',
    context: 'Live',
    place: null, // Pendiente: ciudad o sala.
    year: null,
    photo: {
      src: 'composicion2',
      alt: 'Secuencia en blanco y negro de un directo: el artista canta de perfil con gorra, posa con su equipo frente al público y saluda de espaldas a la multitud',
      width: 6480,
      height: 1350,
    },
  },
];

/*
 * 03 — Retrato. Tres fotos de la misma sesión y el mismo fondo: respiración en color
 * entre los dos directos. Composición de doble página:
 *   lead       → el retrato grande, junto al título.
 *   pair-start → primero de los dos pequeños, bajo el título.
 *   pair-end   → segundo pequeño, algo más abajo (escalonado).
 * (El directo con humo ya no va suelto: está dentro de la primera composición.)
 */
export const PORTRAITS: readonly WorkEntry[] = [
  {
    id: 'portrait-eagle',
    artist: 'AL SAFIR',
    title: null,
    context: 'SESION DE FOTOS',
    type: 'photo',
    year: 2026,
    youtubeUrl: null,
    layout: 'lead',
    photo: {
      src: 'work-04',
      alt: 'Retrato de un artista con sudadera negra y un águila dorada, sobre fondo verde oscuro',
      width: 2333,
      height: 3500,
    },
  },
  {
    id: 'portrait-gun',
    artist: 'AL SAFIR',
    title: null,
    context: 'SESION DE FOTOS',
    type: 'photo',
    year: 2026,
    youtubeUrl: null,
    layout: 'pair-start',
    photo: {
      src: 'work-06',
      alt: 'Artista desenfocado apunta con una pistola a cámara, que enfoca el arma en primer plano',
      width: 2449,
      height: 3674,
    },
  },
  {
    id: 'portrait-otro',
    artist: 'AL SAFIR',
    title: null,
    context: 'SESION DE FOTOS',
    type: 'photo',
    year: 2026,
    youtubeUrl: null,
    layout: 'pair-end',
    photo: {
      src: 'otro-retrato',
      alt: 'Retrato del artista mirando a cámara, con camiseta negra, una bufanda estampada al cuello y reloj dorado, sobre fondo oscuro',
      width: 2624,
      height: 3936,
    },
  },
];

export const INTERLUDE_PHOTO: Photo = {
  src: 'interlude',
  alt: 'Vista aérea al atardecer de un templo griego sobre un cabo junto al mar',
  width: 4000,
  height: 2250,
  // El templo queda abajo a la derecha: así no se pierde en el recorte vertical del móvil.
  focus: '65% 70%',
};

export const INTERLUDE_CAPTION = 'Cabo Sunión · Grecia';

export const ABOUT_PHOTO: Photo = {
  src: 'about',
  alt: 'DEMI de espaldas, con sudadera y gafas de sol en la cabeza, pilotando un dron en la calle',
  width: 4506,
  height: 6759,
};

/** Placeholder: sustituir por el email real. */
export const CONTACT_EMAIL = 'info@demi.com';
