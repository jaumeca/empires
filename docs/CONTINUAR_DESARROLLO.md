# Continuar el desarrollo de EMPIRES

Actualizado: 2026-11-26 tras publicar 0.20.0. Todo confirmado y subido.

## Estado
- **Rama de desarrollo:** `claude/friendly-ptolemy-klybh8`.
- **production-web:** 0.20.0 (`91533a8`), estable y verificada. `main` sin tocar.
- **Guardado:** esquema v12 (carga v0–v12); 0.19.0 añade campos opcionales (`company.inspirations`, `company.lastIdeaDay`, `result.anniversaries`, `project.inspired`).
- **Verificación al cerrar:** 335 pruebas; 26 suites e2e en serie; galería 56.

## Hecho en la última sesión
- 0.18.0: gestos y personalidad (D-065), oficina viva, sonido (D-066), shaders validados.
- 0.19.0: identidad de cada juego y recuerdos físicos (D-067: `src/render/productArt.ts`, `src/render/models/collection.ts`), ideas del equipo (D-068: `src/sim/systems/inspiration.ts`; estrategia «N» en `tools/sim-runner/careers.ts`).
- 0.20.0: recomendación de clientes y personalidad en el debate (D-069); ritmo medido con el simulador (`notable` en `tools/sim-runner/careers.ts`) y acortado con ideas de «ensoñación».
- Lección de método: no ejecutar `vitest` (simulaciones de carrera) mientras corren las e2e: altera los tiempos.

## Tareas pendientes (orden recomendado)
0. **Siguiente:** bloque 10 (calidad de vida: clics, paneles, cámara, móvil, atajos, colocar y mover muebles), más decisiones contextuales (oficina frente a proyecto; juego antiguo de moda como evento propio), animaciones de interacción con objetos (consola, plantas) y medidas en dispositivos reales.
0b. **Pendientes antiguos de «Make the Game Come Alive»:** 2 (animaciones y personalidad: estirarse, celebrar, frustración, saludar, café, cansancio), 3.2/3.3 (objetos nuevos y recuerdos físicos de hitos; registrar en `ASSET_REGISTRY.md`), 6 (decisiones contextuales), 7 (sonido procedural con volumen y silencio), 8 (revisar ritmos de progresión con `tools/sim-runner`), 10 (rendimiento: los tirones de compilación de shaders ya están corregidos en desarrollo, sin publicar; falta medir en dispositivos reales).
1. ~~E.3 Relaciones~~ hecho en 0.11.0 (D-056, `src/sim/systems/relations.ts`). F3.4 deuda técnica hecha (D-057, `src/sim/systems/debt.ts`). Idea de alcance (D-058) y reputación con memoria (D-059) hechas. D.4 (D-060), conexiones (D-061) y progresión por desbloqueos (D-062, `docs/PROGRESSION.md`, `src/sim/systems/progress.ts`) hechos. Las suites e2e de mecánicas llaman a `__empires.unlockAll()`; `progression.cjs` y `firstminutes.cjs` prueban el comienzo real. Siguiente paso exacto: revisar con el propietario la sensación de los primeros 30 minutos; después **GT.6 productos persistentes** (mantenimiento y parches tras el lanzamiento; con él, el evento aplazado "un juego antiguo vuelve a estar de moda") o **F3.8 (2.ª parte)**: promesas explícitas al anunciar un juego y lecciones aprendidas visibles al planear el siguiente.
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
