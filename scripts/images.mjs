/*
 * Genera las variantes responsive de las fotografías que usa la Home.
 *
 *   images-src/{id}.{jpg,png,…}  →  public/images/photos/{id}-{ancho}.webp
 *
 * Lee src/app/data/home.data.ts (Node ejecuta TypeScript sin compilar) para saber qué
 * fotos se usan: los originales que no aparecen ahí no se publican.
 * Los anchos vienen de src/app/shared/image-loader.ts, el mismo archivo que usa Angular.
 *
 * Uso: npm run images
 */
import { mkdir, readdir, rm } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import sharp from 'sharp';
import * as data from '../src/app/data/home.data.ts';
import { PANORAMA_MIN_RATIO, PANORAMA_WIDTHS, PHOTO_WIDTHS } from '../src/app/shared/image-loader.ts';

const SRC_DIR = 'images-src';
const OUT_DIR = 'public/images/photos';
const QUALITY = 78;
const INPUT_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.tif', '.tiff', '.webp', '.avif', '.svg']);

/* --- Qué hay que generar, según home.data.ts ------------------------------ */

const photos = new Map(); // id → Photo

(function collect(value) {
  if (Array.isArray(value)) return value.forEach(collect);
  if (value === null || typeof value !== 'object') return;
  if (typeof value.src === 'string' && typeof value.width === 'number' && typeof value.alt === 'string') {
    photos.set(value.src, value);
  }
  Object.values(value).forEach(collect);
})(Object.values(data));

/* --- Originales ----------------------------------------------------------- */

await mkdir(OUT_DIR, { recursive: true });

const originals = new Map(); // id → archivo
for (const file of await readdir(SRC_DIR)) {
  if (!INPUT_EXTENSIONS.has(extname(file).toLowerCase())) continue;
  const id = basename(file, extname(file));
  if (originals.has(id)) {
    console.error(`El id "${id}" está repetido en ${SRC_DIR}/ (dos archivos con el mismo nombre).`);
    process.exit(1);
  }
  originals.set(id, join(SRC_DIR, file));
}

const missing = [...photos.keys()].filter((id) => !originals.has(id));
if (missing.length > 0) {
  console.error(`Faltan originales en ${SRC_DIR}/ para: ${missing.join(', ')}`);
  process.exit(1);
}

const unused = [...originals.keys()].filter((id) => !photos.has(id));

/* --- Generación ----------------------------------------------------------- */

const published = new Set();
const report = [];

async function writeVariants(id, pipeline, widths) {
  let bytes = 0;
  for (const w of widths) {
    // withoutEnlargement: si el original es más estrecho, se guarda a su tamaño
    // con el mismo nombre, así el loader nunca pide un archivo inexistente.
    const { size } = await pipeline()
      .resize({ width: w, withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(join(OUT_DIR, `${id}-${w}.webp`));
    bytes += size;
  }
  published.add(id);
  return Math.round(bytes / 1024);
}

for (const [id, photo] of photos) {
  const input = originals.get(id);
  // rotate() aplica la orientación EXIF de las fotos de cámara antes de redimensionar.
  const { info } = await sharp(input).rotate().toBuffer({ resolveWithObject: true });
  const panorama = info.width / info.height >= PANORAMA_MIN_RATIO;
  const widths = panorama ? [...PHOTO_WIDTHS, ...PANORAMA_WIDTHS] : [...PHOTO_WIDTHS];
  const kb = await writeVariants(id, () => sharp(input).rotate(), widths);

  const mismatch = info.width !== photo.width || info.height !== photo.height;
  report.push({
    id,
    width: info.width,
    height: info.height,
    KB: kb,
    aviso: mismatch ? `home.data.ts dice ${photo.width}×${photo.height}` : '',
  });
}

// Borra variantes de fotos que ya no se usan.
const pattern = /^(.+)-(\d+)\.webp$/;
for (const file of await readdir(OUT_DIR)) {
  const match = pattern.exec(file);
  if (match && !published.has(match[1])) await rm(join(OUT_DIR, file));
}

console.log('Copia width y height a src/app/data/home.data.ts:');
console.table(report);
if (unused.length > 0) {
  console.log(`Sin usar en home.data.ts (no se publican): ${unused.join(', ')}`);
}
