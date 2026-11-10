import { IMAGE_LOADER } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { Photo } from '../../../models/photo';
import { photoLoader } from '../../../shared/image-loader';
import { ArchiveReel } from './archive-reel';

const CARDS: readonly Photo[] = Array.from({ length: 10 }, (_, i) => ({
  src: `images/placeholders/foto-0${(i % 8) + 1}.svg`,
  alt: `Foto ${i + 1}`,
  width: 1600,
  height: 2000,
}));

describe('ArchiveReel', () => {
  let reducedMotion = false;

  beforeAll(() => {
    // jsdom no implementa estas APIs del navegador. La sección se da por visible de inmediato.
    globalThis.IntersectionObserver = class {
      constructor(private readonly callback: IntersectionObserverCallback) {}
      observe() {
        this.callback([{ isIntersecting: true } as IntersectionObserverEntry], this as never);
      }
      disconnect() {}
    } as unknown as typeof IntersectionObserver;
    window.matchMedia = (() => ({
      matches: reducedMotion,
      addEventListener() {},
      removeEventListener() {},
    })) as unknown as typeof window.matchMedia;
  });

  beforeEach(() => {
    reducedMotion = false;
    vi.useFakeTimers();
  });

  afterEach(() => vi.useRealTimers());

  async function render() {
    TestBed.configureTestingModule({
      imports: [ArchiveReel],
      providers: [{ provide: IMAGE_LOADER, useValue: photoLoader }],
    });
    const fixture = TestBed.createComponent(ArchiveReel);
    fixture.componentRef.setInput('cards', CARDS);
    fixture.componentRef.setInput('chapter', '05');
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const slots = () => [...element.querySelectorAll<HTMLElement>('.reel-card')].map((c) => c.dataset['slot']);
    return { fixture, element, slots };
  }

  it('reparte las tarjetas por la diagonal: entrante, siguiente, enfocada y montón', async () => {
    const { slots } = await render();

    expect(slots()).toEqual(['0', '1', '2', 'rest', 'rest', '-5', '-4', '-3', '-2', '-1']);
  });

  it('avanza una posición en cada paso', async () => {
    const { fixture, element, slots } = await render();

    vi.advanceTimersByTime(1500);
    fixture.detectChanges();

    expect(slots()).toEqual(['-1', '0', '1', '2', 'rest', 'rest', '-5', '-4', '-3', '-2']);
    expect(element.querySelector('.reel-count')?.textContent?.trim()).toBe('02 / 10');
  });

  it('el botón pausa la animación', async () => {
    const { fixture, element, slots } = await render();
    const toggle = element.querySelector<HTMLButtonElement>('.reel-toggle')!;

    expect(toggle.textContent?.trim()).toBe('Pausar la animación');
    toggle.click();
    fixture.detectChanges();
    vi.advanceTimersByTime(3000);
    fixture.detectChanges();

    expect(toggle.textContent?.trim()).toBe('Reproducir la animación');
    expect(slots()[0]).toBe('0');
  });

  it('con movimiento reducido queda quieta y sin botón', async () => {
    reducedMotion = true;
    const { fixture, element, slots } = await render();

    vi.advanceTimersByTime(3000);
    fixture.detectChanges();

    expect(slots()[0]).toBe('0');
    expect(element.querySelector('.reel-toggle')).toBeNull();
  });
});
