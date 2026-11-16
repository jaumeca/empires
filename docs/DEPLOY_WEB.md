# EMPIRES — Despliegue de la versión web (Hostinger)

> El despliegue lo hace el propietario. Este documento explica cómo. Claude Code **no** publica, no configura proveedores, no toca DNS ni el dominio.

## Resumen rápido

| Qué | Valor |
|---|---|
| Rama | **`production-web`** (solo versiones estables; el desarrollo va en `claude/friendly-ptolemy-klybh8`; `main` no se toca) |
| Node.js | **22.x, versión 22.12 o superior** (Vite 8 no funciona con Node 18 ni con 22.0–22.11) |
| npm | **11** recomendado (el proyecto declara `npm@11.21.1`). **npm 10 también instala bien con `npm ci`** (comprobado con 10.9.9: solo avisa por la versión) |
| Instalación | `npm ci` |
| Compilación | `npm run build` (comprueba los tipos y compila) |
| Carpeta que se sirve | **`dist/`** |
| Variables de entorno | Ninguna obligatoria (ver abajo `EMPIRES_COMMIT`, opcional) |
| Servidor | Cualquier alojamiento de **archivos estáticos**. Sin backend, sin base de datos, sin servidor de Vite |

## Qué contiene `dist/`

```
dist/
├── index.html          ← página del juego
├── .htaccess           ← opcional, para Apache/LiteSpeed (caché)
└── assets/
    ├── index-<hash>.js  ← juego completo (Three.js incluido)
    └── index-<hash>.css
```

- Todos los modelos voxel, texturas e iconos se generan por código: no hay imágenes ni modelos externos que copiar.
- No se carga nada de otros dominios (ni fuentes, ni analítica, ni CDN). Funciona sin conexión una vez cargado.
- Las rutas son **relativas** (`base: './'` en `vite.config.ts`): el juego funciona en la raíz del dominio (`https://dominio/`) o en una subcarpeta (`https://dominio/juego/`) sin cambiar nada. Comprobado sirviendo `dist/` con un servidor estático simple desde una subcarpeta.
- Es una sola página sin rutas internas: **no hacen falta reglas de reescritura**.

## Opción A — Hostinger compila el proyecto (planes con aplicaciones Node.js)

Si tu plan permite crear una aplicación web desde un repositorio Git con paso de compilación:

1. Conecta el repositorio `jaumeca/empires` y elige la rama **`production-web`**.
2. Versión de Node.js: **22.x** (22.12 o superior).
3. Comando de instalación: `npm ci`
4. Comando de compilación: `npm run build`
5. Directorio de salida / publicación: `dist`
6. Si el panel pide un comando de arranque: no hace falta ninguno; es un sitio estático. Si obliga a poner uno, usa la opción "sitio estático" o la opción B.

## Opción B — Subir los archivos ya compilados (cualquier plan, también hosting compartido)

No todos los planes de Hostinger ejecutan Node.js. El despliegue **Git** del hosting compartido (hPanel → Avanzado → Git) **solo copia el repositorio, no compila**, así que servir el repositorio tal cual **no funciona** (el `index.html` de la raíz es el de desarrollo). En ese caso:

1. En tu ordenador (con Node 22.12+):
   ```bash
   git clone -b production-web https://github.com/jaumeca/empires.git
   ```
   ```bash
   cd empires
   ```
   ```bash
   npm ci
   ```
   ```bash
   npm run build
   ```
2. Sube el **contenido** de `dist/` (no la carpeta, sino lo que hay dentro, incluido `.htaccess` y `assets/`) a `public_html/` (o a la subcarpeta que quieras) con el Administrador de archivos de hPanel o por FTP.
3. Si tu cliente FTP oculta los archivos que empiezan por punto, activa "mostrar archivos ocultos" para subir `.htaccess` (es opcional pero recomendable).

## Actualizar la versión desplegada

