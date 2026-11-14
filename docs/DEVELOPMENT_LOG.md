# EMPIRES — Registro de desarrollo

Registro cronológico de bloques de trabajo. Lo más reciente, arriba.

---

## 2026-11-14 — Bloque 3: pulido visual

- Planta rediseñada con hojas anchas (antes se leía como un cactus).
- El puf (se veía como una caja o un pastel escalonado) se sustituye por un **sillón** acogedor; el Empirian se sienta mirando al jugador.
- Peinados con las esquinas superiores recortadas (silueta menos "caja").
- La burbuja de diálogo se ancla sobre el pelo, no en el cuello.
- Comprobado: `npm test` 40/40, build ✅, e2e 18/18, estrés 91 draw calls. Capturas regeneradas.

---

## 2026-11-14 — Bloque 2 de la sesión autónoma: estrés, exportar/importar, pausa manual

- **F1.10 escena de estrés** (`?stress=10`, `tools/e2e/stress.cjs`): 11 Empirians → 91 draw calls, 81 k triángulos (antes de fusionar cabeza+pelo: 102). Captura `13-stress-10.png`. Los Empirians extra son solo visuales y se solapan entre sí: la evitación entre personajes se hará con la contratación (F4).
- **Exportar/importar** probados de extremo a extremo (descarga real del archivo `.empires` y selector de archivos): e2e ahora **18/18**.
- **Bug corregido:** si el jugador pausaba y abría el menú, al cerrarlo el juego se reanudaba. Ahora la pausa manual se respeta; tras un Momento Decisivo el juego sí continúa.
- **Tarjetas compactas** en pantallas bajas (móvil horizontal): captura `12-phone-new-project.png`.
- Pruebas: `npm test` 40/40, `npm run build` ✅, e2e 18/18.

---

## 2026-11-14 — Sesión autónoma F1–F2 (Claude Code)

### Resumen

EMPIRES se puede jugar de principio a fin en el navegador: crear al Empirian fundador, ver la habitación voxel, crear un videojuego (tema, tamaño, enfoque, presupuesto, plazo, precio), ver al Empirian trabajar con burbujas ligadas a la simulación, tomar un Momento Decisivo, publicar, recibir críticas con explicación causal, ver las ventas semana a semana, guardar la caja en la estantería, guardar y recuperar la partida.

### Commits

| Commit | Contenido |
|---|---|
| `adbd3a5` | F1.1–F1.3, F2.1–F2.3: proyecto TS, simulación determinista, guardado versionado, balance headless |
| `67cfef1` | F1.4–F1.10, F2.4–F2.11: oficina voxel, Empirian modular animado, UI táctil y ciclo jugable |
| `75d62cb` | Vite 8 / Vitest 5 (0 vulnerabilidades), configuración de Capacitor, calzado, capturas |
| (este) | Documentación: roadmap, decisiones, registro, dirección artística, arquitectura |

### Estado real del roadmap

- **F0:** hecho (la imagen de referencia no llegó; ver Problemas).
- **F1:** hecho salvo **F1.11** (bloqueada: no hay SDK de Android/Xcode ni dispositivos) y **F1.12** (revisión del propietario). La escena de estrés con 10 Empirians (parte de F1.10) queda pendiente.
- **F2:** F2.1–F2.11 hechas; **F2.12** (prueba de juego del propietario) pendiente.

### Pruebas ejecutadas (todas realmente ejecutadas en este entorno)

| Prueba | Resultado |
|---|---|
| `npm test` — 40 pruebas Vitest (simulación, reloj, determinismo, replay, consecuencias, estimaciones, guardado y migración, límites de arquitectura, modelos voxel, Empirian, rutas) | ✅ 40/40 |
| `npm run typecheck` | ✅ |
| `npm run build` | ✅ (570 kB JS / 151 kB gzip) |
| `npm audit` | ✅ 0 vulnerabilidades (tras actualizar Vite/Vitest) |
| `npm run sim` — balance con 30–40 semillas | ✅ ver tabla abajo |
| `tools/e2e/play.cjs` contra la build de producción (Chromium headless) | ✅ 16/16 |

Comprobaciones e2e (16 en este bloque; 18 tras el bloque 2): creación del fundador, personalización aplicada por comando, inicio de proyecto, **la pausa detiene el tiempo**, 4x avanza el tiempo, burbujas generadas por eventos, decisión tomada desde la UI y registrada en el registro causal, publicación con 4 críticas, tarjeta de resultados con explicación, ventas que generan dinero, caja en la estantería, **guardar + recargar restaura el estado exacto** (comparación JSON completa), la caja persiste tras recargar, sin errores de página.

Requisitos específicos pedidos por el propietario:

