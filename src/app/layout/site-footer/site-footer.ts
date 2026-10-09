import { Component } from '@angular/core';

@Component({
  selector: 'app-site-footer',
  template: `
    <footer class="site-footer">
      <p class="brand">DEMI</p>
      <p class="tagline">Fotografía & Videografía</p>
      <p class="legal"><small>© {{ year }}</small></p>
    </footer>
  `,
  styleUrl: './site-footer.css',
})
export class SiteFooter {
  protected readonly year = new Date().getFullYear();
}
