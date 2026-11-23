# EMPIRES — Roadmap

> Versión 0.4 · 2026-11-16 ("A Living Studio" LS.1–LS.9 terminada) · Roadmap incremental. Se puede reorganizar con motivo justificado, pero **no** se eliminan funcionalidades ni se reduce la visión sin consultar al propietario.
>
> Estados: ⬜ Pendiente · 🟦 En curso · ✅ Hecho · ⏸ Bloqueado (esperando aprobación)

> **Estado (2026-11-23):** E.3 relaciones (0.11.0), F3.4 deuda técnica (0.12.0), idea de alcance (0.13.0), pausa y reputación (0.14.0), D.4 tipos de proyecto y conexiones (0.15.0) y **progresión por desbloqueos** (D-062, `docs/PROGRESSION.md`) hechas. Ver `docs/CONTINUAR_DESARROLLO.md`.

## Resumen

| Fase | Nombre | Estado | Entregable |
|---|---|---|---|
| F0 | Fundación | ✅ Hecho | Documentos maestros + decisiones aprobadas |
| F1 | El primer Empirian | 🟦 Casi completa (solo falta F1.11, móviles reales) | Habitación voxel con un Empirian animado (falta medir en móviles reales) |
| F2 | El primer proyecto | 🟦 Jugable | **v0.1 — primera versión jugable** (falta prueba de juego del propietario) |
| LS | A Living Studio (adelanta partes de F4, F5, F8) | ✅ Hecho (LS.6 parcial) | Oficina personalizable, fundador que aprende, Empires Daily, eventos, contratos |
| WEB | Versión web estable (D-043, D-044) | ✅ 0.4.0 en `production-web` | Web para ordenador con soporte táctil, guardado seguro entre versiones, guía de despliegue |
| AW | A World Alive (7.ª sesión) | 🟦 En curso | Tutorial integrado, oficina viva (rutinas), identidad, decisiones de proyecto y eventos con historias |
| ML | More Life, More Fun (6.ª sesión) | 🟦 En curso | Pausa que congela el mundo, personalización de oficina y Empirians, recuerdos, logros y desbloqueos, eventos con más vida |
| GT | Growing Together (adelanta F4, F5, F7) | 🟦 En curso | Del desarrollador solitario a un estudio: contratar, equipo, oficinas, apps y herramientas, productos con mantenimiento |
| F3 | Consecuencias y personalización | 🟦 En curso (F3.1) | Proyectos más ricos, decisiones dinámicas, registro causal visible |
| F4 | Empleados y oficinas | ⬜ | Contratación, personalidades, decoración, garaje |
| F5 | Mercado vivo | ⬜ | Productos persistentes, competidores, mantenimiento |
| F6 | Investigación | ⬜ | Tecnologías reutilizables y descubrimientos |
| F7 | Diversidad de software | ⬜ | Apps, SaaS, otros tipos; proyectos simultáneos |
| F8 | Expansión empresarial | ⬜ | Departamentos, directores, contratos, adquisiciones |
| F9 | Mundo avanzado | ⬜ | Crisis, eventos, premios, museo, rivalidades, historia |
| F10 | Preparación comercial | ⬜ | Optimización, accesibilidad, recursos finales, tiendas |

**Cambios respecto a la propuesta del propietario** (justificados, sin eliminar nada):
1. F1 se divide en pasos pequeños e incluye el **esqueleto de la simulación** (reloj, RNG, estado, guardado) sin gameplay, porque F1 debe validar "pausa" e "independencia de FPS", y porque así F2 parte de cimientos probados.
2. F2 incluye la **personalización mínima del fundador** y el **guardado en la interfaz**, que la primera versión jugable exige.
3. Se adelanta a F2 una versión mínima del **"imperio como colección de recuerdos"** (la caja del producto en la estantería), por su bajo coste y alto valor emocional.

---

## F0 — Fundación — ✅ Hecho

| ID | Tarea | Estado |
|---|---|---|
| F0.1 | Inspeccionar el repositorio | ✅ |
| F0.2 | Documentos maestros | ✅ |
| F0.3 | Analizar la imagen de referencia | ⏸ La imagen no llegó en ninguna de las dos sesiones; se trabaja con la descripción textual (ver `ART_DIRECTION.md` §1) |
| F0.4 | Revisión con el propietario | ✅ (2026-11-14) |
| F0.5 | Aprobación de decisiones | ✅ D-005…D-019, D-021 confirmadas. D-020 sigue pendiente |
| F0.6 | Preguntas abiertas prioritarias | ✅ Respondidas (ver `DECISIONS.md`) |

---

## F1 — El primer Empirian — 🟦 Casi completa (falta validación en móviles reales)

- **Dependencias:** cumplidas (F0.5, autorización de dependencias).
- **Riesgos vigentes:** R-001 (rendimiento WebView) sin medir en dispositivos.

