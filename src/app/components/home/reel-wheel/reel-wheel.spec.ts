import { IMAGE_LOADER } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { SocialReel } from '../../../models/photo';
import { photoLoader } from '../../../shared/image-loader';
import { ReelWheel } from './reel-wheel';
import { centerSlot, offsetFromCenter, positionFor, slotCount } from './wheel-layout';

const reel = (id: string, title: string): SocialReel => ({
  id,
  title,
  context: 'Reel',
  year: 2026,
  video: id,
  highlight: 0,
  photo: { src: 'images/placeholders/foto-01.svg', alt: 'Póster', width: 1080, height: 1920 },
  instagramUrl: `https://www.instagram.com/reel/${id}/`,
});

const REELS: readonly SocialReel[] = [reel('uno', 'Uno'), reel('dos', 'Dos'), reel('tres', 'Tres')];

describe('wheel-layout', () => {
  it('llena la rueda repitiendo los reels (múltiplo exacto, para cerrar sin saltos)', () => {
    expect(slotCount(3)).toBe(15);
    expect(slotCount(4)).toBe(16);
    expect(slotCount(0)).toBe(0);
  });

  it('mide la distancia al centro por el camino corto del bucle', () => {
    expect(offsetFromCenter(1, 0, 15)).toBe(1);
    expect(offsetFromCenter(14, 0, 15)).toBe(-1);
    expect(offsetFromCenter(0, 14, 15)).toBe(1);
    expect(centerSlot(-1, 15)).toBe(14);
    expect(centerSlot(16.2, 15)).toBe(1);
    expect(positionFor(14, 0, 15)).toBe(-1);
  });
});

