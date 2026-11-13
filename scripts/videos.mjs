/*
 * Comprime los reels que usa la Home y saca su póster.
 *
 *   videos-src/{id}.mp4  →  public/videos/{id}.mp4        720 px de ancho, con sonido (se ve en grande)
 *                        →  public/videos/{id}-loop-{n}.mp4  un tramo de 15 s por cada `loops` (tarjetas)
 *                        →  images-src/{id}.jpg           fotograma en `highlight` (después: npm run images)
 *
 * Lee src/app/data/home.data.ts (Node ejecuta TypeScript sin compilar) para saber qué
 * reels se usan. Si una salida es más reciente que su original, no se vuelve a generar
 * (usa --force para rehacerlo todo).
 *
 * Uso: npm run videos   (y después: npm run images)
 */
import { execFile } from 'node:child_process';
import { mkdir, readdir, rm, stat } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { promisify } from 'node:util';
import ffmpeg from 'ffmpeg-static';
import { SOCIAL_REELS } from '../src/app/data/home.data.ts';

const run = promisify(execFile);
const SRC_DIR = 'videos-src';
const OUT_DIR = 'public/videos';
const POSTER_DIR = 'images-src';
/** Largo del bucle de las tarjetas: da para desfasar las copias del mismo reel. */
const LOOP_SECONDS = 15;
const INPUT_EXTENSIONS = new Set(['.mp4', '.mov', '.m4v', '.webm', '.mkv']);
const force = process.argv.includes('--force');

await mkdir(OUT_DIR, { recursive: true });

/* --- Originales ----------------------------------------------------------- */

const originals = new Map(); // id → archivo
for (const file of await readdir(SRC_DIR)) {
  if (INPUT_EXTENSIONS.has(extname(file).toLowerCase())) originals.set(basename(file, extname(file)), join(SRC_DIR, file));
}

const missing = SOCIAL_REELS.filter((reel) => !originals.has(reel.video)).map((reel) => reel.video);
if (missing.length > 0) {
  console.error(`Faltan originales en ${SRC_DIR}/ para: ${missing.join(', ')}`);
  process.exit(1);
}

/* --- Generación ----------------------------------------------------------- */

const mtime = async (path) => (await stat(path).catch(() => null))?.mtimeMs ?? 0;
const kb = async (path) => Math.round((await stat(path)).size / 1024);

async function make(output, input, args) {
  if (!force && (await mtime(output)) > (await mtime(input))) return false;
  await run(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', ...args, output], { maxBuffer: 1 << 26 });
  return true;
}

const report = [];
for (const reel of SOCIAL_REELS) {
  const input = originals.get(reel.video);
  const full = join(OUT_DIR, `${reel.video}.mp4`);
  const poster = join(POSTER_DIR, `${reel.video}.jpg`);
  const h264 = ['-c:v', 'libx264', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-movflags', '+faststart'];

  // Con sonido, para verlo en grande: 720 px de ancho bastan para una pantalla vertical. La tasa
  // máxima (≈1,2 Mb/s) mantiene un reel de 90 s en unos 12 MB.
  await make(full, input, [
    '-i', input, '-vf', 'scale=720:-2', ...h264,
    '-crf', '27', '-maxrate', '1200k', '-bufsize', '2400k', '-c:a', 'aac', '-b:a', '128k',
  ]);
  // Tramos de las tarjetas: pequeños y con sonido (suena bajito al pasar el ratón por la central).
  const loopKB = [];
  for (const [n, start] of reel.loops.entries()) {
    const loop = join(OUT_DIR, `${reel.video}-loop-${n + 1}.mp4`);
    await make(loop, input, [
      '-ss', String(start), '-t', String(LOOP_SECONDS), '-i', input,
      '-vf', 'scale=480:-2', ...h264, '-crf', '30', '-maxrate', '900k', '-bufsize', '1800k',
      '-c:a', 'aac', '-b:a', '96k',
    ]);
    loopKB.push(await kb(loop));
  }
  // Póster a tamaño completo: npm run images genera sus variantes webp.
  await make(poster, input, ['-ss', String(reel.highlight), '-i', input, '-frames:v', '1', '-q:v', '2']);

  report.push({ id: reel.video, 'vídeo KB': await kb(full), 'tramos KB': loopKB.join(' + '), póster: poster });
}

// Borra lo que ya no se usa: reels quitados y tramos sobrantes (o del formato anterior).
const used = new Set(
  SOCIAL_REELS.flatMap((reel) => [`${reel.video}.mp4`, ...reel.loops.map((_, n) => `${reel.video}-loop-${n + 1}.mp4`)]),
);
for (const file of await readdir(OUT_DIR)) {
  if (!used.has(file)) await rm(join(OUT_DIR, file));
}

console.table(report);
console.log('Ahora ejecuta `npm run images` para publicar los pósters.');
