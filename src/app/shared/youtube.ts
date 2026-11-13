/** Un vídeo de YouTube listo para insertar: su id y, si la URL lo indica, el segundo de inicio. */
export interface YoutubeVideo {
  readonly id: string;
  readonly start: number;
}

/** Origen del reproductor sin cookies: no guarda nada hasta que se reproduce. */
export const YOUTUBE_EMBED_ORIGIN = 'https://www.youtube-nocookie.com';

const ID = /^[\w-]{11}$/;
const HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com']);

/**
 * Lee una URL de YouTube (watch?v=, youtu.be/, /embed/, /shorts/, /live/) y devuelve su vídeo.
 * Ignora el resto de parámetros (listas, radio…). `null` si no es un vídeo de YouTube válido.
 */
export function parseYoutubeUrl(url: string | null): YoutubeVideo | null {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const [first, second] = parsed.pathname.split('/').filter(Boolean);
  let id: string | null | undefined;
  if (parsed.hostname === 'youtu.be') {
    id = first;
  } else if (HOSTS.has(parsed.hostname)) {
    id = first === 'watch' ? parsed.searchParams.get('v') : ['embed', 'shorts', 'live', 'v'].includes(first ?? '') ? second : null;
  }
  if (!id || !ID.test(id)) return null;

  return { id, start: parseStart(parsed.searchParams.get('t') ?? parsed.searchParams.get('start')) };
}

/** '90', '90s' o '1m30s' → 90. */
function parseStart(value: string | null): number {
  if (!value) return 0;
  if (/^\d+$/.test(value)) return Number(value);
  const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(value);
  if (!match) return 0;
  const [, h = '0', m = '0', s = '0'] = match;
  return Number(h) * 3600 + Number(m) * 60 + Number(s);
}

/**
 * URL de inserción para reproducir dentro de la web: arranca sola (tras el clic del usuario),
 * en línea en iOS, sin vídeos sugeridos de otros canales y con la API de mensajes activa
 * (así la web sabe si el vídeo no admite inserción).
 */
export function youtubeEmbedUrl(video: YoutubeVideo, origin: string): string {
  const params = new URLSearchParams({
    autoplay: '1',
    playsinline: '1',
    rel: '0',
    modestbranding: '1',
    iv_load_policy: '3',
    enablejsapi: '1',
    origin,
  });
  if (video.start) params.set('start', String(video.start));
  return `${YOUTUBE_EMBED_ORIGIN}/embed/${video.id}?${params}`;
}

/** URL de YouTube para verlo allí (enlace de respaldo). */
export function youtubeWatchUrl(video: YoutubeVideo): string {
  return `https://www.youtube.com/watch?v=${video.id}${video.start ? `&t=${video.start}s` : ''}`;
}
