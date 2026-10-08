import { IMAGE_LOADER } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { WorkEntry } from '../../../models/photo';
import { photoLoader } from '../../../shared/image-loader';
import { SelectedWork } from './selected-work';

const photo = { src: 'test', alt: 'Foto de prueba', width: 1200, height: 800 };

const ENTRIES: readonly WorkEntry[] = [
  {
    id: 'foto',
    artist: 'Artista',
    title: null,
    context: 'Directo',
    type: 'photo',
    year: null,
    youtubeUrl: null,
    layout: 'screen',
    photo,
  },
  {
    id: 'clip-con-url',
    artist: 'Artista',
    title: 'Clip',
    context: 'Videoclip',
    type: 'video',
    year: 2025,
    youtubeUrl: 'https://www.youtube.com/watch?v=test',
    layout: 'screen',
    photo,
  },
  {
    id: 'clip-sin-url',
    artist: 'Artista',
    title: 'Pendiente',
    context: 'Videoclip',
    type: 'video',
    year: null,
    youtubeUrl: null,
    layout: 'coda',
    photo,
  },
];

describe('SelectedWork', () => {
  beforeAll(() => {
    // jsdom no implementa IntersectionObserver (lo usa la directiva appReveal).
    globalThis.IntersectionObserver ??= class {
      observe() {}
      disconnect() {}
    } as unknown as typeof IntersectionObserver;
  });

  async function render() {
    TestBed.configureTestingModule({
      imports: [SelectedWork],
      providers: [{ provide: IMAGE_LOADER, useValue: photoLoader }],
    });
    const fixture = TestBed.createComponent(SelectedWork);
    fixture.componentRef.setInput('entries', ENTRIES);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('solo enlaza los videoclips que tienen URL, en una pestaña nueva y segura', async () => {
    const links = (await render()).querySelectorAll<HTMLAnchorElement>('.work-link');

    expect(links.length).toBe(1);
    expect(links[0].href).toBe('https://www.youtube.com/watch?v=test');
    expect(links[0].target).toBe('_blank');
    expect(links[0].rel).toBe('noopener noreferrer');
    expect(links[0].textContent).toContain('«Clip»');
  });

  it('numera las piezas como un setlist y compone los metadatos sin huecos', async () => {
    const element = await render();
    const numbers = [...element.querySelectorAll('.work-index')].map((n) => n.textContent?.trim());
    const meta = [...element.querySelectorAll('.work-meta')].map((n) => n.textContent?.trim());

    expect(numbers).toEqual(['01', '02', '03']);
    expect(meta).toEqual(['Directo', 'Videoclip · 2025', 'Videoclip']);
  });
});
