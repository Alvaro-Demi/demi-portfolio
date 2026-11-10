import { DOCUMENT } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { form, FormField, maxLength, required, submit } from '@angular/forms/signals';
import { Reveal } from '../../../shared/reveal';

interface ContactMessage {
  name: string;
  project: string;
  message: string;
}

/** Los enlaces mailto muy largos se cortan en algunos clientes de correo: el mensaje se limita. */
const MAX_MESSAGE = 1500;

/**
 * Contacto: un formulario que no envía nada por sí mismo. Al pulsar «Escríbeme» abre la
 * aplicación de correo de quien visita, desde su cuenta, con la dirección, el asunto y el
 * mensaje ya escritos: solo tiene que darle a enviar.
 */
@Component({
  selector: 'app-contact',
  imports: [Reveal, FormField],
  templateUrl: './contact.html',
  styleUrl: './contact.css',
})
export class Contact {
  readonly email = input.required<string>();
  /** Usuario de Instagram, sin la @. */
  readonly instagram = input.required<string>();
  /** Opciones de «Tipo de proyecto» (los servicios del About). */
  readonly projectTypes = input.required<readonly string[]>();

  protected readonly maxMessage = MAX_MESSAGE;
  protected readonly instagramUrl = computed(() => `https://www.instagram.com/${this.instagram()}/`);

  private readonly model = signal<ContactMessage>({ name: '', project: '', message: '' });

  protected readonly contactForm = form(this.model, (path) => {
    required(path.name, { message: 'Escribe tu nombre.' });
    required(path.message, { message: 'Cuéntame tu idea.' });
    maxLength(path.message, MAX_MESSAGE, { message: `Máximo ${MAX_MESSAGE} caracteres.` });
  });

  /** Enlace que abre el correo: destinatario, asunto y cuerpo ya escritos. */
  protected readonly mailtoLink = computed(() => {
    const { name, project, message } = this.model();
    const sender = name.trim();
    const subject = `Contacto web${project ? `: ${project}` : ''} — ${sender}`;
    // mailto espera saltos de línea CRLF
    const body = [message.trim().replace(/\r?\n/g, '\r\n'), '', `— ${sender}`, ...(project ? [`Proyecto: ${project}`] : [])].join('\r\n');
    return `mailto:${this.email()}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });

  private readonly window = inject(DOCUMENT).defaultView;

  protected async send(event: Event): Promise<void> {
    event.preventDefault();
    // Si falta algo, `submit` marca los campos para que se vean sus errores y no llama a la acción.
    const sent = await submit(this.contactForm, async () => {
      this.window?.location.assign(this.mailtoLink());
      return undefined;
    });
    // Con errores, el foco va al primer campo que hay que corregir.
    if (!sent) {
      const first = [this.contactForm.name, this.contactForm.message].find((field) => field().invalid());
      first?.().focusBoundControl();
    }
  }
}