| Requisito | Cómo se comprueba | Estado |
|---|---|---|
| La simulación funciona sin Three.js | Todas las pruebas de `tests/sim` se ejecutan en Node sin render; `architecture.test.ts` prohíbe importar Three.js/DOM en `src/sim` | ✅ |
| Misma semilla + mismas decisiones = mismos resultados | `determinism.test.ts` (+ replay del registro de comandos) | ✅ |
| FPS distintos no cambian resultados | `clock.test.ts`: partida completa con decisiones a 120, 60, 30, 10 y 4 FPS → estado idéntico | ✅ |
| La pausa detiene el tiempo | `clock.test.ts` + e2e | ✅ |
| Guardar y recuperar conserva el estado | `save.test.ts` (incluido continuar la partida tras cargar) + e2e | ✅ |
| Presupuesto y cronograma tienen consecuencias reales | `consequences.test.ts` (rendimientos decrecientes, óptimo interior, presupuesto que deja de compensar, pruebas, crunch, decisiones) | ✅ |
| Los Empirians se representan correctamente | `render.test.ts` (todas las combinaciones de peinado × accesorio × prenda, esqueleto, poses) + revisión visual de capturas | ✅ (revisión del propietario pendiente) |
| La compilación funciona | `npm run build` | ✅ |
| La interfaz permite completar el ciclo | e2e 16/16 | ✅ |
| **Rendimiento en móviles reales** | — | ⏸ **No probado** (sin dispositivos) |
| Exportar/importar partida desde la UI | e2e (bloque 2) | ✅ |

### Balance (npm run sim, 40 semillas, juego pequeño, enfoque ideal)

| Plan | Nota | Bugs publicados | Beneficio |
|---|---|---|---|
| 14 días | 2.0 | 6.8 | −3 641 € |
| 28 días | 5.5 | 4.4 | 15 347 € |
| 42 días | 6.5 | 0.2 | 25 419 € |
| **56 días** | 6.6 | 0.0 | **26 388 €** (óptimo) |
| 84 días | 6.8 | 0.0 | 25 802 € |
| 112 días | 6.9 | 0.0 | 24 449 € |
| Presupuesto 4 000 € vs 7 500 € | 6.53 vs 6.59 | — | 27 457 € vs 27 278 € |
| Precio 4,99 / 9,99 / 14,99 / 19,99 € | — | — | 19 169 / 25 676 / 23 805 / 18 892 € |

Más tiempo mejora la nota cada vez menos y, pasado el óptimo, reduce el beneficio: **dedicar más tiempo no garantiza mejores resultados**.

### Capturas disponibles (`docs/screenshots/`)

`01-founder-creation`, `02-room`, `03-new-project`, `04-working`, `05-decision`, `06-release-party`, `07-results`, `08-shelf-box`, `09-after-reload`, `10-phone-landscape` (844×390), `11-phone-portrait` (390×844), `cam-dimetric`, `cam-isometric`.

### Problemas encontrados y cómo se resolvieron

- **La imagen de referencia no llegó** (ni en esta sesión ni en la anterior). Se siguió con la descripción textual, como indicó el propietario.
- **Deriva de coma flotante en el reloj** (299 vs 300 ticks con fotogramas de 1000/120 ms): corregido con un épsilon en el acumulador; prueba añadida.
- **Botones del HUD reemplazados en cada cambio de estado** (el botón "¡Publicar!" se desprendía del DOM durante el toque): el HUD ahora solo se reconstruye cuando cambia su estructura y los valores se actualizan en el sitio.
- **Empirian demasiado grande** respecto al mobiliario: escala 0,78 (D-022).
- **Pelo como "caja hueca"**, **zapatos que parecían separados**, **Empirian hundido en silla, puf y alfombra**: corregidos.
- **Marketing con retorno lineal** (más presupuesto siempre ganaba) y **precio bajo siempre mejor**: rebalanceado con saturación y precio esperado según la nota (D-024).
- **Vulnerabilidades en Vite 5 / Vitest 2** (solo servidor de desarrollo): actualizado a Vite 8.3.5 / Vitest 5.0.5. npm falla al resolver *peer dependencies* opcionales; se instala con `--legacy-peer-deps` (D-025).

### Limitaciones y deuda técnica conocidas

- Rendimiento móvil sin medir (R-001 sigue abierto). Las cifras de FPS de este entorno (render por software) no son representativas.
- Textos de la UI en español incrustados en el código (sin sistema de localización todavía).
- La tarjeta de "Nuevo videojuego" es larga en móvil horizontal (hay que desplazarse).
- El registro causal no se compacta todavía (R-004); en partidas largas crecerá.
- La bancarrota no existe todavía (el dinero puede ser negativo; hay aviso de dinero bajo).
- Solo hay un tipo de producto (videojuego) y un Empirian.
- Al importar una partida o empezar una nueva, la página se recarga (forma simple y robusta de reconstruir la escena).

### Decisiones pendientes del propietario

- **F1.12:** aprobar o corregir la identidad visual (capturas), la cámara dimétrica (D-009a) y la escala del Empirian (D-022).
- **D-026:** identificador de la app `top.expires.empires` (no se puede cambiar tras publicar).
- **D-020:** ubicación de los documentos (sigue sin aprobar; no bloquea nada).
- Dispositivos físicos de prueba para F1.11.

### Próxima tarea recomendada

1. **F2.12** — Que el propietario juegue la v0.1 (`npm run dev`) y comente diversión, ritmo y claridad.
2. **F1.11** — Build Capacitor en un equipo con Android Studio/Xcode y medición en 1–2 móviles.
3. Después, **F3** (consecuencias y personalización ampliadas).
