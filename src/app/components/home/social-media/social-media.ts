import { Component, input } from '@angular/core';
import { SocialReel } from '../../../models/photo';
import { Reveal } from '../../../shared/reveal';
import { ReelWheel } from '../reel-wheel/reel-wheel';

/** 02 — Social Media: los reels de Instagram en una rueda, justo después de los videoclips. */
@Component({
  selector: 'app-social-media',
  imports: [Reveal, ReelWheel],
  template: `
    <section id="social" class="social" aria-labelledby="social-title">
      <div class="social-header" appReveal>
        <p class="eyebrow">{{ chapter() }} — Reels</p>
        <h2 id="social-title" class="social-title" lang="en">Social Media</h2>
      </div>

      <!-- Los reels en una rueda que gira sola; cada uno se abre en grande con sonido -->
      <app-reel-wheel class="social-wheel" [reels]="reels()" />
    </section>
  `,
  styles: `
    :host {
      display: block;
    }

    .social {
      padding: var(--space-6) var(--page-gutter);
    }

    .social-header {
      margin-block-end: var(--space-6);
    }

    .social-title {
      margin-block-start: var(--space-4);
      font-size: var(--text-heading);
      line-height: 0.85;
      text-transform: uppercase;
    }

    /* La rueda, a sangre: de borde a borde */
    .social-wheel {
      margin-inline: calc(var(--page-gutter) * -1);
    }
  `,
})
export class SocialMedia {
  readonly reels = input.required<readonly SocialReel[]>();
  readonly chapter = input.required<string>();
}
