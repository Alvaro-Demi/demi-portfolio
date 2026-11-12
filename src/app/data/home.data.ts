import type { Photo, PhotoStory, Portrait, SequenceFrame, WorkEntry } from '../models/photo';

/*
 * Contenido de la Home. `src` es el id de la foto, no una ruta.
 *
 * Para cambiar una fotografía:
 *   1. Copia la foto a images-src/ con su id (p. ej. images-src/hero.jpg).
 *   2. Ejecuta `npm run images` (lee este archivo: solo publica las fotos que se usan aquí).
 *   3. Copia aquí `width` y `height` de la tabla que imprime, y escribe el `alt`.
 *   4. Ajusta `focus` (y `mobile`) si el recorte corta lo importante.
 *
 * Orden de la Home: Hero → 01 Videoclip → Detrás de las cámaras → 02 Live → 03 Retrato → 04 Live → 05 Archivo
 * → 06 About → 07 Contact.
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
    artist: 'COMBATE DE DOMÍNGUEZ SEVILLANO',
    context: 'Live',
    place: null, // Pendiente: ciudad o sala.
    year: null,
    photo: {
      src: 'composicion3',
      alt: 'Secuencia en blanco y negro de un directo: el artista canta de perfil con gorra, posa con su equipo frente al público y saluda de espaldas a la multitud',
      width: 6480,
      height: 1350,
    },
  },
];

/*
 * 03 — Retrato. Respiración en color entre los dos directos. Una foto grande y el resto en
 * una columna de miniaturas; cada pocos segundos la primera miniatura pasa a ser la grande
 * (portraits). Funciona con 3 o más; está pensada para 4.
 * Las fotos verticales encajan mejor (la grande es casi 3:4 y las miniaturas casi 5:6).
 */