describe('ReelWheel', () => {
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
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get: () => 400 });
  });

  afterAll(() => {
    delete (HTMLElement.prototype as unknown as Record<string, unknown>)['offsetHeight'];
  });

  beforeEach(() => {
    frameQueue = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => frameQueue.push(callback));
    vi.stubGlobal('cancelAnimationFrame', () => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  async function render() {
    TestBed.configureTestingModule({
      imports: [ReelWheel],
      providers: [{ provide: IMAGE_LOADER, useValue: photoLoader }],
    });
    const fixture = TestBed.createComponent(ReelWheel);
    fixture.componentRef.setInput('reels', REELS);
    await fixture.whenStable();
    flushFrames(5);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const cards = () => [...element.querySelectorAll<HTMLAnchorElement>('.reel-card')];
    const count = () => element.querySelector('.reel-count')?.textContent?.replace(/\s+/g, ' ').trim();
    const clickCard = (card: HTMLElement, init: MouseEventInit = {}) => {
      const event = new MouseEvent('click', { bubbles: true, cancelable: true, ...init });
      card.querySelector('.reel-text')!.dispatchEvent(event);
      return event;
    };
    return { fixture, element, cards, count, clickCard };
  }

  it('repite los reels alrededor de la rueda; solo la primera vuelta es accesible', async () => {
    const { cards } = await render();
    const announced = cards().filter((card) => !card.hasAttribute('aria-hidden'));

    expect(cards().length).toBe(15);
    expect(announced.map((card) => card.getAttribute('aria-label'))).toEqual([
      'Uno, Reel · 2026. Reproducir reel',
      'Dos, Reel · 2026. Reproducir reel',
      'Tres, Reel · 2026. Reproducir reel',
    ]);
    expect(cards().filter((card) => card.getAttribute('tabindex') === '-1').length).toBe(12);
    expect(cards()[0].getAttribute('href')).toBe('https://www.instagram.com/reel/uno/');
    expect(cards()[0].getAttribute('aria-haspopup')).toBe('dialog');
  });

  it('empieza con la primera en el centro, recta, delante y con su bucle mudo', async () => {
    const { cards, count } = await render();
    const [first, second] = cards();
    const video = first.querySelector('video')!;

    expect(first.hasAttribute('data-active')).toBe(true);
    expect(first.style.transform).toBe('rotate(0.000deg)');
    expect(second.style.transform).toBe('rotate(24.000deg)');
    expect(Number(first.style.zIndex)).toBeGreaterThan(Number(second.style.zIndex));
    expect(video.muted).toBe(true);
    expect(video.loop).toBe(true);
    expect(video.getAttribute('src')).toBe('videos/uno-loop.mp4');
    expect(cards().filter((card) => card.querySelector('video')).length).toBe(1);
    expect(count()).toBe('01 / 03');
  });

  it('un clic en una lateral gira hasta ella en vez de abrir nada', async () => {
    const { fixture, cards, count, clickCard, element } = await render();

    const event = clickCard(cards()[1]);
    flushFrames(120);
    await fixture.whenStable();

    expect(event.defaultPrevented).toBe(true);
    expect(cards()[1].hasAttribute('data-active')).toBe(true);
    expect(count()).toBe('02 / 03');
    expect(element.querySelector('app-video-tv')).toBeNull();
  });

  it('un clic en la del centro abre la tele con el reel completo; solo una a la vez', async () => {
    const { fixture, cards, clickCard, element } = await render();

    expect(clickCard(cards()[0]).defaultPrevented).toBe(true);
    await fixture.whenStable();
    clickCard(cards()[0]);
    await fixture.whenStable();

    expect(element.querySelectorAll('app-video-tv').length).toBe(1);
    expect(element.querySelector('.tv video')?.getAttribute('src')).toBe('videos/uno.mp4');
    expect(element.querySelector('.tv-link')?.getAttribute('href')).toBe('https://www.instagram.com/reel/uno/');
    expect(cards()[0].hasAttribute('data-lent')).toBe(true);
  });

  it('con Ctrl/⌘ el clic en la del centro deja que el enlace abra Instagram', async () => {
    const { fixture, cards, clickCard, element } = await render();

    const event = clickCard(cards()[0], { ctrlKey: true });
    await fixture.whenStable();

    expect(event.defaultPrevented).toBe(false);
    expect(element.querySelector('app-video-tv')).toBeNull();
  });

  it('gira sola cada pocos segundos, y el botón de pausa la detiene', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'performance'] });
    const { fixture, element, count } = await render();
    const pause = element.querySelector<HTMLButtonElement>('.reel-pause')!;

    vi.advanceTimersByTime(4300);
    flushFrames(120);
    await fixture.whenStable();
    expect(count()).toBe('02 / 03');

    pause.click();
    await fixture.whenStable();
    expect(pause.textContent).toContain('Reanudar giro');
    vi.advanceTimersByTime(9000);
    flushFrames(120);
    await fixture.whenStable();
    expect(count()).toBe('02 / 03');
  });

  it('arrastrar gira la rueda y el clic que cierra el gesto no abre nada', async () => {
    const { fixture, cards, element, count } = await render();
    const stage = element.querySelector<HTMLElement>('.reel-stage')!;
    const pointer = (type: string, clientX: number) => new MouseEvent(type, { clientX, bubbles: true });

    stage.dispatchEvent(pointer('pointerdown', 500));
    stage.dispatchEvent(pointer('pointermove', 480));
    stage.dispatchEvent(pointer('pointermove', 280));
    expect(stage.hasAttribute('data-dragging')).toBe(true);
    stage.dispatchEvent(pointer('pointerup', 280));
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    cards()[0].dispatchEvent(click);
    flushFrames(120);
    await fixture.whenStable();

    expect(click.defaultPrevented).toBe(true);
    // Arrastrar a la izquierda trae las de la derecha (con algo de inercia, como mucho 2 más)
    const active = cards().findIndex((card) => card.hasAttribute('data-active'));
    expect(active).toBeGreaterThanOrEqual(1);
    expect(active).toBeLessThanOrEqual(3);
    expect(count()).toBe(`0${(active % 3) + 1} / 03`);
    expect(element.querySelector('app-video-tv')).toBeNull();
  });
});
