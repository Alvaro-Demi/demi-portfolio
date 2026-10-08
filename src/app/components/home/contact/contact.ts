import { Component, computed, input } from '@angular/core';
import { Reveal } from '../../../shared/reveal';

@Component({
  selector: 'app-contact',
  imports: [Reveal],
  templateUrl: './contact.html',
  styleUrl: './contact.css',
})
export class Contact {
  readonly email = input.required<string>();

  protected readonly mailto = computed(() => `mailto:${this.email()}`);
}
