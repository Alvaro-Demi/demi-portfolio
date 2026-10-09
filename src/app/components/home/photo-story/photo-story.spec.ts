import { IMAGE_LOADER } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { PhotoStory as Story } from '../../../models/photo';
import { photoLoader } from '../../../shared/image-loader';
import { PhotoStory } from './photo-story';

const STORY: Story = {
  id: 'live-test',
  artist: 'Artista',
  context: 'Live',
  place: null,
  year: 2026,
  photo: { src: 'test', alt: 'Secuencia de prueba', width: 1000, height: 100 },
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

  it('muestra la composición entera en una sola tira, sin partirla', async () => {
    const element = await render();

    expect(element.querySelectorAll('.story-strip img').length).toBe(1);
    expect(element.querySelector('.story-progress span')).not.toBeNull();
  });

  it('sin el efecto activo, la tira es una región con scroll accesible por teclado', async () => {
    const element = await render();
    const region = element.querySelector('.story-window');

    expect(region?.getAttribute('role')).toBe('region');
    expect(region?.getAttribute('tabindex')).toBe('0');
    expect(element.querySelector('.story-meta')?.textContent).toBe('Live / 2026');
  });
});
