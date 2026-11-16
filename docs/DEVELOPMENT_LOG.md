# EMPIRES — Registro de desarrollo

Registro cronológico de bloques de trabajo. Lo más reciente, arriba.

---

## 2026-11-16 — Quinta sesión (1.ª parte): versión web estable 0.4.0

### Resumen
LS.9 cerrada (sesión anterior) y verificada; preparación de una versión web estable para que el propietario la despliegue desde Hostinger: guardado blindado, versión visible, experiencia de ordenador, guía de despliegue y rama `production-web`. Nueva etapa "Growing Together" documentada.

### Estado real verificado
- **Hechas:** LS.1, LS.2, LS.3, LS.4, LS.5, LS.7, LS.8, LS.9, F3.1, WEB.1–WEB.6.
- **Parcial:** LS.6 (cola de ventas y resurgimientos hechos; falta la historia del producto al tocar su caja → GT.6/F3.9).
- **Pendientes:** F3.2–F3.10; F1.11/WEB.7 (móviles reales, del propietario); GT.1–GT.7.

### Cambios
- **Guardado a salvo (D-045):** `?debug` usa ranuras propias; `?fresh`/`?seed`/`?stress` solo con `?debug`. Antes, abrir `?fresh` sobrescribía la partida real al autoguardar: **riesgo de pérdida eliminado**.
- **Versión 0.4.0** y commit en el menú (inyectados por Vite).
- **`public/.htaccess`** opcional (caché correcta tras actualizar).
- **Ordenador (D-043):** atajos de teclado, fantasma que sigue al ratón y clic para colocar, diálogos laterales en pantallas grandes, pistas de teclado solo con ratón. Corregido: Espacio no reanudaba tras pausar.
- **Estimación de proyecto** con la velocidad de la oficina (de LS.9).
- **Docs:** `DEPLOY_WEB.md`, `WEB_RELEASES.md`, D-043–D-045, Q-011 respondida, ROADMAP (WEB, GT), GAME_DESIGN §18 y §24, README.

### Pruebas ejecutadas (realmente)
- `npx vitest run`: 17 archivos, 122 pruebas, todas pasan. `tsc` y `npm run build` sin errores.
- `npm ci` limpio desde el lockfile con npm 10.9.9 y con npm 11.21.1, seguido de compilación: correcto.
- `dist/` servido con un servidor estático simple (Python) en una subcarpeta: carga sin errores ni peticiones fallidas; el bundle no hace peticiones a otros dominios.
- E2E (Chromium): `play` 21/21, `decor` (táctil) 10/10, `contracts` 10/10, `persistence` 10/10 (partida v1 tras actualizar, guardado al ocultar, `?fresh` inofensivo, sandbox, exportar/importar, versión en el menú), `desktop` 15/15 (teclado, ratón, 1280×720 a 2560×1440).
- Galería regenerada (30 capturas).
- **No** probado en móviles reales.

### Problemas encontrados
- `?fresh` podía borrar la partida real (corregido, ver arriba).
- Espacio pausaba pero no reanudaba (la pausa manual se recordaba a propósito para los menús): velocidad de juego separada para el atajo.
- El panel de proyecto (dos columnas) no cabía como diálogo lateral en 1366×768: se queda centrado.
- La galería esperaba la "gran idea" como primera decisión y colocaba muebles con clics que ahora confirman: actualizada.

### Pendiente
- Validación en móviles reales; inglés en borrador; GT.1 (contratar) es lo siguiente.

---

## 2026-11-16 — Cuarta sesión: "A Living Studio"

### Resumen
El estudio pasa de encadenar juegos a ser un pequeño mundo vivo: el fundador aprende haciendo, la oficina se compra, coloca y mueve con efectos reales, el mundo publica su periódico (Empires Daily) con tendencias, competidores y economía, aparecen eventos dinámicos con consecuencias diferidas y la primera actividad alternativa (encargos de clientes). Cierra con una revisión económica de un año con 9 estrategias. Sin cambios de motor, arquitectura ni identidad visual; guardado v1→v7 con migraciones.

### Commits
| Commit | Contenido |
|---|---|
| `60ad307` | Respuestas del propietario (D-032–D-036) y plan "A Living Studio" |
| `829a215` | LS.1 Experiencia y habilidades del fundador (D-037) |
| `302360e` | LS.2–LS.4 (simulación): catálogo, reglas de colocación, efectos, guardado v4 (D-038) |
| `aecdf0d` | LS.2–LS.4 (vista): oficina dinámica, modo decoración táctil, modelos voxel |
| `9c33358` | LS.5–LS.6 Empires Daily, tendencias, competidores, cola de ventas, resurgimientos (D-039) |
| `e097045` | LS.7 Eventos dinámicos con efectos diferidos (D-040) |
| `081dde9` | LS.8 Encargos externos (D-041) |
| (este) | LS.9 Revisión económica (D-042, Q-011), galería ampliada, avisos en móvil, documentación |

