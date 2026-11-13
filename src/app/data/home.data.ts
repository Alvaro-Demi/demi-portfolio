import type { Photo, PhotoStory, Portrait, SectionIntro, SequenceFrame, SocialReel, WorkEntry } from '../models/photo';

/*
 * Contenido de la Home. `src` es el id de la foto, no una ruta.
 *
 * Para cambiar una fotografía:
 *   1. Copia la foto a images-src/ con su id (p. ej. images-src/hero.jpg).
 *   2. Ejecuta `npm run images` (lee este archivo: solo publica las fotos que se usan aquí).
 *   3. Copia aquí `width` y `height` de la tabla que imprime, y escribe el `alt`.
 *   4. Ajusta `focus` (y `mobile`) si el recorte corta lo importante.
 *
 * Orden de la Home: Hero → 01 Videoclips → 02 Social Media → 03 Conciertos → 04 Retrato
 * → 05 Velada de boxeo → 06 Backstage → 07 About → 08 Contact.
 */

/** Marcas visibles de dato pendiente: búscalas para completar el contenido. */
const PENDING_ARTIST = '[Artista]';
const PENDING_TITLE = '[Título del reel]';

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
 * Las portadas van en una cinta 3D que se arrastra (video-ribbon), en este orden; la primera
 * empieza en el centro. Cada tarjeta enlaza a su `youtubeUrl` (sin URL, no enlaza).
 * Puedes añadir más: la cinta se adapta sola.
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
    youtubeUrl: 'https://www.youtube.com/watch?v=k1-Gh7qZDlc&list=RDk1-Gh7qZDlc&start_radio=1', // Pendiente: URL de YouTube del videoclip.
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
 * 02 — Social Media. Reels de Instagram en una rueda en abanico (reel-wheel) que gira sola;
 * la del centro reproduce un bucle mudo y, al pulsarla, se abre en grande con sonido.
 *
 * Para cambiar o añadir un reel:
 *   1. Copia el vídeo a videos-src/ con un id (p. ej. videos-src/reel-04.mp4).
 *   2. Añádelo aquí: `video` → el id; `highlight` → el segundo para el póster;
 *      `loops` → dónde empiezan los tramos de 15 s de las tarjetas (de 1 a 3, sin repetirse);
 *      `photo.src` → el mismo id; `instagramUrl` → el enlace de la publicación (sin ?…).
 *   3. Ejecuta `npm run videos` (comprime y saca el póster) y luego `npm run images`.
 */
export const SOCIAL_REELS: readonly SocialReel[] = [
  {
    id: 'reel-velada',
    title: 'Velada de Boxeo', // Pendiente: título del reel.
    context: 'Reel',
    year: null,
    video: 'reel-01',
    highlight: 5,
    loops: [5, 16], // 31 s: dos mitades
    photo: {
      src: 'reel-01',
      alt: 'Un boxeador con equipación rosa camina hacia el ring en una velada, rodeado de su equipo',
      width: 1080,
      height: 1920,
    },
    instagramUrl: 'https://www.instagram.com/reel/DfaUMQMInqZ/',
  },
  {
    id: 'reel-directo',
    title: 'Concierto', // Pendiente: título del reel.
    context: 'Reel',
    year: null,
    video: 'reel-02',
    highlight: 15,
    loops: [15, 40, 65], // 90 s: tres tramos distintos
    photo: {
      src: 'reel-02',
      alt: 'El artista canta con camiseta blanca sobre el escenario, junto a una bailarina y frente a una pantalla gigante',
      width: 1080,
      height: 1920,
    },
    instagramUrl: 'https://www.instagram.com/reel/DZdIrTXoAtc/',
  },
  {
    id: 'reel-combate',
    title: 'Velda de Boxeo', // Pendiente: título del reel.
    context: 'Reel',
    year: null,
    video: 'reel-03',
    highlight: 15,
    loops: [15, 0], // 31 s: el ring primero y luego el vestuario
    photo: {
      src: 'reel-03',
      alt: 'Un boxeador tatuado con equipación rosa y guantes rojos en guardia sobre el ring, junto al árbitro',
      width: 1080,
      height: 1920,
    },
    instagramUrl: 'https://www.instagram.com/reel/DfXwNWeoqZ_/',
  },
];

/*
 * 03 y 05 — Live. Dos composiciones panorámicas, una por artista. Van separadas por
 * los retratos: dos secuencias seguidas en B/N con el mismo mecanismo cansarían.
 * Se ven siempre enteras, en una tira que se recorre en horizontal.
 */
export const PHOTO_STORIES: readonly PhotoStory[] = [
  {
    id: 'conciertos', // ancla: el menú enlaza a #conciertos
    artist: 'AL SAFIR EN DIRECTO',
    category: 'Conciertos',
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
    id: 'boxeo', // ancla: el menú enlaza a #boxeo
    artist: 'COMBATE DE DOMÍNGUEZ SEVILLANO',
    category: 'Velada de boxeo',
    context: 'Boxeo',
    place: null, // Pendiente: ciudad o sala.
    year: null,
    photo: {
      src: 'composicion3',
      alt: 'velada de boxeo: varias imagenes de Dominguez Sevillano en su combate',
      width: 6480,
      height: 1350,
    },
  },
];

/*
 * 04 — Retrato. Respiración en color entre los dos directos. Una foto grande y el resto en
 * una columna de miniaturas; cada pocos segundos la primera miniatura pasa a ser la grande
 * (portraits). Funciona con 3 o más; está pensada para 4.
 * Las fotos verticales encajan mejor (la grande es casi 3:4 y las miniaturas casi 5:6).
 */
export const PORTRAITS_INTRO: SectionIntro = {
  // Solo se ve en escritorio, bajo el título «Retrato»: rellena la columna junto a las fotos.
  paragraphs: [
    'Congelar tu mirada en el momento adecuado.',
    'Trascender sin perder la esencia.',
    'No retrato caras, retrato actitud.',
  ],
  tags: ['Marcas de ropa', 'Artistas', 'Modelos', 'Productos'],
};

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
