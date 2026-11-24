import {
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';

/* Ritmo medido sobre el vídeo de referencia (reference/animos/titulo.mp4) */
const HOLD_MS = 2900; // palabra completa, cursor parpadeando
const ERASE_MS = 600; // la cortina tapa la palabra
const GAP_MS = 300; // hueco vacío antes de la siguiente
const WRITE_MS = 700; // la cortina descubre la nueva
const EASE = 'cubic-bezier(0.65, 0, 0.35, 1)'; // arranca y frena despacio

/**
 * Frase fija y, debajo, una palabra que se escribe y se borra como una cortina
 * con un punto rojo de cursor. Los lectores de pantalla leen la frase completa una vez.
 */
@Component({
  selector: 'app-word-cycle',
  template: `
    <span class="visually-hidden">{{ spoken() }}</span>
    <span class="intro" aria-hidden="true">{{ intro() }}</span>
    <span class="line" aria-hidden="true">
      <!-- Reserva el ancho de la palabra más larga: el bloque no se mueve al cambiar -->
      <span class="ghost">{{ longest() }}<span class="cursor"></span></span>
      <span class="live">
        <span class="clip" #clip><span class="word" #word>{{ current() }}</span></span>
        <span class="cursor" [class.is-idle]="idle()"></span>
      </span>
    </span>
  `,
  styles: `
    :host {
      display: grid;
      justify-items: start;
      row-gap: 0.14em;
    }

    /* El tamaño de la frase se puede cambiar desde fuera con --concept-intro-size */
    .intro {
      font-size: var(--concept-intro-size, max(var(--text-sm), 0.38em));
      letter-spacing: 0.08em;
    }

    .line {
      display: grid;
    }

    .ghost,
    .live {
      grid-area: 1 / 1;
      display: flex;
      align-items: baseline;
      white-space: nowrap;
    }

    .ghost {
      visibility: hidden;
    }

    /* overflow: clip (no hidden) para no perder la línea base del texto */
    .clip {
      display: block;
      overflow-x: clip;
    }

    .word {
      display: inline-block;
    }

    /* Punto cuadrado apoyado en la línea base, como un punto final */
    .cursor {
      flex: none;
      inline-size: 0.14em;
      block-size: 0.14em;
      margin-inline-start: 0.08em;
      background-color: var(--color-accent);
    }

    /* Solo parpadea quieto: encendido y apagado de golpe, sin fundido */
    .cursor.is-idle {
      animation: blink 0.7s step-end infinite;
    }

    @keyframes blink {
      0%,
      100% {
        opacity: 1;
      }
      50% {
        opacity: 0;
      }
    }
  `,
})
export class WordCycle {
  readonly intro = input.required<string>();
  readonly words = input.required<readonly string[]>();

  private readonly index = signal(0);
  protected readonly current = computed(() => this.words()[this.index()]);
  protected readonly idle = signal(true);

  protected readonly longest = computed(() =>
    this.words().reduce((a, b) => (b.length > a.length ? b : a), ''),
  );

  protected readonly spoken = computed(() => {
    const words = this.words();
    const list =
      words.length > 1 ? `${words.slice(0, -1).join(', ')} y ${words.at(-1)}` : words.join('');
    return `${this.intro()} ${list}.`;
  });

  private readonly clip = viewChild.required<ElementRef<HTMLElement>>('clip');
  private readonly word = viewChild.required<ElementRef<HTMLElement>>('word');
  private readonly injector = inject(Injector);

  constructor() {
    const controller = new AbortController();
    inject(DestroyRef).onDestroy(() => controller.abort());
    afterNextRender(() => void this.run(controller.signal));
  }

  private async run(signal: AbortSignal): Promise<void> {
    const clip = this.clip().nativeElement;
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

    try {
      while (this.words().length > 1) {
        this.idle.set(true);
        await wait(HOLD_MS, signal);
        this.idle.set(false);

        // Sin animaciones: la palabra cambia directamente
        if (reducedMotion.matches) {
          this.next();
          continue;
        }

        await resize(clip, clip.offsetWidth, 0, ERASE_MS, signal);
        clip.style.inlineSize = '0px';
        await wait(GAP_MS, signal);

        this.next();
        await this.rendered();
        await resize(clip, 0, this.word().nativeElement.offsetWidth, WRITE_MS, signal);
        clip.style.inlineSize = '';
      }
    } catch {
      // Componente destruido: el bucle termina
    }
  }

  private next(): void {
    this.index.update((i) => (i + 1) % this.words().length);
  }

  private rendered(): Promise<void> {
    return new Promise((resolve) => afterNextRender(() => resolve(), { injector: this.injector }));
  }
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(id);
        reject(signal.reason);
      },
      { once: true },
    );
  });
}

async function resize(
  el: HTMLElement,
  from: number,
  to: number,
  duration: number,
  signal: AbortSignal,
): Promise<void> {
  const animation = el.animate([{ inlineSize: `${from}px` }, { inlineSize: `${to}px` }], {
    duration,
    easing: EASE,
    fill: 'forwards',
  });
  signal.addEventListener('abort', () => animation.cancel(), { once: true });
  await animation.finished;
  animation.cancel(); // el estilo final lo fija quien llama
}
