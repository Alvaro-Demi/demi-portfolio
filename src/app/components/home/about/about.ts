import { NgOptimizedImage } from '@angular/common';
import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Photo } from '../../../models/photo';
import { Reveal } from '../../../shared/reveal';

@Component({
  selector: 'app-about',
  imports: [NgOptimizedImage, Reveal, RouterLink],
  templateUrl: './about.html',
  styleUrl: './about.css',
})
export class About {
  readonly photo = input.required<Photo>();
  readonly services = input.required<readonly string[]>();
  /** Número de sección: «07». */
  readonly chapter = input.required<string>();
}