1. Mira el registro de versiones (`docs/WEB_RELEASES.md`) para saber qué commit de `production-web` quieres.
2. Opción A: pulsa "volver a desplegar" (o activa el despliegue automático al hacer push en `production-web`).
3. Opción B: vuelve a compilar y **sustituye** los archivos: borra la carpeta `assets/` antigua y sube la nueva junto con `index.html` (los nombres de los archivos cambian en cada versión; los antiguos pueden quedarse, pero ocupan espacio).
4. Abre el juego y comprueba en **Menú** la línea `EMPIRES v… · <commit> · <fecha>`: debe coincidir con la versión desplegada. Si sigue la anterior, recarga con Ctrl+F5 (el `.htaccess` evita casi siempre este problema).
5. **Las partidas no se pierden al actualizar** (ver abajo).

Para volver a una versión anterior: en `production-web` cada versión estable tiene su commit en `docs/WEB_RELEASES.md`; compila ese commit (`git checkout <commit>`, `npm ci`, `npm run build`) y súbelo. **Cuidado:** una versión antigua no sabe abrir partidas guardadas por una más nueva; no las borra (las aparta en una ranura de cuarentena del navegador), pero empezará una partida nueva. Antes de volver atrás, exporta tu partida; al volver a la versión nueva, impórtala.

## Caché (`.htaccess`)

Incluido en `dist/` (se origina en `public/.htaccess`). Solo lo leen servidores Apache/LiteSpeed (lo habitual en Hostinger). Hace que el navegador pida siempre el `index.html` nuevo y guarde en caché los archivos de `assets/` (sus nombres llevan un código que cambia en cada versión). Si tu servidor no lo usa, no pasa nada.

## Variables de entorno

- **Ninguna obligatoria.**
- `EMPIRES_COMMIT` (opcional): si el servidor compila sin la carpeta `.git`, el menú mostrará `unknown` como commit. Para verlo, define `EMPIRES_COMMIT` con el commit desplegado. No contiene secretos.

## Partidas guardadas (importante)

- Se guardan **en el navegador** (`localStorage`) del dispositivo, sin cuentas ni servidores. El juego funciona sin conexión.
- Están ligadas al **origen web**: protocolo + dominio + puerto. `https://expires.top`, `http://expires.top`, `https://www.expires.top` y un subdominio son orígenes distintos y **no comparten partidas**. Elige una dirección y úsala siempre (lo ideal: HTTPS y una sola forma del dominio).
- **No se sincronizan** entre dispositivos ni entre navegadores. Para llevar una partida a otro sitio: Menú → *Exportar partida* (archivo `.empires`) y en el otro dispositivo Menú → *Importar partida*.
- Borrar los datos del sitio en el navegador o usar navegación privada elimina las partidas: exporta de vez en cuando.
- **Actualizar el juego no borra nada**: el formato tiene versión y migraciones (las partidas de la primera v0.1 siguen cargando, comprobado en `tools/e2e/persistence.cjs`). El juego guarda solo al pausar, al decidir, cada semana del juego y **al cerrar la pestaña o cambiar de aplicación**. Mantiene dos copias de seguridad y aparta (no borra) los archivos dañados.
- Las direcciones de prueba (`?debug`, `?fresh`, `?seed=`) solo sirven para desarrollo: `?fresh` y `?seed` se **ignoran** si no va `?debug`, y con `?debug` el juego usa un espacio de guardado separado, así que **nunca** tocan tu partida normal. No las uses para jugar.

## Comprobaciones hechas antes de cada versión estable

- `npm ci` limpio desde el lockfile (npm 10 y 11) y `npm run build` sin errores.
- Pruebas automáticas (`npm test`) y e2e en Chromium: partida completa, decoración táctil, encargos, persistencia/migraciones, escritorio (teclado y ratón).
- `dist/` servido por un servidor estático simple desde la raíz y desde una subcarpeta, sin errores en la consola.
- No incluye: validación en móviles reales (pendiente, F1.11).

## Qué no hace falta configurar

GitHub Pages, Vercel, Netlify, Cloudflare ni ningún otro proveedor; ninguna base de datos; ningún backend; ninguna clave. No cambies DNS por este juego.