| ID | Tarea | Estado | Evidencia |
|---|---|---|---|
| F1.1 | Esqueleto: Vite + TS estricto + Vitest + Three.js; límites de `sim/` | ✅ | `tests/architecture.test.ts` sustituye a la regla de lint (sin ESLint, ver D-027) |
| F1.2 | Núcleo de simulación: estado, reloj de paso fijo, velocidades, pausa, PRNG con semilla, eventos | ✅ | `tests/sim/clock.test.ts`, `determinism.test.ts`, `rng.test.ts` |
| F1.3 | Guardado v1: cabecera versionada, checksum, migración 0→1, rechazo de archivos corruptos | ✅ | `tests/sim/save.test.ts`. Web: localStorage (D-023) |
| F1.4 | Habitación + comparación isométrica/dimétrica | ✅ | `docs/screenshots/cam-*.png`. Elegida dimétrica provisional (D-009) |
| F1.5 | Paleta maestra + mallador voxel (AO por vértice) + mobiliario completo | ✅ | `src/render/voxel.ts`, `models/furniture.ts` |
| F1.6 | Empirian modular (esqueleto rígido, piezas, colores, cara-calcomanía) | ✅ | `tests/render/render.test.ts`; legible a ~60 px en 844×390 (captura 10) — revisión del propietario pendiente |
| F1.7 | Animaciones reposo, caminar, trabajar, celebrar (+ levantar la mano, pensar, descansar) | ✅ | Capturas 04, 06; navegación por celdas sin atravesar muebles |
| F1.8 | Burbujas ligadas a eventos + toque sobre Empirian y objetos | ✅ | e2e "bubbles appear from simulation events"; toque en ordenador/estantería/cajas/Empirian |
| F1.9 | Controles de tiempo | ✅ | e2e "pause stops simulated time", "4x speed advances time" |
| F1.10 | Panel de diagnóstico (`?debug`) y escena de estrés (`?stress=10`) | ✅ | 1 Empirian: 22 draw calls / 42 k triángulos; 11 Empirians: 91 draw calls / 81 k triángulos (dentro de presupuesto). `tools/e2e/stress.cjs`, captura 13 |
| F1.11 | Build Capacitor y medición en dispositivos | ⏸ Bloqueada | Sin Android SDK/Xcode ni dispositivos en el entorno. `capacitor.config.ts` listo; pasos en `ARCHITECTURE.md` §13. **No se declara validación móvil.** |
| F1.12 | Revisión de dirección artística y orientación | ✅ Aprobada por el propietario (D-032) | Galería: `docs/screenshots/README.md`. Dimétrica y escala 0,78 como valores actuales |

**Criterios de aceptación de F1:** cumplidos todos salvo *rendimiento en dispositivos de referencia* (F1.11) y *aprobación de la identidad visual* (F1.12).
Medido en el entorno (Chromium headless con renderizado por software SwiftShader, sin GPU): 22–25 draw calls, ~42 k triángulos, 24 geometrías — dentro de presupuesto. Los FPS medidos ahí (7–50) no son representativos de un móvil.

---

## F2 — El primer proyecto → v0.1 "Primer Lanzamiento" — 🟦 Jugable de principio a fin; pendiente de pruebas de juego

| ID | Tarea | Estado | Evidencia |
|---|---|---|---|
| F2.1 | Modelo de proyecto: fases, trabajo, calidad con rendimientos decrecientes, bugs ocultos/conocidos, energía, ritmo, costes | ✅ | `tests/sim/consequences.test.ts` |
| F2.2 | Mercado mínimo, críticas y ventas semanales; precio con óptimo | ✅ | idem + `npm run sim` |
| F2.3 | Simulador de balance sin render | ✅ | `tools/sim-runner/balance.report.ts` (`npm run sim`) |
| F2.4 | Creación del fundador (nombre, estudio, piel, peinado, pelo, ropa, color, pantalón, accesorio) | ✅ | e2e "founder customized via command" |
| F2.5 | Tarjeta de nuevo proyecto: nombre, tema, tamaño, precio, enfoque, presupuesto, plazo con estimaciones | ✅ | Capturas 03 y 12 (versión compacta en móvil horizontal; aún requiere desplazamiento para los deslizadores) |
| F2.6 | Desarrollo visible: actividades → animaciones, eventos → burbujas, pantalla del monitor | ✅ | Captura 04 |
| F2.7 | Momento Decisivo con consecuencias reales (gran idea; fecha límite) | ✅ | e2e + pruebas "decisions have real consequences" |
| F2.8 | Pulido, pruebas y lanzamiento con celebración | ✅ | Captura 06 |
| F2.9 | Resultados: críticas, ventas, dinero, "¿Por qué esta nota?" desde el registro causal | ✅ | Captura 07; prueba "every release has an explanation linked to the causal ledger" |
| F2.10 | Caja coleccionable en la estantería | ✅ | e2e "collectible box on the shelf" y "persists after reload" |
| F2.11 | Guardado en UI: autoguardado, guardar, exportar/importar, pausa al ir a segundo plano | ✅ | e2e "save + reload restores the exact state", "export produces a versioned save file", "import restores the exported game" |
| F2.12 | Pruebas de juego con el propietario y ajustes | ✅ Primera prueba hecha (D-033) | Valoración muy positiva; pide más oficina, actividades, eventos, noticias. Equilibrio y diversión **no** validados definitivamente |

**Criterios de aceptación de v0.1:**
- [x] Ciclo completo de desarrollo y lanzamiento a través de la interfaz (e2e 21/21).
- [x] Presupuesto y plazo con consecuencias coherentes; más tiempo ≠ mejor resultado (óptimo interior demostrado en pruebas y en `npm run sim`).
- [x] Al menos una decisión con consecuencias reales y explicables.
- [x] Guardar y recuperar conserva el estado exacto.
- [x] Pruebas automatizadas de los sistemas importantes; la simulación funciona sin render (73 pruebas).
- [ ] Rendimiento en dispositivos de referencia (bloqueado, F1.11).
- [~] Primera prueba de juego del propietario positiva (D-033); diversión y equilibrio definitivos pendientes de nuevas pruebas.
- [x] La pantalla principal es la habitación, no un panel.

**Consolidación (3.ª sesión, hecha):** npm sin `--legacy-peer-deps` (D-028), internacionalización (D-031), historial y guardado robusto (D-029), ventanas para móvil horizontal, galería de revisión, revisión de gameplay (D-030).

**Próximos pasos (2026-11-16, 5.ª sesión):** versión web 0.4.0 en `production-web` (WEB); GT.1 (contratar) hecha → 0.5.0; siguiente: GT.4 (oficina más grande: hoy solo cabe un segundo escritorio) o F3.2. Anterior: prueba en el móvil del propietario (F1.11) y respuesta a Q-011 (uso del dinero acumulado) → según la respuesta, primer empleado con salario (F4 adelantado) o F3.2 (funcionalidades y alcance). F1.12 y F2.12 ya hechas (D-032, D-033); "A Living Studio" terminada (LS.1–LS.9).