### Pruebas ejecutadas (realmente, en este entorno)
- `npx vitest run`: **17 archivos, 122 pruebas, todas pasan** (nuevas: progresión, oficina, mundo, eventos, encargos, economía; actualizadas: guardado, i18n, arquitectura).
- `npx tsc --noEmit` y `npm run build`: sin errores.
- E2E en Chromium (SwiftShader, escritorio 1280×720): `play.cjs` 21/21, `decor.cjs` 10/10 (con toques), `contracts.cjs` 10/10.
- `npm run gallery`: 30 capturas (8 nuevas, g22–g29).
- **No** hay pruebas en dispositivos móviles reales (F1.11 sigue pendiente).

### Mediciones de balance (detalle en `GAMEPLAY_REVIEW.md` §9 y D-037–D-042)
- Aprendizaje: ≈ +1,3 de nota media tras 10 juegos; programación ≈ 6,8 tras un año.
- Oficina: sensata +9 % al año, cara solo +2 % más; imprescindible para proyectos largos (energía).
- Tendencias: perseguir cualquiera −37 %; anticiparse −10 % con más riesgo.
- Eventos: ninguna opción domina en todos los contextos.
- Encargos: ≈ 57 % de los ingresos de "solo juegos", menos riesgo, ≈ 10 % de entregas tarde.
- **Excedente de dinero**: 137 000–310 000 € al año en todas las estrategias → Q-011.

### Problemas encontrados y cómo se resolvieron
- El aprendizaje hacía las especializaciones demasiado rápidas y la velocidad se acumulaba → xp en horas y velocidad suavizada (D-037).
- Las tendencias no premiaban a nadie → los rivales reaccionan en el pico y las tendencias son más fuertes (D-039).
- Eventos demasiado frecuentes y opciones dominantes; el rival dependía de la nueva fecha del jugador → ritmo limitado y fecha propia del rival (D-040).
- Encargos poco rentables y tardíos → tarifa, margen de plazo y estimación honesta (D-041).
- En la revisión: "crecer a mediano" parecía malo porque el plan automático usaba 70 días y nunca descansaba; con 98 días y descanso humano rinde +26 %/día.
- La estimación de un proyecto ignoraba el ordenador comprado → corregido.
- En móvil horizontal los avisos de noticias se apilaban y tapaban la oficina → uno a la vez y más compactos en pantallas bajas.
- La galería esperaba la "gran idea" como primera decisión; ahora responde antes a los eventos dinámicos.

### Limitaciones y deuda técnica conocidas
- Validación en móviles reales pendiente (F1.11). Las capturas de móvil son de Chromium de escritorio.
- En móvil horizontal el catálogo de decoración ocupa la mitad inferior de la pantalla; se podría plegar.
- Se puede colocar un mueble donde está el Empirian en ese momento (se aparta al moverse); solo visual.
- El inglés de los textos nuevos es borrador.
- La historia de cada producto al tocar su caja sigue pendiente (F3.9/F5).
- Los encargos no tienen todavía pantalla de "cliente" propia en el ordenador (usa las animaciones de programar/diseñar).

### Decisiones pendientes del propietario
- **Q-011**: cómo dar uso al dinero acumulado (recomendado: adelantar contratación y ampliación de F4, reequilibrar después).
- Validar en juego el ritmo de eventos, noticias y encargos (provisionales D-039–D-041).

### Próxima tarea recomendada
Probar la versión en el móvil (F1.11) y responder Q-011. Si se aprueba la opción recomendada: primer empleado con salario (F4 adelantado) y, a continuación, F3.2 (funcionalidades y alcance).

---

## 2026-11-15 — Tercera sesión: consolidación de la v0.1 y arranque de F3

### Resumen
Consolidación técnica completa (instalación, idiomas, historial, guardado, móvil horizontal), galería de revisión visual, revisión del gameplay con simulaciones y corrección de tres estrategias dominantes, desglose de F3 y primera tarea de F3 (momentos decisivos contextuales).

### Commits
| Commit | Contenido |
|---|---|
| `d364c77` | npm ≥ 11 sin `--legacy-peer-deps`, versiones exactas, decisiones aprobadas (D-028) |
| `ebf36bf` | Internacionalización: español base, inglés en borrador, guardado v2 (D-031) |
| `44872b9` | Compactación del historial, SaveManager con copias y cuarentena (D-029) |
| `3e3f836` | Galería de revisión con índice; ventanas en dos columnas en móvil horizontal |
| `d4bac26` | Revisión del gameplay y ajustes de balance (D-030) |
| `bec5774` | F3.1: momentos decisivos contextuales |
| (este) | Documentación: roadmap F3, decisiones, registro, arquitectura |

