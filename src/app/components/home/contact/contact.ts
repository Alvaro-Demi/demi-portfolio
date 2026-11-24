import { afterNextRender, Component, computed, DestroyRef, ElementRef, inject, Injector, input, signal, viewChild } from '@angular/core';
import { email, form, FormField, maxLength, required, submit } from '@angular/forms/signals';
import { ContactForm } from '../../../services/contact-form';
import { Reveal } from '../../../shared/reveal';

interface ContactMessage {
  name: string;
  email: string;
  project: string;
  message: string;
  /** Campo trampa: invisible para las personas; si llega relleno, es un bot. */
  botcheck: string;
}

type Status = 'idle' | 'sending' | 'sent' | 'error';

const MAX_MESSAGE = 1500;
/** Tiempo que se ve «Copiado» tras copiar el email. */
const COPIED_MS = 2000;

const EMPTY: ContactMessage = { name: '', email: '', project: '', message: '', botcheck: '' };

/**
 * Contacto: el formulario envía el mensaje a Formspree, que lo reenvía al email de DEMI con el
 * de quien escribe como «Responder a». Si el envío falla, se muestra el email con «Copiar» y un
 * enlace que abre la aplicación de correo con el mensaje ya escrito: nadie se queda sin escribir.
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
  /** Número de sección: «08». */
  readonly chapter = input.required<string>();

  protected readonly maxMessage = MAX_MESSAGE;
  protected readonly instagramUrl = computed(() => `https://www.instagram.com/${this.instagram()}/`);

  private readonly model = signal<ContactMessage>({ ...EMPTY });

  protected readonly contactForm = form(this.model, (path) => {
    required(path.name, { message: 'Escribe tu nombre.' });
    required(path.email, { message: 'Escribe tu email.' });
    email(path.email, { message: 'Revisa el email.' });
    required(path.message, { message: 'Cuéntame tu idea.' });
    maxLength(path.message, MAX_MESSAGE, { message: `Máximo ${MAX_MESSAGE} caracteres.` });
  });

  protected readonly status = signal<Status>('idle');
  protected readonly copied = signal(false);

  /** Respaldo si falla el envío: abre el correo de quien visita con todo ya escrito. */
  protected readonly mailtoLink = computed(() => {
    const { name, project, message } = this.model();
    const sender = name.trim();
    const subject = `Contacto web${project ? `: ${project}` : ''} — ${sender}`;
    // mailto espera saltos de línea CRLF
    const body = [message.trim().replace(/\r?\n/g, '\r\n'), '', `— ${sender}`, ...(project ? [`Proyecto: ${project}`] : [])].join('\r\n');
    return `mailto:${this.email()}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });

  private readonly contactService = inject(ContactForm);
  private readonly injector = inject(Injector);
  private readonly statusText = viewChild<ElementRef<HTMLElement>>('statusText');
  private copiedTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.copiedTimer));
  }

  protected async send(event: Event): Promise<void> {
    event.preventDefault();
    if (this.status() === 'sending') return;

    // Si falta algo, `submit` marca los campos para que se vean sus errores y no llama a la acción.
    const valid = await submit(this.contactForm, async () => {
      const { botcheck, ...message } = this.model();
      this.status.set('sending');
      try {
        // Un bot rellenó el campo trampa: se le dice que se envió, pero no se envía nada.
        if (!botcheck) {
          await this.contactService.send({
            name: message.name.trim(),
            email: message.email.trim(),
            project: message.project,
            message: message.message.trim(),
          });
        }
        this.status.set('sent');
        this.contactForm().reset({ ...EMPTY });
      } catch {
        // El mensaje se conserva: el enlace de respaldo lo lleva al correo tal cual.
        this.status.set('error');
      }
      this.focusStatus();
      return undefined;
    });

    // Con errores, el foco va al primer campo que hay que corregir.
    if (!valid) {
      const first = [this.contactForm.name, this.contactForm.email, this.contactForm.message].find((field) =>
        field().invalid(),
      );
      first?.().focusBoundControl();
    }
  }

  protected async copyEmail(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.email());
    } catch {
      return; // Sin permiso: el email sigue visible y se puede seleccionar.
    }
    this.copied.set(true);
    clearTimeout(this.copiedTimer);
    this.copiedTimer = setTimeout(() => this.copied.set(false), COPIED_MS);
  }

  /** Lleva el foco al resultado: teclado y lector de pantalla siguen desde ahí. */
  private focusStatus(): void {
    afterNextRender(() => this.statusText()?.nativeElement.focus(), { injector: this.injector });
  }
}
