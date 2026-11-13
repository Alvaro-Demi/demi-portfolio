import { IMAGE_LOADER } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { photoLoader } from '../../../shared/image-loader';
import { SocialMedia } from './social-media';

describe('SocialMedia', () => {
  beforeAll(() => {
    globalThis.IntersectionObserver ??= class {
      observe() {}
      disconnect() {}
    } as unknown as typeof IntersectionObserver;
    window.matchMedia ??= (() => ({
      matches: false,
      addEventListener() {},
      removeEventListener() {},
    })) as unknown as typeof window.matchMedia;
  });

  it('es la sección #social, con su número y el título como nombre', async () => {
    TestBed.configureTestingModule({
      imports: [SocialMedia],
      providers: [{ provide: IMAGE_LOADER, useValue: photoLoader }],
    });
    const fixture = TestBed.createComponent(SocialMedia);
    fixture.componentRef.setInput('reels', []);
    fixture.componentRef.setInput('chapter', '02');
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const section = element.querySelector('section')!;

    expect(section.id).toBe('social');
    expect(element.querySelector('.eyebrow')?.textContent?.trim()).toBe('02 — Reels');
    expect(element.querySelector(`#${section.getAttribute('aria-labelledby')}`)?.textContent?.trim()).toBe('Social Media');
  });
});
