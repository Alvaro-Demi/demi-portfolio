import { Component, input } from '@angular/core';
import { WorkEntry } from '../../../models/photo';
import { Reveal } from '../../../shared/reveal';
import { VideoRibbon } from '../video-ribbon/video-ribbon';

/** 01 — Videoclip: el trabajo alrededor del videoclip, justo después del hero. */
@Component({
  selector: 'app-selected-work',
  imports: [Reveal, VideoRibbon],
  templateUrl: './selected-work.html',
  styleUrl: './selected-work.css',
})
export class SelectedWork {
  readonly entries = input.required<readonly WorkEntry[]>();
}
