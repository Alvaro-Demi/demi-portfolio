import { IMAGE_LOADER } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { Photo } from '../../../models/photo';
import { photoLoader } from '../../../shared/image-loader';
import { TvMedia, VideoTv } from './video-tv';

const POSTER: Photo = { src: 'images/placeholders/foto-01.svg', alt: 'Portada', width: 2000, height: 1000 };
const YOUTUBE: TvMedia = { kind: 'youtube', video: { id: 'x-do0kjojXc', start: 0 } };
const FILE: TvMedia = {
  kind: 'file',
  src: 'videos/reel-01.mp4',
  ratio: 9 / 16,
  link: { label: 'Instagram', url: 'https://www.instagram.com/reel/DfaUMQMInqZ/' },
};

describe('VideoTv', () => {
  beforeAll(() => {
    window.matchMedia ??= (() => ({
      matches: false,
      addEventListener() {},
      removeEventListener() {},
    })) as unknown as typeof window.matchMedia;
  });

  async function render(media: TvMedia = YOUTUBE) {
    TestBed.configureTestingModule({
      imports: [VideoTv],
      providers: [{ provide: IMAGE_LOADER, useValue: photoLoader }],
    });
    const fixture = TestBed.createComponent(VideoTv);
    fixture.componentRef.setInput('heading', 'Mírame');
    fixture.componentRef.setInput('meta', 'Videoclip · 2026');
    fixture.componentRef.setInput('poster', POSTER);
    fixture.componentRef.setInput('posterSizes', '100vw');
    fixture.componentRef.setInput('media', media);
    fixture.componentRef.setInput('origin', () => null);
    const events: string[] = [];
    fixture.componentInstance.closing.subscribe(() => events.push('closing'));
    fixture.componentInstance.closed.subscribe(() => events.push('closed'));
    await fixture.whenStable();
    return { fixture, element: fixture.nativeElement as HTMLElement, events };
  }

  it('es un diálogo modal con nombre: el título del vídeo', async () => {
    const { element } = await render();
    const dialog = element.querySelector('dialog')!;
    const labelledBy = dialog.getAttribute('aria-labelledby')!;

    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(element.querySelector(`#${labelledBy}`)?.textContent?.trim()).toBe('Mírame');
    expect(element.querySelector('.tv-close')?.getAttribute('aria-label')).toBe('Cerrar el vídeo');
  });

  it('YouTube: reproduce el vídeo en la inserción sin cookies, con título y enlace a YouTube', async () => {
    const { element } = await render();
    const frame = element.querySelector('iframe')!;
    const src = new URL(frame.src);

    expect(src.origin).toBe('https://www.youtube-nocookie.com');
    expect(src.pathname).toBe('/embed/x-do0kjojXc');
    expect(src.searchParams.get('autoplay')).toBe('1');
    expect(frame.title).toBe('Videoclip: Mírame');
    expect(element.querySelector('video')).toBeNull();
    expect(element.querySelector('.tv-link')?.getAttribute('href')).toBe('https://www.youtube.com/watch?v=x-do0kjojXc');
    expect(element.querySelector('.tv-link')?.textContent).toContain('YouTube');
  });

  it('vídeo propio: <video> con controles, pantalla vertical y enlace a su plataforma', async () => {
    const { element } = await render(FILE);
    const video = element.querySelector('video')!;
    const tv = element.querySelector<HTMLElement>('.tv')!;

    expect(element.querySelector('iframe')).toBeNull();
    expect(video.getAttribute('src')).toBe('videos/reel-01.mp4');
    expect(video.controls).toBe(true);
    expect(video.getAttribute('aria-label')).toBe('Reel: Mírame');
    expect(tv.classList.contains('is-portrait')).toBe(true);
    expect(Number(tv.style.getPropertyValue('--screen-ratio'))).toBeCloseTo(9 / 16);
    expect(element.querySelector('.tv-link')?.getAttribute('href')).toBe('https://www.instagram.com/reel/DfaUMQMInqZ/');
    expect(element.querySelector('.tv-link')?.textContent).toContain('Instagram');
  });

  it('al cerrar quita el reproductor (corta el sonido) y avisa', async () => {
    const { fixture, element, events } = await render(FILE);

    element.querySelector<HTMLButtonElement>('.tv-close')!.click();
    await fixture.whenStable();

    expect(element.querySelector('video')).toBeNull();
    expect(events).toEqual(['closing', 'closed']);
  });

  it('Escape cierra con la transición propia, no en seco', async () => {
    const { fixture, element, events } = await render();
    const cancel = new Event('cancel', { cancelable: true });

    element.querySelector('dialog')!.dispatchEvent(cancel);
    await fixture.whenStable();

    expect(cancel.defaultPrevented).toBe(true);
    expect(element.querySelector('iframe')).toBeNull();
    expect(events).toEqual(['closing', 'closed']);
  });

  it('un clic fuera de la tele la cierra', async () => {
    const { fixture, element, events } = await render();

    element.querySelector<HTMLElement>('.tv-backdrop')!.click();
    await fixture.whenStable();

    expect(events).toEqual(['closing', 'closed']);
  });

  it('si el vídeo propio falla, ofrece verlo en su plataforma', async () => {
    const { fixture, element } = await render(FILE);

    element.querySelector('video')!.dispatchEvent(new Event('error'));
    await fixture.whenStable();

    expect(element.querySelector('.tv-fallback a')?.getAttribute('href')).toBe('https://www.instagram.com/reel/DfaUMQMInqZ/');
  });

  it('bloquea el scroll del documento mientras está abierta', async () => {
    const { fixture, element } = await render();

    expect(document.documentElement.style.overflow).toBe('hidden');
    element.querySelector<HTMLButtonElement>('.tv-close')!.click();
    await fixture.whenStable();
    expect(document.documentElement.style.overflow).toBe('');
  });
});