### Estado real del roadmap
- **F1.11, F1.12, F2.12: siguen pendientes** (dispositivos reales y revisión/juego del propietario). No se han marcado como hechas.
- **F3:** desglosada en 10 tareas; **F3.1 hecha**. Siguiente: F3.2 (funcionalidades y alcance).

### Pruebas ejecutadas
| Prueba | Resultado |
|---|---|
| `npm test` | ✅ 73/73 (antes 40): + idiomas (8), partidas largas (6), gestor de guardado (7), migración 1→2 con partidas reales (2), no-dominancia (6), momentos contextuales (4) |
| `npm run typecheck`, `npm run build` | ✅ |
| `npm audit` (npm 11) | ✅ 0 vulnerabilidades |
| Instalación desde cero sin indicadores (npm 11.21.1 y 12.2.1) | ✅ |
| e2e en Chromium contra la build de producción | ✅ 21/21 (añadidas: recuperación de autoguardado dañado, cuarentena, momento contextual) |
| Simulación de estrategias (648 planes × 30 semillas) | ✅ ejecutada antes y después de D-030 |
| **Rendimiento en móviles reales** | ⏸ **No probado**. Chromium de escritorio no lo valida. |
| Diversión / claridad | ⏸ **No evaluable automáticamente** (F2.12) |

### Problemas encontrados
- **`--legacy-peer-deps`:** fallo interno de npm 10.9.x al instalar Vitest (reproducido de forma aislada). Solución: npm ≥ 11.
- **Errores introducidos y detectados por las pruebas e2e durante la sesión:** el guardado al ocultar la página sobrescribía una partida recién importada (corregido con una marca de recarga).
- **El worker de la sesión se reinició** a mitad de la galería; no se perdió trabajo (se rehízo el paso y se reverificó todo).
- **Momento "bugs acumulados"** retirado por no tener consecuencias apreciables.
- **La imagen de referencia sigue sin recibirse.** No se ha usado ningún recurso externo ni se ha cambiado la estética.

### Capturas
`docs/screenshots/README.md` — 22 capturas con índice (JPEG, 2 MB), regenerables con `npm run gallery`.

### Balance: antes y después de D-030 (plan por defecto de 42 días, 30–40 semillas)
| | Antes | Después (con F3.1) |
|---|---|---|
| Gran idea: aprobar / sencilla / mantener | 37 701 / 30 532 / 24 298 € | 32 529 / 29 148 / 23 202 € (y la aprobación es una apuesta) |
| Ritmo a 28 días: tranquilo / normal / crunch | 5 509 / 14 831 / 8 917 € | 5 325 / 14 645 / 17 178 € (crunch con descanso; ignorando el agotamiento: ~10 700 €) |
| Tamaño: pequeño / mediano | 26 658 / 20 704 € | 26 350 / 55 671 € (mediano en ~3× el tiempo) |
| Planes a menos del 5 % del mejor | 2 de 648 | 7 de 648 |
| Decisiones por proyecto | 2 | 3–4 |
| Variación de la nota con el mismo plan | ± 0,23 | ± 0,25 |

### Limitaciones y deuda conocidas
- La traducción inglesa es un borrador sin revisar.
- Escala económica sin presión (sobra dinero): pendiente de decisión tras F2.12.
- Los mejores planes siguen usando presupuesto alto: el presupuesto aún no es una decisión interesante (F3.6).
- Resultados previsibles (± 0,25) hasta que lleguen los riesgos (F3.3).
- El guardado sigue en localStorage (D-023): revisar antes de versiones comerciales.
- En móviles pequeños (667×375) la tarjeta de nuevo proyecto aún pide un pequeño desplazamiento.

### Decisiones pendientes del propietario
1. **F1.12** — revisión visual con la galería (identidad, cámara D-009a, escala D-022).
2. **F2.12** — jugar la v0.1 y valorar diversión, ritmo y claridad.
3. **Escala económica** (GAMEPLAY_REVIEW §2): ¿reducir ingresos para que el dinero importe?
4. **Experiencia del fundador en F3.8** (adelanta una parte pequeña de F4): ¿aprobada?
5. **Dispositivos** para F1.11.
6. Revisión de la traducción inglesa cuando se quiera activar.

### Próxima tarea
F3.2 — Funcionalidades y alcance personalizables.

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
