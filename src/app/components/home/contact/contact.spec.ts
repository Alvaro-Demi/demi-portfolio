import { TestBed } from '@angular/core/testing';
import { Contact } from './contact';

describe('Contact', () => {
  beforeAll(() => {
    // jsdom no implementa IntersectionObserver (lo usa la directiva appReveal).
    globalThis.IntersectionObserver ??= class {
      observe() {}
      disconnect() {}
    } as unknown as typeof IntersectionObserver;
  });

  async function render() {
    TestBed.configureTestingModule({ imports: [Contact] });
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

  it('enviado vacío, señala los campos obligatorios', async () => {
    const { fixture, element } = await render();

    element.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    await fixture.whenStable();

    const errors = [...element.querySelectorAll('.field-error')].map((e) => e.textContent?.trim());
    expect(errors).toEqual(['Escribe tu nombre.', 'Cuéntame tu idea.']);
    expect(element.querySelector('#contact-name')?.getAttribute('aria-invalid')).toBe('true');
  });

  it('prepara el correo con destinatario, asunto y mensaje', async () => {
    const { fixture, element } = await render();
    type(element, '#contact-name', 'Ana');
    type(element, '#contact-project', 'Dron');
    type(element, '#contact-message', 'Hola, ¿hablamos?');
    await fixture.whenStable();

    const link = (fixture.componentInstance as unknown as { mailtoLink: () => string }).mailtoLink();
    const url = new URL(link);
    expect(url.protocol).toBe('mailto:');
    expect(url.pathname).toBe('hola@example.com');
    expect(url.searchParams.get('subject')).toBe('Contacto web: Dron — Ana');
    expect(url.searchParams.get('body')).toBe('Hola, ¿hablamos?\r\n\r\n— Ana\r\nProyecto: Dron');
  });

  it('enlaza Instagram en una pestaña nueva y segura', async () => {
    const { element } = await render();
    const link = element.querySelector<HTMLAnchorElement>('a[href*="instagram.com"]')!;

    expect(link.href).toBe('https://www.instagram.com/usuario/');
    expect(link.target).toBe('_blank');
    expect(link.rel).toBe('noopener noreferrer');
  });
});
