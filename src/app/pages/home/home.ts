import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-home',
  imports: [],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  /** Placeholder until STAGE BLEED lands on this page. */
  protected readonly pageTitle = signal('DEMI');
}
