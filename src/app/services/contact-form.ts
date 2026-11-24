import { inject, InjectionToken, Service } from '@angular/core';
import { CONTACT_FORM_ENDPOINT } from '../data/home.data';

/** Dirección de Formspree a la que se envían los mensajes. Los tests la sustituyen. */
export const CONTACT_ENDPOINT = new InjectionToken<string>('CONTACT_ENDPOINT', {
  factory: () => CONTACT_FORM_ENDPOINT,
});

export interface ContactRequest {
  readonly name: string;
  readonly email: string;
  /** Tipo de proyecto; vacío si no se eligió. */
  readonly project: string;
  readonly message: string;
}

/** Envía el formulario de contacto a Formspree, que lo reenvía al email de la cuenta. */
@Service()
export class ContactForm {
  private readonly endpoint = inject(CONTACT_ENDPOINT);

  /** Resuelve si Formspree acepta el mensaje; si no (o sin conexión), lanza un error. */
  async send({ name, email, project, message }: ContactRequest): Promise<void> {
    if (!this.endpoint) throw new Error('Falta la dirección de Formspree (CONTACT_FORM_ENDPOINT).');

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        // Formspree lo usa como «Responder a»: se contesta directamente a quien escribió
        email,
        project: project || 'Sin especificar',
        message,
        _subject: `Contacto web${project ? `: ${project}` : ''} — ${name}`,
      }),
    });
    if (!response.ok) throw new Error(`Formspree respondió ${response.status}.`);
  }
}
