import { IMAGE_LOADER } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { Portrait } from '../../../models/photo';
import { photoLoader } from '../../../shared/image-loader';
import { Portraits } from './portraits';

const ENTRIES: readonly Portrait[] = [1, 2, 3, 4].map((n) => ({
  id: `retrato-${n}`,
  artist: `Artista ${n}`,
  context: 'Sesión de fotos',
  year: n === 4 ? null : 2026,
  photo: { src: `images/placeholders/foto-0${n}.svg`, alt: `Retrato ${n}`, width: 1200, height: 1500 },
}));

describe('Portraits', () => {
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

  beforeEach(() => (reducedMotion = false));

  async function render() {
    TestBed.configureTestingModule({
      imports: [Portraits],
      providers: [{ provide: IMAGE_LOADER, useValue: photoLoader }],
    });
    const fixture = TestBed.createComponent(Portraits);
    fixture.componentRef.setInput('entries', ENTRIES);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const cards = () => [...element.querySelectorAll<HTMLElement>('.portraits-card')];
    const layout = () => cards().map((c) => (c.dataset['slot'] === 'main' ? 'main' : c.style.getPropertyValue('--k')));
    const caption = () => element.querySelector('.portraits-caption')?.textContent?.replace(/\s+/g, ' ').trim();
    return { fixture, element, cards, layout, caption };
  }

  it('el primero va en grande y el resto en la columna, en orden', async () => {
    const { layout, caption, element } = await render();

    expect(layout()).toEqual(['main', '0', '1', '2']);
    expect(caption()).toBe('Artista 1 Sesión de fotos · 2026');
    expect(element.querySelector('.portraits-count')?.textContent?.trim()).toBe('01 / 04');
  });

  it('al llenarse la línea, la primera miniatura pasa a grande y la grande al final', async () => {
    const { fixture, element, layout, caption } = await render();

    element.querySelector('.portraits-progress span')!.dispatchEvent(new Event('animationend'));
    await fixture.whenStable();

    expect(layout()).toEqual(['2', 'main', '0', '1']);
    expect(caption()).toBe('Artista 2 Sesión de fotos · 2026');
  });

  it('al pulsar una miniatura pasa a grande y se anuncia', async () => {
    const { fixture, element, cards, layout, caption } = await render();

    cards()[3].click();
    await fixture.whenStable();

    expect(layout()).toEqual(['0', '1', '2', 'main']);
    expect(cards()[3].getAttribute('aria-current')).toBe('true');
    expect(caption()).toBe('Artista 4 Sesión de fotos'); // sin año: no se inventa
    expect(element.querySelector('[aria-live]')?.textContent).toContain('Retrato 4 de 4');
  });

  it('el botón alterna entre pausar y reproducir', async () => {
    const { fixture, element } = await render();
    const toggle = element.querySelector<HTMLButtonElement>('.portraits-toggle')!;

    expect(element.querySelector('.portraits')!.hasAttribute('data-playing')).toBe(true);
    toggle.click();
    await fixture.whenStable();
    expect(toggle.textContent?.trim()).toBe('Reproducir los retratos');
    expect(element.querySelector('.portraits')!.hasAttribute('data-playing')).toBe(false);
  });

  it('con movimiento reducido no avanza solo ni muestra el botón', async () => {
    reducedMotion = true;
    const { element } = await render();

    expect(element.querySelector('.portraits')!.hasAttribute('data-playing')).toBe(false);
    expect(element.querySelector('.portraits-toggle')).toBeNull();
  });
});
