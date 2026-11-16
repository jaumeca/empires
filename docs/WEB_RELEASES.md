# EMPIRES — Registro de versiones web (`production-web`)

Cada versión estable publicada en la rama `production-web`. El propietario decide cuándo desplegar cada una desde Hostinger (ver `DEPLOY_WEB.md`). Para recuperar una versión: compilar su commit.

| Versión | Fecha | Commit en `production-web` | Commit de desarrollo de origen | Guardado | Contenido | Comprobaciones |
|---|---|---|---|---|---|---|
| 0.6.0 | 2026-11-16 | `ac31f27` | `ac31f27` (mismo commit) | v9 (carga v0–v9) | 0.5.1 + **historia del estudio** (recuerdos desde la estantería y los trofeos; historia de cada producto desde su caja) y **6 logros** que desbloquean 6 decoraciones (pestaña Trofeos) | 136 pruebas; e2e play, decor, contracts, persistence, desktop, team, pause 16/16, story 10/10; actualización real desde 0.5.1 (esquema 8 → 9) sin errores |
| 0.5.1 | 2026-11-16 | `69518f2` | `69518f2` (mismo commit) | v8 | 0.5.0 + **la pausa congela el mundo** (Empirians, burbujas, confeti y pantallas quietos; interfaz, cámara y decoración activas; sin saltos al reanudar) | 130 pruebas; e2e pause 16/16, play 21/21, decor 10/10, contracts 10/10, persistence 10/10, desktop 15/15, team 13/13 |
| 0.5.0 | 2026-11-16 | `7710f0c` | `7710f0c` (mismo commit) | v8 (carga v0–v8) | Todo lo de 0.4.0 + GT.1: candidatos, contratar y despedir, sueldo semanal, rasgos, trabajo en equipo, escritorio propio por empleado | Ver entrada |
| 0.4.0 | 2026-11-16 | `3dc2cb8` | `3dc2cb8` (mismo commit) | v7 (carga v0–v7) | Primera versión web estable: A Living Studio completo (experiencia del fundador, oficina personalizable, Empires Daily, eventos, encargos), revisión económica, web para ordenador (teclado/ratón), guardado blindado | Ver entrada |

## 0.5.0 — primera contratación (Growing Together GT.1)

- **Incluye:** 0.4.0 + equipo (botón de equipo o tecla T tras publicar un juego o entregar un encargo; hace falta comprar un escritorio para contratar).
- **Comprobaciones:** 128 pruebas; compilación; e2e play 21/21, decor 10/10, contracts 10/10, persistence 10/10, desktop 15/15, team 13/13; **actualización real**: una partida guardada por la 0.4.0 compilada desde `production-web` (esquema 7) se abre en la 0.5.0 (esquema 8) con el mismo proyecto y sin errores.
- **Conocido:** en la habitación actual solo cabe un empleado (GT.4); el dinero sigue acumulándose a largo plazo (GT.7).

## 0.4.0 — primera versión web estable

- **Incluye:** v0.1 jugable (crear juegos, decisiones, lanzamiento, críticas, cajas coleccionables) + LS.1–LS.9 + F3.1 + experiencia de escritorio + guardado a prueba de URLs de prueba + versión/commit en el menú.
- **Comprobaciones:** 122 pruebas; `npm ci` + `npm run build` desde un clon limpio de `production-web`; e2e play 21/21, decor 10/10, contracts 10/10, persistence 10/10, desktop 15/15; `dist/` servido como estático en raíz y subcarpeta.
- El menú del juego muestra `EMPIRES v0.4.0 · 3dc2cb8 · <fecha de compilación>`.
- **Conocido / pendiente:** sin validar en móviles reales (F1.11); inglés en borrador; Q-011 (uso del dinero acumulado) abierta.
