import { IMAGE_LOADER } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { PhotoStory as Story } from '../../../models/photo';
import { photoLoader } from '../../../shared/image-loader';
import { PhotoStory } from './photo-story';

// Composición de 1000 × 100: un 10 % de ancho son 100 px → proporción 1:1.
const STORY: Story = {
  id: 'live-test',
  artist: 'Artista',
  context: 'Live',
  place: null,
  year: 2026,
  photo: { src: 'test', alt: 'Secuencia de prueba', width: 1000, height: 100 },
  crops: [
    { src: 'c1', left: 0, width: 10, alt: 'ancho' }, //  1:1   → a sangre
    { src: 'c2', left: 10, width: 6, alt: 'vertical' }, // 0,6 → vertical
    { src: 'c3', left: 20, width: 4, alt: 'estrecho 1' }, // 0,4 → estrecho
    { src: 'c4', left: 30, width: 4, alt: 'estrecho 2' }, // 0,4 → estrecho
  ],
};

describe('PhotoStory', () => {
  beforeAll(() => {
    // jsdom no implementa estas APIs del navegador; aquí basta con que existan.
    globalThis.IntersectionObserver ??= class {
      observe() {}
      disconnect() {}
    } as unknown as typeof IntersectionObserver;
    globalThis.ResizeObserver ??= class {
      observe() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
    window.matchMedia ??= (() => ({
      matches: false,
      addEventListener() {},
      removeEventListener() {},
    })) as unknown as typeof window.matchMedia;
  });

  async function render() {
    TestBed.configureTestingModule({
      imports: [PhotoStory],
      providers: [{ provide: IMAGE_LOADER, useValue: photoLoader }],
    });
    const fixture = TestBed.createComponent(PhotoStory);
    fixture.componentRef.setInput('story', STORY);
    fixture.componentRef.setInput('chapter', '02');
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('coloca los paneles de móvil según su forma y empareja los estrechos', async () => {
    const crops = [...(await render()).querySelectorAll<HTMLElement>('.story-crop')];

    expect(crops.map((c) => `${c.dataset['shape']}:${c.dataset['placement']}`)).toEqual([
      'full:full',
      'portrait:start',
      'tall:start',
      'tall:end',
    ]);
  });

  it('sin el efecto activo, la tira es una región con scroll accesible por teclado', async () => {
    const element = await render();
    const region = element.querySelector('.story-window');

    expect(region?.getAttribute('role')).toBe('region');
    expect(region?.getAttribute('tabindex')).toBe('0');
    expect(element.querySelector('.story-meta')?.textContent).toBe('Live / 2026');
  });
});
