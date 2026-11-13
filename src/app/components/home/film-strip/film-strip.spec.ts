import { IMAGE_LOADER } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { SequenceFrame } from '../../../models/photo';
import { photoLoader } from '../../../shared/image-loader';
import { layoutStrip } from './film-layout';
import { FilmStrip } from './film-strip';

/** Mezcla de horizontales y verticales, como la secuencia real. */
const FRAMES: readonly SequenceFrame[] = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({
  src: `images/placeholders/foto-0${n}.svg`,
  alt: `Foto ${n}`,
  width: n % 2 ? 1600 : 900,
  height: n % 2 ? 1200 : 1600,
}));

describe('layoutStrip', () => {
  it('repite la secuencia alrededor del anillo hasta tener un radio amplio', () => {
    const { cards, radius, period } = layoutStrip(FRAMES);
    const copies = cards.length / FRAMES.length;

    expect(Number.isInteger(copies)).toBe(true);
    expect(copies).toBeGreaterThanOrEqual(2);
    expect(radius).toBeGreaterThanOrEqual(3.6);
    expect(period).toBeCloseTo(360 / copies);
  });

  it('coloca las fotos en orden, sin solaparse, y cierra la vuelta', () => {
    const { cards, radius } = layoutStrip(FRAMES);
    const toDegrees = 180 / Math.PI / radius;

    for (let i = 1; i < cards.length; i++) {
      const gap = cards[i].angle - cards[i - 1].angle;
      expect(gap).toBeCloseTo(((cards[i].width + cards[i - 1].width) / 2) * toDegrees);
    }
    const last = cards[cards.length - 1];
    expect(last.angle + (last.width / 2) * toDegrees).toBeCloseTo(360);
  });

  it('las verticales son más estrechas que las horizontales', () => {
    const { cards } = layoutStrip(FRAMES);
    expect(cards[1].width).toBeLessThan(cards[0].width);
  });
});

describe('FilmStrip', () => {
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

  /** Frames pendientes: el test los ejecuta a mano con `flushFrames`. */
  let frameQueue: FrameRequestCallback[] = [];
  let clock = 0;

  function flushFrames(count: number) {
    for (let i = 0; i < count; i++) {
      const callbacks = frameQueue;
      frameQueue = [];
      clock += 16;
      callbacks.forEach((callback) => callback(clock));
    }
  }

  beforeEach(() => {
    reducedMotion = false;
    frameQueue = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => frameQueue.push(callback));
    vi.stubGlobal('cancelAnimationFrame', () => {});
  });

  afterEach(() => vi.unstubAllGlobals());

  const spin = (element: HTMLElement) =>
    element.querySelector<HTMLElement>('.film-ring')!.style.getPropertyValue('--spin');

  async function render() {
    TestBed.configureTestingModule({
      imports: [FilmStrip],
      providers: [{ provide: IMAGE_LOADER, useValue: photoLoader }],
    });
    const fixture = TestBed.createComponent(FilmStrip);
    fixture.componentRef.setInput('frames', FRAMES);
    fixture.componentRef.setInput('chapter', '02');
    await fixture.whenStable();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  }

  it('monta la secuencia repetida; solo la primera vuelta llega a lectores de pantalla', async () => {
    const { element } = await render();
    const frames = element.querySelectorAll('.film-frame');
    const announced = element.querySelectorAll('.film-frame:not([aria-hidden]) img');

    expect(frames.length).toBe(layoutStrip(FRAMES).cards.length);
    expect([...announced].map((img) => img.getAttribute('alt'))).toEqual(FRAMES.map((f) => f.alt));
  });

  it('gira la tira hacia la izquierda en cada frame', async () => {
    const { element } = await render();

    flushFrames(3);
    const first = parseFloat(spin(element));
    flushFrames(3);

    expect(first).toBeLessThan(0);
    expect(parseFloat(spin(element))).toBeLessThan(first);
  });

  it('al pausar, la tira frena hasta pararse', async () => {
    const { fixture, element } = await render();
    const toggle = element.querySelector<HTMLButtonElement>('.film-toggle')!;

    expect(toggle.textContent?.trim()).toBe('Pausar la tira de fotos');
    toggle.click();
    await fixture.whenStable();
    expect(toggle.textContent?.trim()).toBe('Reproducir la tira de fotos');

    flushFrames(300); // ~5 s: la frenada ya ha terminado
    const stopped = spin(element);
    flushFrames(10);
    expect(spin(element)).toBe(stopped);
  });

  /** jsdom no tiene PointerEvent: un MouseEvent con el mismo nombre trae clientX y timeStamp. */
  const pointer = (type: string, clientX: number) => new MouseEvent(type, { clientX, bubbles: true });

  it('arrastrar mueve la tira con el gesto, en su sentido', async () => {
    const { element } = await render();
    const stage = element.querySelector<HTMLElement>('.film-stage')!;
    flushFrames(2);
    const before = parseFloat(spin(element));

    stage.dispatchEvent(pointer('pointerdown', 300));
    expect(stage.hasAttribute('data-dragging')).toBe(true);
    stage.dispatchEvent(pointer('pointermove', 240)); // hacia la izquierda
    const dragged = parseFloat(spin(element));
    flushFrames(5); // mientras se arrastra, la tira no avanza sola
    expect(parseFloat(spin(element))).toBe(dragged);
    stage.dispatchEvent(pointer('pointerup', 240));

    expect(dragged).toBeLessThan(before);
    expect(stage.hasAttribute('data-dragging')).toBe(false);
  });

  it('muestra el número de capítulo en la cabecera', async () => {
    const { element } = await render();
    expect(element.querySelector('.eyebrow')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('02 — Backstage');
  });

  it('con movimiento reducido no anima ni muestra el botón', async () => {
    reducedMotion = true;
    const { element } = await render();

    flushFrames(5);
    expect(spin(element)).toBe('');
    expect(element.querySelector('.film-toggle')).toBeNull();
  });
});
