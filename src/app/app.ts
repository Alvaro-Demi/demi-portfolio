import { Component, ElementRef, viewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SiteFooter } from './layout/site-footer/site-footer';
import { SiteHeader } from './layout/site-header/site-header';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SiteHeader, SiteFooter],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly mainContent = viewChild.required<ElementRef<HTMLElement>>('mainContent');

  /** Mueve el foco a <main> sin cambiar la URL (un href="#..." navegaría a la raíz por <base href>). */
  protected skipToMain(event: Event): void {
    event.preventDefault();
    this.mainContent().nativeElement.focus();
  }
}
