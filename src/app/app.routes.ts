import { Routes } from '@angular/router';
import { Home } from './pages/home/home';

export const routes: Routes = [
  {
    // Sin carga diferida: es la única página y la primera que se ve. Diferida, el navegador no
    // descubría la foto del hero hasta descargar un segundo archivo de JS (peor LCP).
    path: '',
    pathMatch: 'full',
    component: Home,
  },
  {
    path: '**',
    redirectTo: '',
  },
];
