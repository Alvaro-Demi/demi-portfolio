import { NgOptimizedImage } from '@angular/common';
import { Component, input } from '@angular/core';
import { Photo } from '../../../models/photo';
import { Reveal } from '../../../shared/reveal';

@Component({
  selector: 'app-about',
  imports: [NgOptimizedImage, Reveal],
  templateUrl: './about.html',
  styleUrl: './about.css',
})
export class About {
  readonly photo = input.required<Photo>();

  protected readonly services = [
    'Imagen corporativa',
    'Videoclips y rodajes',
    'Sesiones de fotos',
    'Dron',
    'Conciertos y festivales',
  ] as const;
}