---

## LS — "A Living Studio" (terminada, D-036)

Objetivo: que el jugador gestione un estudio que evoluciona (dinero con usos, oficina personalizable, fundador que aprende, mundo que cambia, varias actividades), sin convertir la oficina en un panel. **Toda mecánica nueva tiene representación en el mundo** (objeto, animación, burbuja o reacción del Empirian).

| ID | Tarea | Fase de origen | Representación en el mundo | Criterios de aceptación | Depende de | Estado |
|---|---|---|---|---|---|---|
| LS.1 | **Experiencia del fundador**: programación, diseño, creatividad y gestión aprenden de la actividad real; especialización por tema; rendimientos decrecientes y techo | F4 (adelantado, D-035) | Burbuja y aviso al subir de nivel; ficha del Empirian con niveles | Aprender depende de lo que hace (prueba); techo y rendimientos decrecientes (prueba); estrategias distintas producen perfiles distintos; partidas antiguas migran | — | ✅ `systems/progression.ts`, guardado v3, `tests/sim/progression.test.ts` (D-037) |
| LS.2 | **Catálogo de oficina** (10–15 objetos como datos: id, nombre traducible, precio, tamaño, categoría, requisitos, efectos, coste recurrente, modelo) | F4 (adelantado) | Los objetos aparecen en la habitación con el estilo voxel | Definiciones independientes y validadas por pruebas; la habitación actual es la oficina inicial y se conserva | — | ✅ 19 objetos (`content/officeItems.ts`), modelos voxel (`render/models/catalogModels.ts`) |
| LS.3 | **Comprar, colocar, mover, girar y vender** en cuadrícula con colisiones y acceso del Empirian; táctil | F4 (adelantado) | Modo decoración con objeto fantasma verde/rojo | Ningún objeto bloquea el acceso (prueba); funciona con toques (e2e); guardar/cargar conserva la oficina | LS.2 | ✅ `systems/office.ts`, `ui/decorUI.ts`, `tools/e2e/decor.cjs` (10/10 con toques) |
| LS.4 | **Efectos de los objetos** (fatiga, recuperación, productividad técnica o de diseño, ambiente) con rendimientos decrecientes y contrapartidas | F4 (adelantado) | El Empirian usa los objetos (sofá, cafetera, pizarra) | Comprar siempre lo más caro **no** es óptimo (prueba de no-dominancia); efectos explicados con palabras, sin tablas | LS.3, LS.1 | ✅ Efectos sin acumulación; pruebas en `tests/sim/office.test.ts` (D-038) |
| LS.5 | **Empires Daily**: tendencias de temas (suben, alcanzan pico, desaparecen), competidores ficticios que publican, economía moderada, noticias tecnológicas; noticias = hechos simulados | F5 (adelantado) | Periódico en la oficina (corcho) y avisos breves | Cada noticia corresponde a un cambio real del estado (prueba); perseguir siempre la tendencia no es óptimo (prueba); determinista con la semilla | — | ✅ `systems/world.ts`, guardado v5, `tests/sim/world.test.ts` (D-039) |
| LS.6 | **Productos con vida propia (1.ª y 2.ª parte)**: ventas residuales tras el lanzamiento, resurgimientos y relación con noticias; caja → historia del producto | F5 (adelantado, parcial) | Cajas de la estantería | Ventas a largo plazo acotadas; un resurgimiento afecta de verdad a un producto antiguo | LS.5 | ✅ Cola de ventas y resurgimientos; historia del producto al tocar su caja (ML.2) |
| LS.7 | **Eventos dinámicos** (proyecto, energía, calidad, economía, tendencias, reputación, productos antiguos, oportunidades), con condiciones, frecuencia, opciones y efectos diferidos; base para cadenas | F3/F9 | El Empirian levanta la mano / burbuja de alerta | Cada opción cambia el resultado (prueba); efectos diferidos programados y registrados; frecuencia limitada | LS.5, LS.6 | ✅ 4 eventos + cola de efectos diferidos (`systems/events.ts`), guardado v6, `tests/sim/events.test.ts` (D-040) |
| LS.8 | **Contratos externos** como primera actividad alternativa | F8 (adelantado) | El Empirian trabaja en el ordenador con pantalla de "cliente"; tablón/tarjeta de ofertas | Ingresos previsibles a cambio de tiempo y compromiso; retrasos penalizan; da experiencia; no domina a hacer juegos (prueba) | LS.1 | ✅ `systems/contracts.ts`, guardado v7, `tests/sim/contracts.test.ts`, `tools/e2e/contracts.cjs` (10/10) (D-041) |
| LS.9 | **Revisión económica conjunta** (ingresos, gastos recurrentes, inversión, progresión) con simulaciones de estrategias | F3.10 / D-034 | — | Informe antes/después; el dinero tiene usos; estudio pequeño viable; sin compras obligatorias en cadena | LS.1–LS.8 | ✅ medición de 9 estrategias × 20 semillas × 1 año (`GAMEPLAY_REVIEW.md` §9, D-042); sin estrategias dominantes; excedente de dinero → Q-011 |

**Orden de implementación:** el del propietario (LS.1 → LS.2–LS.4 → LS.5 → LS.7 → LS.8 → LS.9), con LS.6 junto a LS.5 porque los resurgimientos y las ventas residuales dependen de las noticias y alimentan los eventos sobre productos antiguos. F3.2 (funcionalidades y alcance) y el resto de F3 continúan después de LS o intercalados si el tiempo lo permite; no hay tareas de F3 a medio hacer (F3.1 está terminada).