export const PORTRAITS: readonly Portrait[] = [
  {
    id: 'portrait-eagle',
    artist: 'AL SAFIR',
    context: 'Sesión de fotos',
    year: 2026,
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
    context: 'Sesión de fotos',
    year: 2026,
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
    context: 'Sesión de fotos',
    year: 2026,
    photo: {
      src: 'otro-retrato',
      alt: 'Retrato del artista mirando a cámara, con camiseta negra, una bufanda estampada al cuello y reloj dorado, sobre fondo oscuro',
      width: 2624,
      height: 3936,
    },
  },
  {
    // Pendiente: cuarta foto. Copia el original a images-src/, ejecuta `npm run images`
    // y cambia `src` (por su id), `width`, `height`, `alt`, `artist` y `year`.
    id: 'portrait-pendiente',
    artist: 'AL SAFIR',
    context: 'Sesión de fotos',
    year: 2026,
    photo: {
      src: 'work-07',
      alt: 'Retrato del artista con sudadera negra y un águila dorada, sobre fondo verde oscuro',
      width: 2216,
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

/** Sin uso por ahora: el interludio es la secuencia de abajo. */
export const INTERLUDE_CAPTION = 'Cabo Sunión · Grecia';

/*
 * Interludio — «detrás de las cámaras»: rodajes, BTS, DEMI trabajando con la cámara y
 * preparación. Van montadas en una tira de película curvada que gira sin parar (film-strip).
 * Cada foto conserva su orientación; las muy panorámicas o muy verticales se recortan un poco.
 *
 * Para cambiar o añadir una foto:
 *   1. Copia la foto a images-src/ con un id (p. ej. images-src/bts-01.jpg).
 *   2. Ejecuta `npm run images`.
 *   3. En su línea: `src` → el id ('bts-01'); `width`/`height` → los de la tabla que imprime;
 *      `alt` → qué se ve en la foto. Opcional: `focus` si el recorte corta lo importante.
 * Para incluir la foto de Grecia, añade `INTERLUDE_PHOTO` como una posición más.
 * Puedes añadir, quitar o reordenar posiciones: la tira se adapta sola.
 */
export const INTERLUDE_SEQUENCE: readonly SequenceFrame[] = [
  // 01 · BTS1 · rodaje de videoclip (horizontal 3:2)
  {
    src: 'BTS1',
    alt: 'Rodaje de un videoclip en una nave: dos artistas sentados en tronos dorados mientras un operador los graba con un estabilizador',
    width: 6000,
    height: 4000,
  },
  // 02 · BTS2 · fotografía en un estadio (vertical 3:4)
  {
    src: 'BTS2',
    alt: 'Fotógrafo con chaleco de prensa disparando a pie de campo en un estadio de fútbol lleno de público',
    width: 3024,
    height: 4032,
  },
  // 03 · BTS3 · rodaje en la montaña (horizontal 4:3)
  {
    src: 'BTS3',
    alt: 'Rodaje al atardecer en lo alto de una montaña: un operador graba con un estabilizador sobre las rocas mientras dos personas miran el valle',
    width: 1600,
    height: 1200,
  },
  // 04 · BTS4 · DEMI con el dron (vertical 2:3). Es la misma foto que la del About.
  {
    src: 'BTS4',
    alt: 'DEMI de espaldas, con sudadera y gafas de sol en la cabeza, pilotando un dron en la calle',
    width: 4506,
    height: 6759,
  },
  // 05 · BTS5 · cámara de vídeo en una plaza de toros (horizontal 4:3)
  {
    src: 'BTS5',
    alt: 'Operador con una cámara de vídeo grabando desde la barrera en una plaza de toros iluminada de noche',
    width: 1600,
    height: 1200,
  },
  // 06 · BTS6 · control de realización en plató (horizontal 3:2)
  {
    src: 'BTS6',
    alt: 'Control de realización durante una grabación en plató: monitores, mesa de vídeo y un presentador al fondo',
    width: 6720,
    height: 4480,
  },
  // 07 · BTS7 · preparando el estabilizador en una nave (vertical 2:3)
  {
    src: 'BTS7',
    alt: 'Rodaje en una nave: un operador prepara la cámara en el estabilizador junto a otro miembro del equipo',
    width: 4000,
    height: 6000,
  },
  // 08 · BTS8 · sesión de producto en el monte (vertical 3:4)
  {
    src: 'BTS8',
    alt: 'Fotógrafo con sudadera gris fotografiando una sudadera blanca extendida sobre una roca en el monte',
    width: 3024,
    height: 4032,
  },
];

/** Fotograma del interludio por su id (falla al arrancar si se renombra). */
function interludeFrame(src: string): Photo {
  const frame = INTERLUDE_SEQUENCE.find((f) => f.src === src);
  if (!frame) throw new Error(`No hay ninguna foto "${src}" en INTERLUDE_SEQUENCE`);
  return frame;
}

/*
 * 05 — Archivo. Animación isométrica: las fotos pasan en diagonal como tarjetas, de arriba
 * a la derecha hacia un montón abajo a la izquierda. Cierra el recorrido antes del About.
 *
 * Son fotos que ya están en la web (se reutilizan sus archivos). Las tarjetas son verticales
 * (4:5): para las horizontales, `focus` decide qué parte se ve.
 * Hacen falta al menos 8 fotos; puedes añadir, quitar o reordenar libremente.
 * Alterna color y blanco y negro para que el paso de una a otra se note.
 */
export const ARCHIVE_CARDS: readonly Photo[] = [
  PORTRAITS[0].photo, // retrato del águila
  PORTRAITS[2].photo, // retrato con la bufanda
  { ...HERO_PHOTO, focus: '26% 50%' }, // DEMI grabando el concierto (B/N)
  PORTRAITS[1].photo, // la pistola
  INTERLUDE_PHOTO, // Cabo Sunión
  interludeFrame('BTS2'), // estadio
  interludeFrame('BTS7'), // preparando el estabilizador
  interludeFrame('BTS3'), // rodaje en la montaña
  interludeFrame('BTS5'), // plaza de toros
  interludeFrame('BTS8'), // sesión de producto en el monte
];

export const ABOUT_PHOTO: Photo = {
  src: 'about',
  alt: 'DEMI de espaldas, con sudadera y gafas de sol en la cabeza, pilotando un dron en la calle',
  width: 4506,
  height: 6759,
};

/** Servicios: se listan en el About y son las opciones de «Tipo de proyecto» del formulario. */
export const SERVICES: readonly string[] = [
  'Imagen corporativa',
  'Videoclips y rodajes',
  'Sesiones de fotos',
  'Dron',
  'Conciertos y eventos',
];

/** Dirección a la que llegan los mensajes del formulario de contacto. */
export const CONTACT_EMAIL = 'alvarodemiguel1997@gmail.com';

/** Usuario de Instagram, sin la @. */
export const INSTAGRAM_HANDLE = 'alvaro.demi';
