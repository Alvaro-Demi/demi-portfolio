import { IMAGE_LOADER } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { WorkEntry } from '../../../models/photo';
import { photoLoader } from '../../../shared/image-loader';
import { COPIES, layoutRibbon, wrap } from './ribbon-layout';
import { VideoRibbon } from './video-ribbon';

const entry = (id: string, title: string | null, youtubeUrl: string | null, width = 2000): WorkEntry => ({
  id,
  artist: 'Artista',
  title,
  context: 'Videoclip',
  type: 'video',
  year: title ? 2026 : null,
  youtubeUrl,
  photo: { src: 'images/placeholders/foto-01.svg', alt: 'Portada', width, height: 1000 },
});

const ENTRIES: readonly WorkEntry[] = [
  entry('uno', 'Uno', 'https://www.youtube.com/watch?v=unoUNO12345&list=RDunoUNO12345'),
  entry('dos', 'Dos', 'https://www.youtube.com/watch?v=dos', 9000), // muy panorámica; id no válido
  entry('tres', null, null), // sin título ni enlace
];

describe('layoutRibbon', () => {
  it('repite la fila y coloca las tarjetas en orden, con su proporción limitada', () => {
    const { cards, period } = layoutRibbon(ENTRIES);

    expect(cards.length).toBe(ENTRIES.length * COPIES);
    expect(cards[0].width).toBe(2);
    expect(cards[1].width).toBe(2.4);
    expect(cards[ENTRIES.length].start).toBeCloseTo(cards[0].start + period);
  });

  it('wrap lleva cualquier posición a la ventana centrada del bucle', () => {
    expect(wrap(0, 10)).toBe(0);
    expect(wrap(6, 10)).toBe(-4);
    expect(wrap(-6, 10)).toBe(4);
    expect(wrap(23, 10)).toBe(3);
  });
});

