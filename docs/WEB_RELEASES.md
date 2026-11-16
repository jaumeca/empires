# EMPIRES — Registro de versiones web (`production-web`)

Cada versión estable publicada en la rama `production-web`. El propietario decide cuándo desplegar cada una desde Hostinger (ver `DEPLOY_WEB.md`). Para recuperar una versión: compilar su commit.

| Versión | Fecha | Commit en `production-web` | Commit de desarrollo de origen | Guardado | Contenido | Comprobaciones |
|---|---|---|---|---|---|---|
| 0.4.0 | 2026-11-16 | `3dc2cb8` | `3dc2cb8` (mismo commit) | v7 (carga v0–v7) | Primera versión web estable: A Living Studio completo (experiencia del fundador, oficina personalizable, Empires Daily, eventos, encargos), revisión económica, web para ordenador (teclado/ratón), guardado blindado | Ver entrada |

## 0.4.0 — primera versión web estable

- **Incluye:** v0.1 jugable (crear juegos, decisiones, lanzamiento, críticas, cajas coleccionables) + LS.1–LS.9 + F3.1 + experiencia de escritorio + guardado a prueba de URLs de prueba + versión/commit en el menú.
- **Comprobaciones:** 122 pruebas; `npm ci` + `npm run build` desde un clon limpio de `production-web`; e2e play 21/21, decor 10/10, contracts 10/10, persistence 10/10, desktop 15/15; `dist/` servido como estático en raíz y subcarpeta.
- El menú del juego muestra `EMPIRES v0.4.0 · 3dc2cb8 · <fecha de compilación>`.
- **Conocido / pendiente:** sin validar en móviles reales (F1.11); inglés en borrador; Q-011 (uso del dinero acumulado) abierta.
