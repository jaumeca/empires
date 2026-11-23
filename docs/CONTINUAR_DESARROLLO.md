# Continuar el desarrollo de EMPIRES

Actualizado: 2026-11-23 tras publicar 0.13.0 (alcance y tester). Todo el trabajo está confirmado y subido; no hay nada a medias.

## Estado
- **Rama de desarrollo:** `claude/friendly-ptolemy-klybh8` (último commit `d77a304` o posterior).
- **production-web:** 0.13.0 (`877f6ff`), estable y verificada (ver `docs/WEB_RELEASES.md`). `main` sin tocar.
- **Guardado:** esquema v10 (carga v0–v10). Campos nuevos opcionales, sin migración: `Empirian.role`, `Project.storyEvents`, `ActiveContract.renegotiated`, `result.criticCovered`.
- **Verificación al cerrar:** `npx vitest run` → 187 pruebas OK; `npm run build` OK. Las 16 suites e2e pasaron en la versión 0.10.0.

## Hecho en la última sesión
- E.2 Reparto de tareas (D-054): `src/sim/systems/project.ts` (roles, `mixPenalty`, `testWhileBuilding`, `hasActiveTester`), comando `set_role`, UI en `src/ui/gameUI.ts` (`rolesSection`), `SIM_CONFIG.roles`.
- Primeros eventos de historia (D-055): `src/sim/systems/storyEvents.ts`, integrados en `src/sim/systems/events.ts` (portavoz `speakerId`), `SIM_CONFIG.storyEvents`, textos en `src/i18n/es.ts`/`en.ts`.
- Correcciones: el tutorial cuenta los eventos como decisiones; la experiencia de gestión va al fundador; el "¿Por qué?" ya no culpa a eventos ajenos (`src/sim/systems/market.ts`).
- Pruebas: `tests/sim/roles.test.ts`, `tests/sim/storyEvents.test.ts`; e2e `tools/e2e/roles.cjs`, `tools/e2e/events.cjs`. Ayudas de depuración (`?debug`): `__empires.play(n)` y `__empires.forceEvent(kind)`.

## Tareas pendientes (orden recomendado)
1. ~~E.3 Relaciones~~ hecho en 0.11.0 (D-056, `src/sim/systems/relations.ts`). F3.4 deuda técnica hecha (D-057, `src/sim/systems/debt.ts`). Idea de alcance hecha (D-058). Siguiente paso exacto: **F3.8 consecuencias persistentes entre proyectos** (promesas incumplidas, reputación por tipo de fallo: bugs o retrasos) o **D.4 tipos de proyecto** (indie pequeño / ambicioso / por encargo), reutilizando `market.ts`, `story.ts` y el registro causal.
2. **D.3/D.4:** decisiones de alcance, deuda técnica y comentarios de usuarios; diferenciar juego indie, ambicioso y por encargo (F3).
3. **GT.6 productos persistentes** (y el evento aplazado "un juego antiguo vuelve a estar de moda"); **GT.7** reequilibrio económico; **AW.F** pequeñas satisfacciones.
4. Que la estimación de plazo al crear un juego tenga en cuenta los papeles.
5. F1.11: validación en móviles reales (pendiente de dispositivos del propietario).

## Problemas conocidos
- (Resuelto en 0.14.0) El giro en pausa tenía causa real en `EmpirianActor.step()`; ver D-059.
- La captura `docs/screenshots/g13-reviews.jpg` sale semitransparente (ya en 0.9.0).
- La prueba de economía es sensible a la suerte: usa 12 semillas y umbral 0,92× (D-055).
- Las suites e2e deben ejecutarse en serie y solas (la de pausa falla con CPU compartida); los e2e que avanzan el tiempo deben contestar decisiones (`__empires.play`).

## Flujo de publicación (resumen)
Build → `npx vitest run` → e2e en serie con `npx vite preview --port 4173` → galería (`npm run gallery`) → prueba de actualización desde la versión anterior → commit → comprobar ancestro y `git push origin <commit>:refs/heads/production-web` → fila en `docs/WEB_RELEASES.md`. Nunca `main`, nunca PR, nunca desplegar en Hostinger (lo hace el propietario).