**Ideas registradas para fases posteriores (sin implementar ahora):** investigación tecnológica (F6), mantenimiento y actualizaciones de productos, expansiones y secuelas, portabilidad a nuevas plataformas (F5/F7), formación y descanso como actividades (F4), ferias y oportunidades comerciales (F9), gestión de productos antiguos y venta/licencia (F5/F8), historia del producto al tocar su caja (F3.9/F5), servidores en etapas posteriores de la oficina (F4/F8), eventos encadenados largos y crisis (F9).

---

## PR — Progresión: de pequeño a imperio (D-062)

| ID | Tarea | Estado |
|---|---|---|
| PR.1 | Diseño y documento de progresión (`docs/PROGRESSION.md`), auditoría antes/después (`tools/e2e/firstminutes.cjs`) | ✅ |
| PR.2 | Desbloqueos por hitos en la simulación, guardado v11 con migración, primer juego tranquilo | ✅ `systems/progress.ts`, `tests/sim/progress.test.ts` |
| PR.3 | Interfaz progresiva: HUD, primer juego, tarjeta del proyecto, Decorar; avisos, celebración, recuerdo y punto «nuevo» | ✅ e2e `progression.cjs` 15/15 |
| PR.4 | [FUTURO] Etapa «Imperio» con productos persistentes (GT.6) y clientes importantes; tutorial aún más ligero tras pruebas del propietario | ⬜ |

---

## WEB — Versión web estable (D-043, D-044, D-045)

| ID | Tarea | Estado |
|---|---|---|
| WEB.1 | Compilación estática en `dist/`, rutas relativas, sin backend ni servidor de Vite; `npm ci` desde el lockfile (npm 10 y 11) | ✅ comprobado (servidor estático en raíz y subcarpeta) |
| WEB.2 | Guardado a salvo de direcciones de prueba (`?debug` aislado), guardado al cerrar, migraciones v0→v7, exportar/importar | ✅ `tools/e2e/persistence.cjs` 10/10 |
| WEB.3 | Versión y commit visibles en el menú | ✅ 0.4.0 |
| WEB.4 | Experiencia de ordenador: atajos de teclado, colocación con ratón, diálogos laterales en pantallas grandes, formularios en dos columnas | ✅ `tools/e2e/desktop.cjs` 15/15 |
| WEB.5 | Guía de despliegue en Hostinger (`docs/DEPLOY_WEB.md`) y registro de versiones (`docs/WEB_RELEASES.md`) | ✅ |
| WEB.6 | Rama `production-web` con versiones estables | ✅ 0.4.0 |
| WEB.7 | Validación en móviles y tabletas reales | ⏸ pendiente del propietario (F1.11) |
| WEB.8 | `[FUTURO]` Aplicaciones nativas iOS/Android con Capacitor (adaptador de guardado en archivos, zonas seguras, pausa del sistema) | ⬜ |

---

## AW — "A World Alive": vida, variedad, tutorial y diversión (7.ª sesión)

Objetivo: divertido desde los primeros minutos, oficina viva y partidas distintas. Nada de más menús o números por sí mismos. Se apoya en ML, GT, F3 y LS (integra, no duplica).

| ID | Bloque | Contenido | Criterios de aceptación | Depende de | Estado |
|---|---|---|---|---|---|
| AW.A | **Primera experiencia** | Tutorial contextual de 11 pasos (fundador, oficina, velocidad, primer juego y su plan, progreso y energía, primera decisión, publicación, críticas y ventas, decorar, historia, cómo se desbloquea contratar); omitir, reiniciar desde Ayuda, guardado en la partida; textos para ratón o dedo | Pasos por hechos reales (se reconoce lo hecho por cuenta propia); nunca durante una decisión; no bloquea la pantalla; no se repite; partidas antiguas sin tutorial forzado (pruebas + e2e) | — | ✅ `systems/tutorial.ts`, `ui/tutorialUI.ts`, guardado v10, `tests/sim/tutorial.test.ts`, `tools/e2e/tutorial.cjs` 20/20 (D-049) |
| AW.B | **Oficina viva** | Rutinas con propósito (café/agua, descanso, charlar, estirarse, mirar por la ventana, celebrar, reaccionar a malas noticias, volver al puesto) según energía, ánimo, personalidad y muebles; zona de descanso | Deterministas; efectos moderados; sin abandonar tareas en exceso; rutas válidas o alternativa segura; nada atraviesa obstáculos; la pausa lo congela todo | GT.1, ML.1 | ✅ `systems/routines.ts`, fuente de agua, hábitos y reacciones en la escena, `tests/sim/routines.test.ts`, `tools/e2e/routines.cjs` 8/8 (D-050) |
| AW.C | **Identidad** | Editar después aspecto, nombre y apodo de fundador y empleados; ficha con biografía y logros visible junto al personaje; colores de paredes/suelo y nuevos objetos (rincón de bebidas) | Cambiar ropa no cambia habilidades, personalidad ni historia; estético vs funcional claro; sin estrategia de repetir el mismo objeto | ML.4, ML.5, ML.6 | ✅ Editor (`edit_empirian`), ficha con biografía de hechos (`systems/biography.ts`), paredes y suelos con vista previa, puf, alfombra redonda, mesita y rincón acogedor; `tests/sim/biography.test.ts`, `officeStyle.test.ts`, e2e `identity.cjs` 13/13, `style.cjs` 7/7 (D-051) |
| AW.D | **Diversión** (🟦 D.4 tipos de proyecto hecho, D-060, `tests/sim/ambition.test.ts`, e2e `profiles.cjs` 4/4;  D.1 funcionalidades y D.2 prototipos hechos, D-053; primeros eventos de historia hechos, D-055: idea de un empleado, cambios del cliente, feria, crítica influyente, discusión, formación — `tests/sim/storyEvents.test.ts`, e2e `events.cjs` 9/9; aplazado "juego antiguo de moda" hasta GT.6) | Más decisiones de proyecto (funcionalidades, prototipo, alcance vs plazo, deuda técnica, pruebas extra, comentarios de usuarios, tendencia, lanzar o retrasar) y eventos que generan historias (idea brillante de un empleado, discrepancia técnica, cliente pide cambios, feria, crítica influyente, formación, tendencia, resurgimiento) con límites de frecuencia | Cada opción con consecuencias distintas y comprensibles; ninguna estrategia universal; juego pequeño viable; eventos en la Historia | F3.2–F3.5, ML.7 | ⬜ |
| AW.E | **Profundidad** | Continuar GT (ampliar oficina, reparto de tareas) y F3 (nuevos tipos de software) | Ver GT y F3 | GT, F3 | 🟦 Ampliación básica hecha (GT.4, 0.9.0); reparto de tareas hecho y publicado en 0.10.0 (Auto/Diseño/Código/Pruebas, D-054, `tests/sim/roles.test.ts`, e2e `roles.cjs` 10/10); siguen tipos de software. [FUTURO] reparto automático por fases para equipos grandes |
| AW.F | **Pequeñas satisfacciones** | Animaciones discretas para primeros hitos, récords, premios, nueva oficina; audio opcional y silenciable | Sin abusar de confeti ni avisos | AW.B | ⬜ |

