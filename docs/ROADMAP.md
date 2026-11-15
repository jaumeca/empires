# EMPIRES — Roadmap

> Versión 0.3 · 2026-11-15 (consolidación de la v0.1 y desglose de F3) · Roadmap incremental. Se puede reorganizar con motivo justificado, pero **no** se eliminan funcionalidades ni se reduce la visión sin consultar al propietario.
>
> Estados: ⬜ Pendiente · 🟦 En curso · ✅ Hecho · ⏸ Bloqueado (esperando aprobación)

## Resumen

| Fase | Nombre | Estado | Entregable |
|---|---|---|---|
| F0 | Fundación | ✅ Hecho | Documentos maestros + decisiones aprobadas |
| F1 | El primer Empirian | 🟦 Casi completa | Habitación voxel con un Empirian animado (falta medir en móviles reales) |
| F2 | El primer proyecto | 🟦 Jugable | **v0.1 — primera versión jugable** (falta prueba de juego del propietario) |
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
| F1.12 | Revisión de dirección artística y orientación | ⬜ Pendiente del propietario | Galería preparada: `docs/screenshots/README.md` (22 capturas con índice) |

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
| F2.12 | Pruebas de juego con el propietario y ajustes | ⬜ | — |

**Criterios de aceptación de v0.1:**
- [x] Ciclo completo de desarrollo y lanzamiento a través de la interfaz (e2e 21/21).
- [x] Presupuesto y plazo con consecuencias coherentes; más tiempo ≠ mejor resultado (óptimo interior demostrado en pruebas y en `npm run sim`).
- [x] Al menos una decisión con consecuencias reales y explicables.
- [x] Guardar y recuperar conserva el estado exacto.
- [x] Pruebas automatizadas de los sistemas importantes; la simulación funciona sin render (73 pruebas).
- [ ] Rendimiento en dispositivos de referencia (bloqueado, F1.11).
- [ ] Duración ≈ 10–15 min y diversión validadas por pruebas de juego (F2.12).
- [x] La pantalla principal es la habitación, no un panel.

**Consolidación (3.ª sesión, hecha):** npm sin `--legacy-peer-deps` (D-028), internacionalización (D-031), historial y guardado robusto (D-029), ventanas para móvil horizontal, galería de revisión, revisión de gameplay (D-030).

**Próximos pasos recomendados:** F1.12 (revisión visual con la galería) y F2.12 (prueba de juego) del propietario → F3.2 → F1.11 (dispositivos).

---

## F3 — Consecuencias y personalización — 🟦 En curso (F3.1 hecha)

- **Objetivo:** que cada proyecto se construya de forma distinta y que las decisiones dejen huella, sin convertir la oficina en un panel. Todo lo nuevo se presenta mediante el Empirian (diálogos, burbujas, objetos en la habitación) y tarjetas breves.
- **Motivación medida:** `docs/GAMEPLAY_REVIEW.md` — proyectos demasiado parecidos, resultados previsibles, pocas decisiones, progresión débil.
- **Dependencias:** F2 (hecha). No depende de F1.11/F1.12 salvo donde se indica.
- **Regla de interfaz:** ninguna tarea añade un panel permanente; como máximo una tarjeta que se abre al tocar un objeto o al hablar el Empirian. Cada área nueva aparece cuando el jugador la necesita (desbloqueo progresivo).

| ID | Tarea | Qué aporta al jugador | Criterios de aceptación | Depende de | Estado |
|---|---|---|---|---|---|
| F3.1 | **Momentos Decisivos contextuales**: motor de momentos disparados por el estado real, con reglas de ritmo | Más decisiones, distintas en cada proyecto | Cada momento se dispara por una condición real, una vez por proyecto, máx. 3 y ≥ 4 días entre ellos; cada opción deja rastro en el registro causal y cambia el resultado (pruebas) | — | ✅ Agotamiento, retraso previsto y plan de pulido (`systems/moments.ts`) |
| F3.2 | **Funcionalidades y alcance**: 3–5 funcionalidades elegibles por proyecto según el tema (cada una con trabajo, riesgo y atractivo); añadir o recortar durante el desarrollo | Los proyectos dejan de ser iguales; el alcance es una decisión | Dos juegos del mismo tema con funcionalidades distintas dan resultados distintos y explicables; recortar una funcionalidad anunciada tiene coste de expectativas; el progreso se ve por funcionalidad en la pizarra de corcho | F3.1 | ⬜ Siguiente |
| F3.3 | **Riesgos conocidos y ocultos**: cada funcionalidad/plan trae riesgos (técnico, alcance, mercado); pueden materializarse; se mitigan con prototipo, pruebas o margen | Incertidumbre con causa, no ruido | La varianza de la nota entre partidas con el mismo plan aumenta respecto a ± 0,25 y cada desviación se explica en "¿Por qué?"; mitigar reduce la probabilidad de forma medible; riesgos ocultos se descubren con prototipos/pruebas | F3.2 | ⬜ |
| F3.4 | **Deuda técnica**: se acumula con crunch, atajos y bugs aplazados; frena el avance y genera bugs; se paga refactorizando. Incluye el momento "bugs acumulados" | Consecuencias diferidas visibles | Un atajo hoy produce un efecto medible semanas después y aparece como causa; refactorizar cuesta tiempo ahora y lo ahorra después (óptimo interior, prueba) | F3.1 | ⬜ |
| F3.5 | **Estrategias de calidad y pruebas**: prototipo en la fase de concepto, beta cerrada, pruebas externas de pago; dimensiones de calidad (estabilidad, diseño, rendimiento) que pesan distinto según el tema | Varias formas válidas de hacer un buen juego | Al menos 3 estrategias con beneficio por día dentro de un ±20 % y perfiles de riesgo distintos (prueba de no-dominancia) | F3.3 | ⬜ |
| F3.6 | **Presupuesto por partidas y reserva**: repartir entre herramientas, marketing, pruebas externas y reserva para imprevistos; el dinero se queda corto | El presupuesto pasa a ser una decisión | Con la escala económica revisada (decisión del propietario tras F2.12), ningún reparto gana en todos los planes; quedarse sin reserva ante un imprevisto tiene consecuencias | F2.12, F3.3 | ⬜ (bloqueada parcialmente) |
| F3.7 | **Cronograma con hitos**: demo y beta opcionales con fecha; anunciar fecha pronto o tarde | El calendario se planifica, no solo se elige una duración | Una demo temprana sube el interés y expone los bugs; incumplir un hito anunciado cuesta interés; todo queda en el registro | F3.2 | ⬜ |
| F3.8 | **Consecuencias persistentes entre proyectos**: promesas incumplidas, reputación por tipo de fallo (bugs, retrasos), lecciones aprendidas del estudio (encaje tema↔enfoque descubierto), experiencia del fundador | Lo que haces en un juego afecta al siguiente; sensación de progreso | La promesa de "una actualización" tiene efecto en el siguiente lanzamiento; lo aprendido se muestra al crear el proyecto siguiente; pruebas de carrera de 5 proyectos | F3.2 | ⬜ (la experiencia del fundador adelanta una parte pequeña de F4: **pendiente de aprobación**) |
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
