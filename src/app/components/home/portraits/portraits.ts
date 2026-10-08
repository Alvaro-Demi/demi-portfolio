import { Component, input } from '@angular/core';
import { WorkEntry } from '../../../models/photo';
import { Reveal } from '../../../shared/reveal';
import { WorkPiece } from '../work-piece/work-piece';

/** 03 — Retrato: díptico en color entre las dos photo stories en B/N. */
@Component({
  selector: 'app-portraits',
  imports: [Reveal, WorkPiece],
  template: `
    <section class="portraits" aria-labelledby="portraits-title">
      <header class="portraits-header" appReveal>
        <p class="eyebrow">03 — SESION DE FOTOS</p>
        <h2 id="portraits-title" class="portraits-title">Retrato</h2>
      </header>

      @for (entry of entries(); track entry.id; let i = $index) {
        <app-work-piece
          class="portraits-item"
          [attr.data-layout]="entry.layout"
          [entry]="entry"
          [index]="i + 1"
        />
      }
    </section>
  `,
  styleUrl: './portraits.css',
})
export class Portraits {
  readonly entries = input.required<readonly WorkEntry[]>();
}