---

## ML — "More Life, More Fun" (6.ª sesión)

Objetivo: que apetezca **observar** a los Empirians, **decorar** la oficina, **descubrir** acontecimientos y ver cómo el estudio **construye su historia**. Diversión, personalidad y claridad antes que complejidad. Conserva la estética voxel. No sustituye a GT ni a F3: se intercala.

| ID | Tarea | Representación en el mundo | Criterios de aceptación | Depende de | Estado |
|---|---|---|---|---|---|
| ML.1 | **La pausa congela el mundo**: reloj de animación del mundo separado del tiempo real; carga en pausa con todos en su sitio | Empirians, burbujas, confeti y pantallas quietos | Poses idénticas durante la pausa a 1x/4x/8x; la interfaz, la cámara y la decoración funcionan; sin saltos al reanudar; al cambiar de pestaña y al cargar en pausa (prueba + e2e) | — | ✅ `render/worldClock.ts`, `tools/e2e/pause.cjs` 16/16 (D-047) |
| ML.2 | **Recuerdos del estudio**: primera contratación, primer éxito, primer fracaso, grandes decisiones, premios, cambios de oficina, logros de Empirians, productos memorables; ligados a personas y productos | Álbum de recuerdos desde el corcho; cada caja de la estantería abre la historia de su producto | Cada recuerdo nace de un hecho real del estado; ligero (sin IA generativa); partidas antiguas generan sus recuerdos a partir del historial | LS.6 | ✅ `systems/story.ts`, guardado v9, `tests/sim/story.test.ts`, `tools/e2e/story.cjs` 10/10 (D-048); la caja de cada producto muestra su historia (LS.6, 2.ª parte) |
| ML.3 | **Logros y desbloqueos opcionales**: reconocimientos que desbloquean decoraciones especiales (trofeo, placa, cartel…) | El objeto aparece en el catálogo con su historia | Nada básico se bloquea; se puede jugar pequeño o grande; los logros se ven en la oficina | ML.2 | ✅ 6 logros → 6 decoraciones (pestaña Trofeos) (D-048) |
| ML.4 | **Más personalización de oficina** (✅ 1.ª parte con AW.C): colores de paredes y suelo; nuevos objetos estéticos y funcionales (variantes de escritorio/silla, alfombras, lámparas, plantas, estanterías, ocio); zona de descanso con sinergia sencilla | Todo visible en la habitación | Estético vs funcional distinguido en el catálogo; efectos con contrapartida; sinergias sin acumulación descontrolada; decorar nunca es obligatorio (prueba de no-dominancia) | LS.2–LS.4 | ⬜ |
| ML.5 | **Empirians más personales** (✅ editor con AW.C): cambiar aspecto, nombre y apodo del fundador y de los empleados; más peinados, ropa y accesorios | Editor con el personaje en primer plano | Una sola definición de aspecto; guardado compatible | GT.1 | ⬜ |
| ML.6 | **Personalidad visible**: cada rasgo se expresa en la oficina (el sociable charla, el perfeccionista revisa, el noctámbulo toma café, el curioso consulta la estantería) y reacciones según energía y ánimo | Animaciones y burbujas propias | Dos Empirians con rasgos distintos se distinguen sin abrir su ficha | GT.1, ML.5 | ⬜ |
| ML.7 | **Momentos con más vida**: eventos contextuales nuevos (idea experimental, negociar un encargo, conflicto en el equipo, responder a una crítica, aprovechar una tendencia, feria, oportunidad inesperada) con consecuencias diferidas | El Empirian implicado levanta la mano | Cada evento depende del estado real; ninguna opción domina; ritmo limitado (no interrumpir); efectos diferidos registrados | LS.7, GT.1 | ⬜ |

**Dependencias:** la ampliación de oficina (GT.4) multiplica el valor de ML.4 (más espacio para zonas); el trabajo en equipo (GT.3) y la personalidad visible (ML.6) se refuerzan; los recuerdos (ML.2) dan sentido a la estantería (LS.6, 2.ª parte) y alimentan los logros (ML.3). **Orden previsto:** ML.1 → ML.2 → ML.3 → ML.4 → ML.5 → ML.6 → ML.7, intercalando GT.4 cuando la decoración lo pida.

---

## GT — "Growing Together": de desarrollador solitario a estudio (5.ª sesión)

Objetivo: el fundador deja de estar solo. Contratar, convivir y trabajar en equipo, ampliar la oficina, hacer otros tipos de software y cuidar productos que siguen vivos. Es también la respuesta a Q-011: **el dinero gana usos** (sueldos, puestos, ampliaciones) en lugar de recortar ingresos. Toda mecánica se ve en la oficina; nada de paneles empresariales.

