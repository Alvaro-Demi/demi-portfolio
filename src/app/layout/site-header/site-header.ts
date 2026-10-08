import { DOCUMENT, ViewportScroller } from '@angular/common';
import { afterNextRender, Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';

interface NavItem {
  readonly label: string;
  readonly fragment: string;
}

@Component({
  selector: 'app-site-header',
  imports: [RouterLink],
  templateUrl: './site-header.html',
  styleUrl: './site-header.css',
  host: {
    '(document:keydown.escape)': 'closeMenu(true)',
    '(window:scroll)': 'updateSolid()',
    '(window:resize)': 'updateSolid()',
  },
})
export class SiteHeader {
  protected readonly navItems: readonly NavItem[] = [
    { label: 'Work', fragment: 'work' },
    { label: 'About', fragment: 'about' },
    { label: 'Contact', fragment: 'contact' },
  ];

  /** Estado del menú móvil. Más adelante abrirá el menú a pantalla completa. */
  protected readonly menuOpen = signal(false);

  /**
   * Transparente solo sobre la foto del hero. Se vuelve sólido en cuanto el elemento marcado
   * con `data-header-edge` (el titular del hero) llega al header, para que la navegación
   * nunca se monte sobre el texto. Sin ese elemento, se vuelve sólido al hacer scroll.
   */
  protected readonly solid = signal(false);

  private readonly menuButton = viewChild.required<ElementRef<HTMLButtonElement>>('menuButton');
  private readonly document = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  constructor() {
    // El router hace scroll a #work, #about… sin tener en cuenta el header fijo: le pasamos su altura.
    inject(ViewportScroller).setOffset(() => [0, this.host.offsetHeight]);

    afterNextRender(() => this.updateSolid());
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(returnFocus = false): void {
    if (!this.menuOpen()) {
      return;
    }
    this.menuOpen.set(false);
    if (returnFocus) {
      this.menuButton().nativeElement.focus();
    }
  }

  protected updateSolid(): void {
    const edge = this.document.querySelector('[data-header-edge]');
    if (edge) {
      this.solid.set(edge.getBoundingClientRect().top <= this.host.offsetHeight);
    } else {
      this.solid.set((this.document.defaultView?.scrollY ?? 0) > 0);
    }
  }
}
