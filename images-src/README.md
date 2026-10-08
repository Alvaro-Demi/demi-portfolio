# Originales de las fotografías

Aquí van las fotos a máxima calidad. No se publican ni se versionan (solo este README).

1. Guarda cada foto con el id que usa `src/app/data/home.data.ts`:
   `hero`, `work-01` … `work-06`, `interlude`, `about` (por ejemplo `hero.jpg`).
2. Ejecuta `npm run images`. Genera `public/images/photos/{id}-{640|1080|1600|2400}.webp`.
3. Copia el `width` y `height` de la tabla que imprime a `home.data.ts`, y ajusta `alt` y `focus`.

Lo ideal es que el original mida al menos 2400 px de ancho.
