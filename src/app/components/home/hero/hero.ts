import { NgOptimizedImage } from '@angular/common';
import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Photo } from '../../../models/photo';
import { WordCycle } from '../word-cycle/word-cycle';

@Component({
  selector: 'app-hero',
  imports: [NgOptimizedImage, RouterLink, WordCycle],
  templateUrl: './hero.html',
  styleUrl: './hero.css',
})
export class Hero {
  readonly photo = input.required<Photo>();

  protected readonly workIntro = 'Podemos trabajar juntos en';
  protected readonly workTypes = [
    'videoclips',
    'rodajes',
    'reels',
    'conciertos',
    'eventos',
    'redes sociales',
  ] as const;
}
