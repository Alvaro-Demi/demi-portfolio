import { TestBed } from '@angular/core/testing';
import { CONTACT_ENDPOINT } from '../../../services/contact-form';
import { Contact } from './contact';

const ENDPOINT = 'https://formspree.io/f/test';

describe('Contact', () => {
  beforeAll(() => {
    // jsdom no implementa IntersectionObserver (lo usa la directiva appReveal).
    globalThis.IntersectionObserver ??= class {
      observe() {}
      disconnect() {}
    } as unknown as typeof IntersectionObserver;
  });

  afterEach(() => vi.restoreAllMocks());

  async function render(endpoint = ENDPOINT) {
    TestBed.configureTestingModule({
      imports: [Contact],
      providers: [{ provide: CONTACT_ENDPOINT, useValue: endpoint }],
    });
    const fixture = TestBed.createComponent(Contact);
    fixture.componentRef.setInput('email', 'hola@example.com');
    fixture.componentRef.setInput('instagram', 'usuario');
    fixture.componentRef.setInput('projectTypes', ['Videoclips y rodajes', 'Dron']);
    fixture.componentRef.setInput('chapter', '08');
    await fixture.whenStable();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  }

  function type(element: HTMLElement, selector: string, value: string) {
    const field = element.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(selector)!;
    field.value = value;
    // Como el navegador: los <select> disparan input y change.
    field.dispatchEvent(new Event('input'));
    field.dispatchEvent(new Event('change'));
  }

  function fill(element: HTMLElement) {
    type(element, '#contact-name', 'Ana');
    type(element, '#contact-email', 'ana@example.com');
    type(element, '#contact-project', 'Dron');
    type(element, '#contact-message', 'Hola, ¿hablamos?');
  }

  async function submitForm(fixture: { whenStable: () => Promise<unknown> }, element: HTMLElement) {
    element.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    await fixture.whenStable();
    // La acción de envío es asíncrona (fetch): se deja que termine y se pinta.
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
  }

  const errors = (element: HTMLElement) =>
    [...element.querySelectorAll('.field-error')].map((e) => e.textContent?.trim());

  it('enviado vacío, señala los campos obligatorios', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch');
    const { fixture, element } = await render();

    await submitForm(fixture, element);

    expect(errors(element)).toEqual(['Escribe tu nombre.', 'Escribe tu email.', 'Cuéntame tu idea.']);
    expect(element.querySelector('#contact-name')?.getAttribute('aria-invalid')).toBe('true');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('avisa si el email no es válido', async () => {
    const { fixture, element } = await render();
    fill(element);
    type(element, '#contact-email', 'ana@');

    await submitForm(fixture, element);

    expect(errors(element)).toEqual(['Revisa el email.']);
  });

  it('envía el mensaje a Formspree y vacía el formulario', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{"ok":true}', { status: 200 }));
    const { fixture, element } = await render();
    fill(element);

    await submitForm(fixture, element);

    expect(fetch).toHaveBeenCalledOnce();
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe(ENDPOINT);
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toEqual({
      name: 'Ana',
      email: 'ana@example.com',
      project: 'Dron',
      message: 'Hola, ¿hablamos?',
      _subject: 'Contacto web: Dron — Ana',
    });
    expect(element.querySelector('[role="status"]')?.textContent).toContain('Mensaje enviado');
    expect(element.querySelector<HTMLInputElement>('#contact-name')?.value).toBe('');
  });

  it('si falla, enseña el email y el enlace que abre el correo con el mensaje', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 500 }));
    const { fixture, element } = await render();
    fill(element);

    await submitForm(fixture, element);

    const status = element.querySelector('[role="status"]')!;
    expect(status.textContent).toContain('No se ha podido enviar');
    expect(status.textContent).toContain('hola@example.com');

    const url = new URL(status.querySelector<HTMLAnchorElement>('a[href^="mailto:"]')!.href);
    expect(url.pathname).toBe('hola@example.com');
    expect(url.searchParams.get('subject')).toBe('Contacto web: Dron — Ana');
    expect(url.searchParams.get('body')).toBe('Hola, ¿hablamos?\r\n\r\n— Ana\r\nProyecto: Dron');
    // El mensaje no se pierde
    expect(element.querySelector<HTMLTextAreaElement>('#contact-message')?.value).toBe('Hola, ¿hablamos?');
  });

  it('sin dirección de Formspree, no intenta enviar y enseña el email', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch');
    const { fixture, element } = await render('');
    fill(element);

    await submitForm(fixture, element);

    expect(fetch).not.toHaveBeenCalled();
    expect(element.querySelector('[role="status"]')?.textContent).toContain('hola@example.com');
  });

  it('si un bot rellena el campo trampa, no envía nada', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch');
    const { fixture, element } = await render();
    fill(element);
    type(element, '#contact-botcheck', 'spam');

    await submitForm(fixture, element);

    expect(fetch).not.toHaveBeenCalled();
  });

  it('enlaza Instagram en una pestaña nueva y segura', async () => {
    const { element } = await render();
    const link = element.querySelector<HTMLAnchorElement>('a[href*="instagram.com"]')!;

    expect(link.href).toBe('https://www.instagram.com/usuario/');
    expect(link.target).toBe('_blank');
    expect(link.rel).toBe('noopener noreferrer');
  });
});