| ID | Tarea | Fase de origen | Representación en el mundo | Criterios de aceptación | Depende de | Estado |
|---|---|---|---|---|---|---|
| GT.1 | **Contratar al primer Empirian**: candidatos generados por semilla con habilidades, rasgo de personalidad y sueldo; hace falta un puesto libre; despedir/dimitir con consecuencias | F4 | El candidato entra por la puerta para la entrevista; el contratado ocupa un escritorio y trabaja | Contratar aumenta la capacidad y el gasto (prueba); sin puesto no se puede contratar; determinista; partidas antiguas migran | LS.1, LS.3 | ✅ `systems/team.ts`, guardado v8, `tests/sim/team.test.ts`, `tools/e2e/team.cjs` 13/13 (D-046). Incluye la base de GT.2 (rasgos, sueldo, energía/ánimo propios) y GT.3 (coordinación) |
| GT.2 | **Empleados vivos**: experiencia por actividad (mismo modelo que el fundador), energía y ánimo propios, rasgos con efecto y expresión visual, sueldo semanal | F4 | Burbujas, caras y animaciones propias; ficha de cada Empirian | Cada rasgo cambia algo medible (prueba de no-dominancia); el sueldo se paga y se registra | GT.1 | 🟦 4 rasgos y sueldo semanal hechos con GT.1; faltan reacciones propias (burbujas por rasgo, quejas por sueldo/cansancio) |
| GT.3 | **Trabajo en equipo y asignación**: repartir programación, diseño y pruebas; coordinación con rendimientos decrecientes | F4 | Cada Empirian va a su puesto y hace su actividad | Dos personas no son el doble de rápidas (prueba); asignar bien rinde más que asignar mal | GT.2 | ✅ Coordinación (×0,87 por persona con 2) y asignación de tareas (D-054, 0.10.0) |
| GT.4 | **Ampliar la oficina y nuevas ubicaciones** (habitación → garaje/estudio más grande) | F4 | Mudanza con cajas; habitación más grande | Inversión grande con beneficio claro (más puestos, más ambiente) y coste recurrente | GT.1 | ✅ 1.ª ampliación: habitación 10×8 → estudio 14×10 (25 000 €, 60 €/día, hasta 6 personas + fundador), `content/officeSizes.ts`, `tests/sim/expansion.test.ts`, `tools/e2e/expansion.cjs` 8/8 (D-052). Pendiente: más ubicaciones (garaje, edificio) |
| GT.8 | **Relaciones en el equipo** (E.3): afinidades, buen equipo, respeto, mentoría, tensión y rivalidad a partir de hechos reales | F4 | Charlas más frecuentes entre amigos, corazones/nube/libro sobre ambos, sesiones de mentoría; sección "Con el equipo" en la ficha | Nada aleatorio; efectos moderados y con tope; la tensión se suaviza; determinista y guardado (pruebas) | GT.2, AW.B | ✅ D-056, `systems/relations.ts`, `tests/sim/relations.test.ts` 10, e2e `relations.cjs` 7/7 |
| GT.5 | **Otros tipos de software: aplicaciones y herramientas** con factores de éxito propios | F7 | Pantallas y cajas distintas | Cada tipo tiene ≥ 2 factores propios que cambian la estrategia (prueba) | F3.2 | 🟦 1.ª versión (AW.D.1) + idea de alcance a mitad de producción (D-058, `tests/sim/scope.test.ts`, e2e `scope.cjs` 5/5); falta recortar funcionalidades por decisión propia |
| GT.6 | **Productos persistentes**: mantenimiento, actualizaciones y parches; usuarios; abandono con consecuencias | F5 | Tocar la caja de la estantería abre la historia del producto y sus acciones | Un producto mantenido vende más tiempo; uno abandonado pierde reputación (prueba) | LS.6, GT.3 | ⬜ |
| GT.7 | **Reequilibrio económico** con sueldos y ampliaciones (cierra Q-011) | D-034 | — | `economy.report.ts` antes/después; estudio pequeño viable; el dinero tiene usos con sentido | GT.1–GT.4 | ⬜ |

**Antes y en paralelo (pendientes de F3 y LS):** F3.2 funcionalidades y alcance, LS.6 historia del producto (2.ª parte, se une a GT.6), F3.4 deuda técnica, F3.8 consecuencias persistentes, F3.9 historia del proyecto. Se intercalan cuando sus dependencias estén resueltas; GT.1 va primero porque es lo más pedido y lo que da usos al dinero.

---

## F3 — Consecuencias y personalización — 🟦 En curso (F3.1 hecha)

- **Objetivo:** que cada proyecto se construya de forma distinta y que las decisiones dejen huella, sin convertir la oficina en un panel. Todo lo nuevo se presenta mediante el Empirian (diálogos, burbujas, objetos en la habitación) y tarjetas breves.
- **Motivación medida:** `docs/GAMEPLAY_REVIEW.md` — proyectos demasiado parecidos, resultados previsibles, pocas decisiones, progresión débil.
- **Dependencias:** F2 (hecha). No depende de F1.11/F1.12 salvo donde se indica.
- **Regla de interfaz:** ninguna tarea añade un panel permanente; como máximo una tarjeta que se abre al tocar un objeto o al hablar el Empirian. Cada área nueva aparece cuando el jugador la necesita (desbloqueo progresivo).

