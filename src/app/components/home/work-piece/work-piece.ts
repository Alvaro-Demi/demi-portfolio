import { NgOptimizedImage } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { WorkEntry } from '../../../models/photo';
import { Reveal } from '../../../shared/reveal';
import { WORK_LAYOUTS } from './work-layouts';

/**
 * Una pieza de trabajo: fotografía, enlace al videoclip si lo hay y pie con número,
 * titular y metadatos. La sección que la contiene decide dónde y a qué tamaño va.
 */
@Component({
  selector: 'app-work-piece',
  imports: [NgOptimizedImage, Reveal],
  templateUrl: './work-piece.html',
  styleUrl: './work-piece.css',
})
export class WorkPiece {
  readonly entry = input.required<WorkEntry>();
  /** Posición dentro de su sección, empezando en 1. */
  readonly index = input.required<number>();

  protected readonly layout = computed(() => WORK_LAYOUTS[this.entry().layout]);
  protected readonly number = computed(() => String(this.index()).padStart(2, '0'));
  protected readonly heading = computed(() => this.entry().title ?? this.entry().artist);

  protected readonly meta = computed(() => {
    const { context, year } = this.entry();
    return [ context, year].filter((part) => part !== null).join(' · ');
  });

  protected readonly linkLabel = computed(() => {
    const title = this.entry().title;
    return `Ver el videoclip ${title ? `«${title}» ` : ''}en YouTube (se abre en una pestaña nueva)`;
  });
}
