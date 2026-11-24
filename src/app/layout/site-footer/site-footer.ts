import { Component } from '@angular/core';
import { INSTAGRAM_HANDLE } from '../../data/home.data';

@Component({
  selector: 'app-site-footer',
  template: `
    <footer class="site-footer">
      <!-- En móvil, «contents»: marca y lema son celdas sueltas de la rejilla -->
      <div class="identity">
        <p class="brand">DEMI</p>
        <p class="tagline">Fotografía & Videografía</p>
      </div>

      <!-- Instagram: el mismo botón que en Contacto, con el usuario al lado -->
      <a class="instagram" [href]="instagramUrl" target="_blank" rel="noopener noreferrer">
        <span class="instagram-icon">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <rect x="2.75" y="2.75" width="18.5" height="18.5" rx="5.25" />
            <circle cx="12" cy="12" r="4.25" />
            <circle class="instagram-dot" cx="17.4" cy="6.6" r="1.1" />
          </svg>
        </span>
        <span><span class="visually-hidden">Instagram </span>{{ handle }}</span>
        <span class="visually-hidden"> (se abre en una pestaña nueva)</span>
      </a>

      <p class="legal"><small>© {{ year }}</small></p>
    </footer>
  `,
  styleUrl: './site-footer.css',
})
export class SiteFooter {
  protected readonly year = new Date().getFullYear();
  protected readonly handle = INSTAGRAM_HANDLE;
  protected readonly instagramUrl = `https://www.instagram.com/${INSTAGRAM_HANDLE}/`;
}