| ID | Tarea | Qué aporta al jugador | Criterios de aceptación | Depende de | Estado |
|---|---|---|---|---|---|
| F3.1 | **Momentos Decisivos contextuales**: motor de momentos disparados por el estado real, con reglas de ritmo | Más decisiones, distintas en cada proyecto | Cada momento se dispara por una condición real, una vez por proyecto, máx. 3 y ≥ 4 días entre ellos; cada opción deja rastro en el registro causal y cambia el resultado (pruebas) | — | ✅ Agotamiento, retraso previsto y plan de pulido (`systems/moments.ts`) |
| F3.2 | **Funcionalidades y alcance** (✅ 1.ª versión con AW.D.1: 7 funcionalidades, huecos por tamaño, riesgo oculto, prototipo): 3–5 funcionalidades elegibles por proyecto según el tema (cada una con trabajo, riesgo y atractivo); añadir o recortar durante el desarrollo | Los proyectos dejan de ser iguales; el alcance es una decisión | Dos juegos del mismo tema con funcionalidades distintas dan resultados distintos y explicables; recortar una funcionalidad anunciada tiene coste de expectativas; el progreso se ve por funcionalidad en la pizarra de corcho | F3.1 | ⬜ Siguiente |
| F3.3 | **Riesgos conocidos y ocultos**: cada funcionalidad/plan trae riesgos (técnico, alcance, mercado); pueden materializarse; se mitigan con prototipo, pruebas o margen | Incertidumbre con causa, no ruido | La varianza de la nota entre partidas con el mismo plan aumenta respecto a ± 0,25 y cada desviación se explica en "¿Por qué?"; mitigar reduce la probabilidad de forma medible; riesgos ocultos se descubren con prototipos/pruebas | F3.2 | ⬜ |
| F3.4 | **Deuda técnica**: se acumula con crunch, atajos y bugs aplazados; frena el avance y genera bugs; se paga refactorizando. Incluye el momento "bugs acumulados" | Consecuencias diferidas visibles | Un atajo hoy produce un efecto medible semanas después y aparece como causa; refactorizar cuesta tiempo ahora y lo ahorra después (óptimo interior, prueba) | F3.1 | ✅ D-057: deuda por proyecto (crunch ×2, relajado ×0,5; habilidad, perfeccionista y relaciones la moderan), frena la programación, más bugs y algo menos de techo (con tope); 40 % pasa al siguiente juego; momentos "atajo" (lo propone el mejor programador, solo con equipo) y "revisión del código"; base sólida reutilizable. `systems/debt.ts`, `tests/sim/debt.test.ts` 9, e2e `debt.cjs` 9/9 |
| F3.5 | **Estrategias de calidad y pruebas**: prototipo en la fase de concepto, beta cerrada, pruebas externas de pago; dimensiones de calidad (estabilidad, diseño, rendimiento) que pesan distinto según el tema | Varias formas válidas de hacer un buen juego | Al menos 3 estrategias con beneficio por día dentro de un ±20 % y perfiles de riesgo distintos (prueba de no-dominancia) | F3.3 | ⬜ |
| F3.6 | **Presupuesto por partidas y reserva**: repartir entre herramientas, marketing, pruebas externas y reserva para imprevistos; el dinero se queda corto | El presupuesto pasa a ser una decisión | Con la escala económica revisada (decisión del propietario tras F2.12), ningún reparto gana en todos los planes; quedarse sin reserva ante un imprevisto tiene consecuencias | F2.12, F3.3 | ⬜ (bloqueada parcialmente) |
| F3.7 | **Cronograma con hitos**: demo y beta opcionales con fecha; anunciar fecha pronto o tarde | El calendario se planifica, no solo se elige una duración | Una demo temprana sube el interés y expone los bugs; incumplir un hito anunciado cuesta interés; todo queda en el registro | F3.2 | ⬜ |
| F3.8 | **Consecuencias persistentes entre proyectos**: promesas incumplidas, reputación por tipo de fallo (bugs, retrasos), lecciones aprendidas del estudio (encaje tema↔enfoque descubierto) | Lo que haces en un juego afecta al siguiente; sensación de progreso | La promesa de "una actualización" tiene efecto en el siguiente lanzamiento; lo aprendido se muestra al crear el proyecto siguiente; pruebas de carrera de 5 proyectos | F3.2 | 🟦 Reputación con memoria hecha (D-059: calidad, cumplimiento, innovación; `systems/reputation.ts`, `tests/sim/reputation.test.ts` 10, e2e `fame.cjs` 7/7); promesas explícitas y lecciones aprendidas pendientes |
| F3.9 | **Historia del proyecto y avisos**: línea de tiempo ilustrada del proyecto desde la caja de la estantería; aviso de previsión dicho por el Empirian; preferencias de avisos (informativo/importante/decisivo) | Entender el porqué en cualquier momento | Cualquier resultado enlaza con su cadena de causas; el jugador puede silenciar avisos informativos | F3.1 | ⬜ |
| F3.10 | **Revisión de balance de F3** con `review.report.ts` y pruebas de juego | Que F3 no introduzca estrategias dominantes | Informe antes/después; pruebas de no-dominancia ampliadas; prueba de juego del propietario | todas | ⬜ |

- **Orden propuesto:** F3.2 → F3.4 → F3.3 → F3.8 → F3.5 → F3.7 → F3.9 → F3.6 → F3.10.
- **No se adelanta a F3:** tecnologías reutilizables (F6), mantenimiento y actualizaciones (F5), mercado vivo (F5), contratación (F4), expansión (F8). Única excepción propuesta: experiencia del fundador en F3.8.
- **Riesgos:** sobrecarga de interfaz (mitigación: regla de interfaz de arriba); balance (F3.10 y pruebas de no-dominancia); crecimiento del guardado (estrategia de historial ya aplicada).
- **Criterio de aceptación global:** cada ejemplo de consecuencias del GDD §8 aplicable a un proyecto único se reproduce en una prueba; el jugador puede responder "¿por qué?" ante cualquier resultado; dos partidas con el mismo tema pueden contarse como historias distintas.

## F4 — Empleados y oficinas

