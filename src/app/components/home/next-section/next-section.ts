import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, afterNextRender, inject, signal } from '@angular/core';

/**
 * Botón flotante abajo y centrado: baja a la siguiente sección (.screen) de la página.
 * Oculto en el hero (hasta empezar a bajar) y en la última sección. Late como el vídeo de referencia (reference/animos/boton.mp4):
 * el anillo crece y se enciende en rojo, el botón baja un poco y la flecha algo más.
 */
@Component({
  selector: 'app-next-section',
  template: `
    <button
      type="button"
      class="next"
      [attr.aria-label]="label()"
      [class.is-hidden]="!visible()"
      (click)="goNext()"
    >
      <svg class="chevron" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M6 9.5l6 6 6-6" />
      </svg>
    </button>
  `,
  styles: `
    .next {
      /* Ritmo medido en el vídeo: un latido cada 2.2s, el máximo hacia la mitad */
      --pulse: 2.2s;
      --pulse-ease: cubic-bezier(0.45, 0, 0.55, 1);

      position: fixed;
      inset-inline: 0;
      inset-block-end: calc(var(--space-6) + env(safe-area-inset-bottom, 0px));
      z-index: 5;
      display: grid;
      place-items: center;
      inline-size: 3.5rem;
      block-size: 3.5rem;
      margin-inline: auto;
      padding: 0;
      border: 0;
      border-radius: 50%;
      /* Se lee sobre cualquier foto: velo oscuro y desenfoque detrás */
      background-color: rgb(10 10 10 / 0.45);
      -webkit-backdrop-filter: blur(8px);
      backdrop-filter: blur(8px);
      color: var(--color-text);
      animation: bob var(--pulse) var(--pulse-ease) infinite;
      transition:
        opacity var(--duration-base) var(--ease-out),
        visibility var(--duration-base);
    }

    /* Anillo rojo: crece y se enciende en cada latido */
    .next::before {
      content: '';
      position: absolute;
      inset: 0;
      border: 1.5px solid var(--color-accent);
      border-radius: inherit;
      animation: ring var(--pulse) var(--pulse-ease) infinite;
    }

    .chevron {
      inline-size: 1.5rem;
      block-size: 1.5rem;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
      animation: nudge var(--pulse) var(--pulse-ease) infinite;
    }

    /* Ratón encima: el anillo se queda encendido y el latido se para */
    @media (hover: hover) {
      .next:hover,
      .next:hover::before,
      .next:hover .chevron {
        animation-play-state: paused;
      }

      .next:hover::before {
        opacity: 1;
      }
    }

    .next.is-hidden {
      opacity: 0;
      visibility: hidden;
    }

    /* 0% y 100% = reposo (con movimiento reducido el botón se queda así, quieto) */
    @keyframes bob {
      0%,
      100% {
        transform: translateY(0);
      }
      48% {
        transform: translateY(3px);
      }
    }

    @keyframes ring {
      0%,
      100% {
        opacity: 0.3;
        transform: scale(1);
      }
      48% {
        opacity: 1;
        transform: scale(1.08);
      }
    }

    @keyframes nudge {
      0%,
      100% {
        transform: translateY(0);
      }
      48% {
        transform: translateY(2px);
      }
    }
  `,
})
export class NextSection {
  private readonly document = inject(DOCUMENT);

  protected readonly visible = signal(false);
  protected readonly label = signal('Ir a la siguiente sección');

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const win = this.document.defaultView;
      if (!win) return;

      let frame = 0;
      const schedule = () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => this.update());
      };

      win.addEventListener('scroll', schedule, { passive: true });
      win.addEventListener('resize', schedule, { passive: true });
      this.update();

      destroyRef.onDestroy(() => {
        cancelAnimationFrame(frame);
        win.removeEventListener('scroll', schedule);
        win.removeEventListener('resize', schedule);
      });
    });
  }

  protected goNext(): void {
    const next = this.findNext();
    if (!next) return;

    // Lleva también el foco: con teclado o lector de pantalla se sigue leyendo desde ahí
    if (!next.hasAttribute('tabindex')) next.setAttribute('tabindex', '-1');
    next.focus({ preventScroll: true });
    // Respeta scroll-behavior (suave, salvo con movimiento reducido) y scroll-padding (header)
    next.scrollIntoView({ block: 'start' });
  }

  private update(): void {
    const next = this.findNext();
    this.visible.set(next !== null && this.leftHero());

    const titleId = next?.getAttribute('aria-labelledby');
    const title = titleId ? this.document.getElementById(titleId)?.textContent?.trim() : '';
    this.label.set(title ? `Ir a la siguiente sección: ${title}` : 'Ir a la siguiente sección');
  }

  /**
   * Oculto mientras el hero se ve entero: ahí ya está "Ver trabajo" en el mismo sitio.
   * Aparece al empezar a bajar, cuando el final del hero ha subido 7.5rem (lo justo para
   * que "Ver trabajo" quede por encima del botón y no se pisen).
   */
  private leftHero(): boolean {
    const hero = this.document.querySelector<HTMLElement>('.screen');
    const win = this.document.defaultView;
    if (!hero || !win) return true;

    const rem = parseFloat(getComputedStyle(this.document.documentElement).fontSize) || 16;
    return hero.getBoundingClientRect().bottom < win.innerHeight - 7.5 * rem;
  }

  /** La primera sección cuyo inicio aún está por debajo del header */
  private findNext(): HTMLElement | null {
    const root = this.document.documentElement;
    const win = this.document.defaultView;
    if (!win) return null;

    // Al final de la página ya no se puede bajar más
    if (win.scrollY + win.innerHeight >= root.scrollHeight - 2) return null;

    const edge = parseFloat(getComputedStyle(root).scrollPaddingBlockStart) || 0;
    const screens = this.document.querySelectorAll<HTMLElement>('.screen');
    return Array.from(screens).find((s) => s.getBoundingClientRect().top > edge + 2) ?? null;
  }
}
