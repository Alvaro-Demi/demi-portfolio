import { NgOptimizedImage } from '@angular/common';
import { afterNextRender, Component, DestroyRef, ElementRef, inject, input } from '@angular/core';
import { Photo } from '../../../models/photo';
import { HERO_SIZES } from '../../../shared/image-loader';

/** Scroll (en pantallas) en el que el fondo termina de desenfocarse y oscurecerse. */
const TRANSITION_SCREENS = 0.85;

/* --- Enfoque con el ratón (solo escritorio) -------------------------------- */
/** Superficie del recuadro de enfoque: 0.1 = el 10 % de la pantalla. */
const FOCUS_AREA = 0.1;
/** Proporción del recuadro: 4:3. */
const FOCUS_RATIO = 4 / 3;
/** Inercia al seguir al ratón: 1 = pegado al puntero, más bajo = más lento. */
const FOCUS_FOLLOW = 0.18;
/** Tiempo con el ratón quieto hasta que el enfoque se "bloquea" (marco rojo). */
const FOCUS_LOCK_MS = 220;
/**
 * Al bajar: parte de la transición (0–1) en la que el recuadro crece hasta la pantalla
 * entera. El resto es el desenfoque final. 0.4 = el 40 % primero abre, el 60 % desenfoca.
 */
const FOCUS_OPEN_PHASE = 0.4;

/**
 * Fondo de la Home: la foto del hero, fija detrás de todas las secciones.
 *
 * Arriba del todo es la propia foto del hero (en tablet y escritorio; en móvil el hero tiene
 * su foto en bloque y este fondo empieza invisible). Al hacer scroll, durante la primera
 * pantalla, la foto se desenfoca, se oscurece y se acerca un poco: queda como textura de
 * fondo del resto de secciones.
 *
 * Para no recalcular un desenfoque a pantalla completa en cada frame, hay dos capas: la foto
 * nítida y otra ya desenfocada (pequeña: total, está borrosa). El scroll solo cambia
 * opacidades y una escala, escritas en una variable CSS (--backdrop-p, de 0 a 1).
 * Es decorativo: la foto ya está descrita en el hero.
 *
 * Escritorio con ratón: arriba la foto está desenfocada salvo un recuadro 4:3 que sigue al
 * ratón (el enfoque de una cámara). Al bajar, primero el recuadro crece hasta la pantalla
 * entera (toda la foto nítida) y después llega el desenfoque final: un cambio de foco.
 */
@Component({
  selector: 'app-backdrop',
  imports: [NgOptimizedImage],
  host: { 'aria-hidden': 'true' },
  template: `
    <div class="backdrop-zoom">
      <img
        class="backdrop-sharp"
        [ngSrc]="photo().src"
        alt=""
        fill
        priority
        [sizes]="sizes"
        [style.--focus]="photo().focus ?? null"
        [style.--focus-mobile]="photo().mobile?.focus ?? null"
      />
      <!-- Escritorio: la foto desenfocada con un hueco 4:3 que sigue al ratón (el enfoque) -->
      <div class="backdrop-defocus">
        <img
          [ngSrc]="photo().src"
          alt=""
          fill
          sizes="33vw"
          [style.--focus]="photo().focus ?? null"
          [style.--focus-mobile]="photo().mobile?.focus ?? null"
        />
      </div>
      <img
        class="backdrop-soft"
        [ngSrc]="photo().src"
        alt=""
        fill
        sizes="16vw"
        [style.--focus]="photo().focus ?? null"
        [style.--focus-mobile]="photo().mobile?.focus ?? null"
      />
    </div>
    <div class="backdrop-veil"></div>
    <!-- Escritorio: el recuadro de enfoque de la cámara -->
    <div class="backdrop-focus"><span class="backdrop-focus-frame"></span></div>
    <div class="backdrop-shade"></div>
  `,
  styleUrl: './backdrop.css',
})
export class Backdrop {
  readonly photo = input.required<Photo>();

  /** El mismo `sizes` que el hero: así comparten la descarga de la foto. */
  protected readonly sizes = HERO_SIZES;

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const desktop = matchMedia('(min-width: 64rem) and (hover: hover) and (pointer: fine)');
      const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