- **Objetivos:** Contratación, personalidades, habilidades, relaciones, nuevos Empirians generados por semilla, decoración y ampliación (garaje, estudio).
- **Dependencias:** F3; catálogo de recursos ampliado.
- **Tareas:** generador de Empirians; candidatos y entrevistas; salarios; motivación y energía por persona; rasgos con expresión visual; asignación a proyectos; coordinación (rendimientos decrecientes por tamaño de equipo); colocación de muebles en cuadrícula con efectos (ordenadores, sala de descanso, pizarra, distribución); mudanza a garaje y estudio; animaciones sociales (café, hablar, descansar).
- **Criterios:** contratar aumenta capacidad y también costes y coordinación (probado); los Empirians son distinguibles a simple vista; los muebles con efecto lo muestran y lo cumplen.
- **Riesgos:** rendimiento con más Empirians; IA de movimiento.

## F5 — Mercado vivo

- **Objetivos:** Productos persistentes (ventas en el tiempo, usuarios, críticas, reputación, soporte, mantenimiento, actualizaciones), competidores agregados, noticias.
- **Dependencias:** F3.
- **Tareas:** ciclo de vida de producto; actualizaciones y parches; empresas rivales con lanzamientos; tendencias del mercado; reputación de la empresa; noticias del sector; decisiones post-lanzamiento (mantener, actualizar, expansión, secuela, cambiar modelo, vender/licenciar, abandonar).
- **Criterios:** un producto abandonado o mal mantenido muestra consecuencias diferidas explicables; los rivales cambian el mercado de forma visible.

## F6 — Investigación

- **Objetivos:** Tecnologías reutilizables (madurez, calidad, mantenimiento, compatibilidad, reutilización, obsolescencia), descubrimientos durante proyectos, progresión tecnológica.
- **Tareas:** tecnologías como patrimonio; motor propio derivado de un proyecto; reutilización de código con propagación de problemas; investigación dirigida; genealogía de tecnologías (base).
- **Criterios:** dos partidas con estrategias distintas acaban con trayectorias tecnológicas distintas.

## F7 — Diversidad de software

- **Objetivos:** Aplicaciones móviles/escritorio, SaaS, herramientas, motores, y posteriormente IA, redes sociales, plataformas, SO, nube; mecánicas diferenciadas por tipo; proyectos simultáneos.
- **Criterios:** cada tipo nuevo tiene al menos dos factores de éxito propios (GDD §12) que cambian la estrategia.

## F8 — Expansión empresarial

- **Objetivos:** Departamentos, directores y delegación, contratos de clientes, cambios de requisitos, oficina profesional y edificio, financiación, adquisiciones, fusiones, licencias, divisiones.

## F9 — Mundo avanzado

- **Objetivos:** Crisis jugables encadenadas, eventos tecnológicos, premios y ceremonias, presentaciones de producto, museo de la empresa, colecciones, rivalidades personales, antiguos empleados que fundan empresas, proyectos secretos, prototipos experimentales, productos probables mediante minisimulaciones, evolución histórica de la industria, expansión internacional, plataformas y ecosistemas, campus, modos de juego (escenarios, desafíos, sandbox), caminos de éxito diferentes.

## F10 — Preparación comercial

- **Objetivos:** Optimización, accesibilidad (tamaños de texto, daltonismo, reducción de movimiento), experiencia móvil, localización, recursos definitivos, audio y música originales, pruebas en dispositivos, guías de App Store / Google Play, ficha de tienda, presskit, uso del dominio. **Nada se publica sin autorización expresa.**

---

## Registro de riesgos del proyecto

| ID | Riesgo | Mitigación |
|---|---|---|
| R-001…R-008 | Riesgos técnicos | Ver `ARCHITECTURE.md` §12 |
| R-009 | **Alcance**: la visión es enorme para un desarrollo incremental | Fases pequeñas jugables; `[FUTURO]` en lugar de borrar; revisar alcance en cada fase |
| R-010 | **Diversión**: la simulación profunda puede no traducirse en diversión | Pruebas de juego desde F2; pilares de diseño; prioridad a la oficina viva |
| R-011 | **Originalidad / PI**: parecido excesivo con Minecraft, LEGO o Game Dev Tycoon | Lista de originalidad (ART_DIRECTION §7); diseño de mecánicas desde nuestros pilares |
| R-012 | **Marca**: "EMPIRES" es genérico y puede chocar con marcas/títulos existentes | Búsqueda de marca antes de logotipo y marketing (Q-006) |
| R-013 | **Producción artística**: recursos voxel y animaciones requieren tiempo de artista | Sistema modular, recolor por paleta, animación rígida compartida, generación procedural |
| R-014 | **Pruebas en dispositivos**: sin dispositivos reales no se puede validar el rendimiento | Acordar dispositivos (Q-008); servicios de granjas de dispositivos como alternativa (requiere aprobación) |
| R-015 | **Coordinación con ChatGPT**: diseños externos que contradigan documentos | Toda propuesta entra por el propietario y se registra en GDD/DECISIONS antes de implementarse |
| R-016 | **Complejidad de UI en móvil**: personalización profunda en pantallas pequeñas | Tarjetas, desbloqueo progresivo, delegación |

## Preguntas abiertas

| ID | Pregunta | Dónde |
|---|---|---|
| Q-001 | Oficinas prediseñadas vs. construcción libre | GDD §3.3, D-019 |
| Q-002 | Tecnologías/empresas reales o ficticias | GDD §6, D-021 |
| Q-003 | Línea temporal histórica o contemporánea/ficticia | GDD §12 |
| Q-004 | ¿Existe la bancarrota como fin de partida? | GDD §17 |
| Q-005 | Dominio: ¿expires.top o empires.top? Uso | GDD §18 |
| Q-006 | Verificación de marca del nombre EMPIRES | GDD §18 |
| Q-007 | Idiomas, precio, clasificación por edades | GDD §18 |
| Q-008 | Dispositivos de prueba disponibles | ARCHITECTURE §9 |
| Q-009 | ¿IA generativa permitida en la producción de recursos? | D-017 |
| Q-010 | ¿Quién producirá los recursos definitivos (propietario, artista externo, Claude por código)? | ART_DIRECTION §8 |
