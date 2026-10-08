import { Component, ElementRef, signal, viewChild } from '@angular/core';
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

  private readonly menuButton = viewChild.required<ElementRef<HTMLButtonElement>>('menuButton');

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
}