      /* Recuadro de enfoque: tamaño, centro actual (con inercia) y destino (el ratón).
         Empieza en el centro de la pantalla, para que el efecto se entienda al entrar. */
      let w = 0;
      let h = 0;
      let targetX = innerWidth / 2;
      let targetY = innerHeight / 2;
      let x = targetX;
      let y = targetY;
      /** 0 = recuadro de su tamaño, 1 = abierto a toda la pantalla (fase 1 del scroll) */
      let open = 0;

      let scrollFrame = 0;
      let followFrame = 0;
      let lockTimer: ReturnType<typeof setTimeout> | undefined;

      /* El hueco nítido (y el marco) va del recuadro a la pantalla entera según "open" */
      const paintFocus = () => {
        const left = lerp(x - w / 2, 0, open);
        const top = lerp(y - h / 2, 0, open);
        host.style.setProperty('--hole-x', `${left.toFixed(1)}px`);
        host.style.setProperty('--hole-y', `${top.toFixed(1)}px`);
        host.style.setProperty('--hole-w', `${lerp(w, innerWidth, open).toFixed(1)}px`);
        host.style.setProperty('--hole-h', `${lerp(h, innerHeight, open).toFixed(1)}px`);
        host.style.setProperty('--focus-open', open.toFixed(3));
      };

      /*
       * Progreso del scroll, en dos fases (solo escritorio con ratón; en el resto, solo la 2):
       *   1. El recuadro de enfoque crece hasta ocupar la pantalla: toda la foto, nítida.
       *   2. Cambio de foco: la foto entera se desenfoca, se oscurece y se acerca.
       */
      const update = () => {
        scrollFrame = 0;
        const t = clamp(scrollY / (innerHeight * TRANSITION_SCREENS));
        if (desktop.matches) {
          open = smoothstep(clamp(t / FOCUS_OPEN_PHASE));
          host.style.setProperty(
            '--backdrop-p',
            clamp((t - FOCUS_OPEN_PHASE) / (1 - FOCUS_OPEN_PHASE)).toFixed(3),
          );
          paintFocus();
        } else {
          host.style.setProperty('--backdrop-p', t.toFixed(3));
        }
      };
      const schedule = () => {
        if (!scrollFrame) scrollFrame = requestAnimationFrame(update);
      };

      // FOCUS_AREA de la pantalla, en proporción FOCUS_RATIO
      const resize = () => {
        h = Math.sqrt((FOCUS_AREA * innerWidth * innerHeight) / FOCUS_RATIO);
        w = h * FOCUS_RATIO;
        schedule();
      };

      const follow = () => {
        x += (targetX - x) * FOCUS_FOLLOW;
        y += (targetY - y) * FOCUS_FOLLOW;
        if (Math.abs(targetX - x) < 0.5 && Math.abs(targetY - y) < 0.5) {
          x = targetX;
          y = targetY;
          followFrame = 0;
        } else {
          followFrame = requestAnimationFrame(follow);
        }
        paintFocus();
      };

      /* El recuadro sigue al ratón con inercia; al pararse, "bloquea" el enfoque (is-locked) */
      const move = (event: PointerEvent) => {
        // Solo mientras se ve el hero: más abajo el fondo ya está desenfocado del todo
        if (!desktop.matches || event.pointerType !== 'mouse' || scrollY > innerHeight) return;
        targetX = event.clientX;
        targetY = event.clientY;

        host.classList.remove('is-locked');
        clearTimeout(lockTimer);
        lockTimer = setTimeout(() => host.classList.add('is-locked'), FOCUS_LOCK_MS);

        if (reducedMotion.matches) {
          x = targetX;
          y = targetY;
          paintFocus();
        } else if (!followFrame) {
          followFrame = requestAnimationFrame(follow);
        }
      };

      resize();
      update();
      host.classList.add('is-locked');
      addEventListener('scroll', schedule, { passive: true });
      addEventListener('resize', resize);
      addEventListener('pointermove', move, { passive: true });

      destroyRef.onDestroy(() => {
        cancelAnimationFrame(scrollFrame);
        cancelAnimationFrame(followFrame);
        clearTimeout(lockTimer);
        removeEventListener('scroll', schedule);
        removeEventListener('resize', resize);
        removeEventListener('pointermove', move);
      });
    });
  }
}

const clamp = (value: number) => Math.min(1, Math.max(0, value));
const lerp = (from: number, to: number, t: number) => from + (to - from) * t;
/** Arranca y frena suave, como el anillo de enfoque de un objetivo */
const smoothstep = (t: number) => t * t * (3 - 2 * t);
