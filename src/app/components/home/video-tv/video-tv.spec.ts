import { IMAGE_LOADER } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { WorkEntry } from '../../../models/photo';
import { photoLoader } from '../../../shared/image-loader';
import { VideoTv } from './video-tv';

const ENTRY: WorkEntry = {
  id: 'mirame',
  artist: 'Artista',
  title: 'Mírame',
  context: 'Videoclip',
  type: 'video',
  year: 2026,
  youtubeUrl: 'https://www.youtube.com/watch?v=x-do0kjojXc&list=RDx-do0kjojXc',
  photo: { src: 'images/placeholders/foto-01.svg', alt: 'Portada', width: 2000, height: 1000 },
};

describe('VideoTv', () => {
  beforeAll(() => {
    window.matchMedia ??= (() => ({
      matches: false,
      addEventListener() {},
      removeEventListener() {},
    })) as unknown as typeof window.matchMedia;
  });

  async function render() {
    TestBed.configureTestingModule({
      imports: [VideoTv],
      providers: [{ provide: IMAGE_LOADER, useValue: photoLoader }],
    });
    const fixture = TestBed.createComponent(VideoTv);
    fixture.componentRef.setInput('entry', ENTRY);
    fixture.componentRef.setInput('video', { id: 'x-do0kjojXc', start: 0 });
    fixture.componentRef.setInput('origin', () => null);
    const events: string[] = [];
    fixture.componentInstance.closing.subscribe(() => events.push('closing'));
    fixture.componentInstance.closed.subscribe(() => events.push('closed'));
    await fixture.whenStable();
    return { fixture, element: fixture.nativeElement as HTMLElement, events };
  }

  it('es un diálogo modal con nombre: el título del videoclip', async () => {
    const { element } = await render();
    const dialog = element.querySelector('dialog')!;
    const labelledBy = dialog.getAttribute('aria-labelledby')!;

    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(element.querySelector(`#${labelledBy}`)?.textContent?.trim()).toBe('Mírame');
    expect(element.querySelector('.tv-close')?.getAttribute('aria-label')).toBe('Cerrar el videoclip');
  });

  it('reproduce el vídeo de la URL en la inserción sin cookies y con título', async () => {
    const { element } = await render();
    const frame = element.querySelector('iframe')!;
    const src = new URL(frame.src);

    expect(src.origin).toBe('https://www.youtube-nocookie.com');
    expect(src.pathname).toBe('/embed/x-do0kjojXc');
    expect(src.searchParams.get('autoplay')).toBe('1');
    expect(frame.title).toBe('Videoclip: Mírame');
    expect(element.querySelector('.tv-link')?.getAttribute('href')).toBe('https://www.youtube.com/watch?v=x-do0kjojXc');
  });

  it('al cerrar quita el reproductor (corta el sonido) y avisa', async () => {
    const { fixture, element, events } = await render();

    element.querySelector<HTMLButtonElement>('.tv-close')!.click();
    await fixture.whenStable();

    expect(element.querySelector('iframe')).toBeNull();
    expect(events).toEqual(['closing', 'closed']);
  });

  it('Escape cierra con la transición propia, no en seco', async () => {
    const { fixture, element, events } = await render();
    const cancel = new Event('cancel', { cancelable: true });

    element.querySelector('dialog')!.dispatchEvent(cancel);
    await fixture.whenStable();

    expect(cancel.defaultPrevented).toBe(true);
    expect(events).toEqual(['closing', 'closed']);
  });

  it('un clic fuera de la tele la cierra', async () => {
    const { fixture, element, events } = await render();

    element.querySelector<HTMLElement>('.tv-backdrop')!.click();
    await fixture.whenStable();

    expect(events).toEqual(['closing', 'closed']);
  });

  it('bloquea el scroll del documento mientras está abierta', async () => {
    const { fixture, element } = await render();

    expect(document.documentElement.style.overflow).toBe('hidden');
    element.querySelector<HTMLButtonElement>('.tv-close')!.click();
    await fixture.whenStable();
    expect(document.documentElement.style.overflow).toBe('');
  });
});
