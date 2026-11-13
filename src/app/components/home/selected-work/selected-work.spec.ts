import { IMAGE_LOADER } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { WorkEntry } from '../../../models/photo';
import { photoLoader } from '../../../shared/image-loader';
import { SelectedWork } from './selected-work';

const ENTRIES: readonly WorkEntry[] = [
  {
    id: 'clip',
    artist: 'Artista',
    title: 'Clip',
    context: 'Videoclip',
    type: 'video',
    year: 2025,
    youtubeUrl: 'https://www.youtube.com/watch?v=test',
    photo: { src: 'images/placeholders/foto-01.svg', alt: 'Portada', width: 1600, height: 900 },
  },
];

describe('SelectedWork', () => {
  beforeAll(() => {
    // jsdom no implementa IntersectionObserver (lo usan appReveal y la cinta).
    globalThis.IntersectionObserver ??= class {
      observe() {}
      disconnect() {}
    } as unknown as typeof IntersectionObserver;
    window.matchMedia ??= (() => ({
      matches: false,
      addEventListener() {},
      removeEventListener() {},
    })) as unknown as typeof window.matchMedia;
  });

  it('presenta la sección y le pasa los videoclips a la cinta', async () => {
    TestBed.configureTestingModule({
      imports: [SelectedWork],
      providers: [{ provide: IMAGE_LOADER, useValue: photoLoader }],
    });
    const fixture = TestBed.createComponent(SelectedWork);
    fixture.componentRef.setInput('entries', ENTRIES);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('#work-title')?.textContent?.trim()).toBe('Videoclips');
    expect(element.querySelector('app-video-ribbon')).not.toBeNull();
    expect(element.querySelector('.rib-count')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('01 / 01');
  });
});