describe('VideoRibbon', () => {
  let frameQueue: FrameRequestCallback[] = [];
  let clock = 0;
  const flushFrames = (count: number) => {
    for (let i = 0; i < count; i++) {
      const callbacks = frameQueue;
      frameQueue = [];
      clock += 16;
      callbacks.forEach((callback) => callback(clock));
    }
  };

  beforeAll(() => {
    globalThis.IntersectionObserver = class {
      constructor(private readonly callback: IntersectionObserverCallback) {}
      observe() {
        this.callback([{ isIntersecting: true } as IntersectionObserverEntry], this as never);
      }
      disconnect() {}
    } as unknown as typeof IntersectionObserver;
    window.matchMedia ??= (() => ({
      matches: false,
      addEventListener() {},
      removeEventListener() {},
    })) as unknown as typeof window.matchMedia;
    // jsdom no maqueta: tarjetas de 100 px de alto en un escenario de 1000 px de ancho.
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get: () => 100 });
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 1000 });
  });

  afterAll(() => {
    delete (HTMLElement.prototype as unknown as Record<string, unknown>)['offsetHeight'];
    delete (HTMLElement.prototype as unknown as Record<string, unknown>)['clientWidth'];
  });

  beforeEach(() => {
    frameQueue = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => frameQueue.push(callback));
    vi.stubGlobal('cancelAnimationFrame', () => {});
  });

  afterEach(() => vi.unstubAllGlobals());

  async function render() {
    TestBed.configureTestingModule({
      imports: [VideoRibbon],
      providers: [{ provide: IMAGE_LOADER, useValue: photoLoader }],
    });
    const fixture = TestBed.createComponent(VideoRibbon);
    fixture.componentRef.setInput('entries', ENTRIES);
    await fixture.whenStable();
    flushFrames(60);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const cards = () => [...element.querySelectorAll<HTMLAnchorElement>('.rib-card')];
    return { fixture, element, cards };
  }

  it('conserva el enlace a YouTube; si se puede reproducir aquí, lo anuncia como diálogo', async () => {
    const { cards } = await render();
    const [uno, dos, tres] = cards();

    expect(uno.getAttribute('href')).toBe('https://www.youtube.com/watch?v=unoUNO12345&list=RDunoUNO12345');
    expect(uno.target).toBe('_blank');
    expect(uno.rel).toBe('noopener noreferrer');
    expect(uno.getAttribute('aria-label')).toBe('Uno, Videoclip · 2026. Reproducir videoclip');
    expect(uno.getAttribute('aria-haspopup')).toBe('dialog');
    // URL que no es un vídeo válido: sigue siendo un enlace normal a YouTube
    expect(dos.getAttribute('aria-label')).toBe('Dos, Videoclip · 2026. Ver en YouTube (se abre en una pestaña nueva)');
    expect(dos.hasAttribute('aria-haspopup')).toBe(false);
    expect(tres.hasAttribute('href')).toBe(false);
    expect(tres.querySelector('.rib-title')?.textContent?.trim()).toBe('Artista');
  });

  it('un clic en la tarjeta del centro abre la tele en vez de ir a YouTube; solo una a la vez', async () => {
    const { fixture, cards, element } = await render();
    const click = () => {
      const event = new MouseEvent('click', { bubbles: true, cancelable: true });
      cards()[0].querySelector('.rib-face')!.dispatchEvent(event);
      return event;
    };

    expect(click().defaultPrevented).toBe(true);
    await fixture.whenStable();
    click();
    await fixture.whenStable();

    expect(element.querySelectorAll('app-video-tv').length).toBe(1);
    expect(cards()[0].hasAttribute('data-lent')).toBe(true);
    expect(element.querySelector('.tv-title')?.textContent?.trim()).toBe('Uno');
  });

  it('con Ctrl/⌘ el clic en la del centro deja que el enlace abra YouTube', async () => {
    const { fixture, cards, element } = await render();
    const click = new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true });

    cards()[0].querySelector('.rib-face')!.dispatchEvent(click);
    await fixture.whenStable();

    expect(click.defaultPrevented).toBe(false);
    expect(element.querySelector('app-video-tv')).toBeNull();
  });

  it('solo la primera repetición llega al tabulador y a los lectores de pantalla', async () => {
    const { cards } = await render();
    const announced = cards().filter((card) => !card.hasAttribute('aria-hidden'));

    expect(cards().length).toBe(ENTRIES.length * COPIES);
    expect(announced.length).toBe(ENTRIES.length);
    expect(cards().filter((card) => card.getAttribute('tabindex') === '-1').length).toBe(
      ENTRIES.length * (COPIES - 1),
    );
  });

  it('empieza con la primera tarjeta en el centro, activa', async () => {
    const { cards, element } = await render();

    expect(cards()[0].hasAttribute('data-active')).toBe(true);
    expect(cards()[0].style.getPropertyValue('--f')).toBe('1.000');
    expect(element.querySelector('.rib-count')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('01 / 03');
  });

  it('un clic en una tarjeta lateral la centra en vez de abrir el enlace', async () => {
    const { fixture, cards, element } = await render();
    const side = cards()[1];
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });

    side.querySelector('.rib-face')!.dispatchEvent(click);
    flushFrames(120);
    await fixture.whenStable();

    expect(click.defaultPrevented).toBe(true);
    expect(side.hasAttribute('data-active')).toBe(true);
    expect(element.querySelector('.rib-count')?.textContent?.trim().startsWith('02')).toBe(true);
  });

  it('arrastrar mueve la cinta y el clic que cierra el gesto no abre nada', async () => {
    const { cards, element } = await render();
    const stage = element.querySelector<HTMLElement>('.rib-stage')!;
    const pointer = (type: string, clientX: number) => new MouseEvent(type, { clientX, bubbles: true });

    stage.dispatchEvent(pointer('pointerdown', 500));
    stage.dispatchEvent(pointer('pointermove', 300));
    expect(stage.hasAttribute('data-dragging')).toBe(true);
    flushFrames(1);
    expect(cards()[0].style.getPropertyValue('--f')).not.toBe('1.000');

    stage.dispatchEvent(pointer('pointerup', 300));
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    cards()[0].dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
  });
});
