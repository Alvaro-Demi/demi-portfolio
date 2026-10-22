import { IMAGE_LOADER } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { SequenceFrame } from '../../../models/photo';
import { photoLoader } from '../../../shared/image-loader';
import { Interlude } from './interlude';

const FRAMES: readonly SequenceFrame[] = [1, 2, 3, 4, 5].map((n) => ({
  src: `images/placeholders/foto-0${n}.svg`,
  alt: `Foto ${n}`,
  width: 1600,
  height: 900,
}));

describe('Interlude', () => {
  beforeAll(() => {
    // jsdom no implementa estas APIs del navegador. La sección se da por visible de inmediato,
    // que es cuando se montan las fotos.
    globalThis.IntersectionObserver = class {
      constructor(private readonly callback: IntersectionObserverCallback) {}
      observe() {
        this.callback([{ isIntersecting: true } as IntersectionObserverEntry], this as never);
      }
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
      imports: [Interlude],
      providers: [{ provide: IMAGE_LOADER, useValue: photoLoader }],
    });
    const fixture = TestBed.createComponent(Interlude);
    fixture.componentRef.setInput('frames', FRAMES);
    await fixture.whenStable();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  }

  const states = (element: HTMLElement) =>
    [...element.querySelectorAll<HTMLElement>('.sequence-slide')].map((s) => s.dataset['state']);

  it('solo monta la foto activa y la siguiente, y un segmento por foto', async () => {
    const { element } = await render();

    expect(states(element)).toEqual(['active', 'next']);
    expect(element.querySelectorAll('.sequence-step').length).toBe(5);
    expect(element.querySelector('.sequence-count')?.textContent?.trim()).toBe('01 / 05');
  });

  it('al elegir una foto pasa a ella con el wipe y la anuncia', async () => {
    const { fixture, element } = await render();

    element.querySelectorAll<HTMLButtonElement>('.sequence-step')[1].click();
    await fixture.whenStable();

    expect(states(element)).toEqual(['leaving', 'active', 'next']);
    expect(element.querySelectorAll('.sequence-step')[1].getAttribute('aria-current')).toBe('true');
    expect(element.querySelector('[aria-live]')?.textContent).toContain('Foto 2 de 5');
  });

  it('el botón alterna entre pausar y reproducir', async () => {
    const { fixture, element } = await render();
    const toggle = element.querySelector<HTMLButtonElement>('.sequence-toggle')!;

    expect(toggle.textContent?.trim()).toBe('Pausar');
    toggle.click();
    await fixture.whenStable();
    expect(toggle.textContent?.trim()).toBe('Reproducir');
  });
});
