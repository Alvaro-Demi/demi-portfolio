import { parseYoutubeUrl, youtubeEmbedUrl, youtubeWatchUrl } from './youtube';

describe('parseYoutubeUrl', () => {
  it('lee el id de las formas habituales e ignora listas y radio', () => {
    const id = 'x-do0kjojXc';
    for (const url of [
      `https://www.youtube.com/watch?v=${id}&list=RD${id}&start_radio=1`,
      `https://youtube.com/watch?v=${id}`,
      `https://m.youtube.com/watch?v=${id}`,
      `https://youtu.be/${id}`,
      `https://www.youtube.com/embed/${id}`,
      `https://www.youtube.com/shorts/${id}`,
      `https://www.youtube-nocookie.com/embed/${id}`,
    ]) {
      expect(parseYoutubeUrl(url)).toEqual({ id, start: 0 });
    }
  });

  it('lee el segundo de inicio', () => {
    expect(parseYoutubeUrl('https://youtu.be/x-do0kjojXc?t=90')?.start).toBe(90);
    expect(parseYoutubeUrl('https://www.youtube.com/watch?v=x-do0kjojXc&t=1m30s')?.start).toBe(90);
  });

  it('rechaza lo que no es un vídeo de YouTube válido', () => {
    expect(parseYoutubeUrl(null)).toBeNull();
    expect(parseYoutubeUrl('')).toBeNull();
    expect(parseYoutubeUrl('no es una url')).toBeNull();
    expect(parseYoutubeUrl('https://www.youtube.com/watch?v=corto')).toBeNull();
    expect(parseYoutubeUrl('https://www.youtube.com/@canal')).toBeNull();
    expect(parseYoutubeUrl('https://evil.example/watch?v=x-do0kjojXc')).toBeNull();
    expect(parseYoutubeUrl('https://www.youtube.com/watch?v=x-do0kjojXc"><script>')).toBeNull();
  });
});

describe('youtubeEmbedUrl', () => {
  it('monta la inserción sin cookies, con autoplay, sin sugerencias ajenas y con la API de mensajes', () => {
    const url = new URL(youtubeEmbedUrl({ id: 'x-do0kjojXc', start: 12 }, 'https://demi.example'));

    expect(url.origin).toBe('https://www.youtube-nocookie.com');
    expect(url.pathname).toBe('/embed/x-do0kjojXc');
    expect(url.searchParams.get('autoplay')).toBe('1');
    expect(url.searchParams.get('rel')).toBe('0');
    expect(url.searchParams.get('playsinline')).toBe('1');
    expect(url.searchParams.get('enablejsapi')).toBe('1');
    expect(url.searchParams.get('origin')).toBe('https://demi.example');
    expect(url.searchParams.get('start')).toBe('12');
    expect(url.searchParams.has('list')).toBe(false);
  });

  it('enlace de respaldo a YouTube', () => {
    expect(youtubeWatchUrl({ id: 'x-do0kjojXc', start: 0 })).toBe('https://www.youtube.com/watch?v=x-do0kjojXc');
    expect(youtubeWatchUrl({ id: 'x-do0kjojXc', start: 30 })).toBe('https://www.youtube.com/watch?v=x-do0kjojXc&t=30s');
  });
});
