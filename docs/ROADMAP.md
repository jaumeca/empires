# EMPIRES — Roadmap

> Versión 0.2 · 2026-11-14 (actualizado tras la sesión autónoma F1–F2) · Roadmap incremental. Se puede reorganizar con motivo justificado, pero **no** se eliminan funcionalidades ni se reduce la visión sin consultar al propietario.
>
> Estados: ⬜ Pendiente · 🟦 En curso · ✅ Hecho · ⏸ Bloqueado (esperando aprobación)

## Resumen

| Fase | Nombre | Estado | Entregable |
|---|---|---|---|
| F0 | Fundación | ✅ Hecho | Documentos maestros + decisiones aprobadas |
| F1 | El primer Empirian | 🟦 Casi completa | Habitación voxel con un Empirian animado (falta medir en móviles reales) |
| F2 | El primer proyecto | 🟦 Jugable | **v0.1 — primera versión jugable** (falta prueba de juego del propietario) |
| F3 | Consecuencias y personalización | ⬜ | Proyectos más ricos, decisiones dinámicas, registro causal visible |
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
| F1.12 | Revisión de dirección artística y orientación | ⬜ Pendiente del propietario | Capturas en `docs/screenshots/` |

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
- [x] Ciclo completo de desarrollo y lanzamiento a través de la interfaz (e2e 18/18).
- [x] Presupuesto y plazo con consecuencias coherentes; más tiempo ≠ mejor resultado (óptimo interior demostrado en pruebas y en `npm run sim`).
- [x] Al menos una decisión con consecuencias reales y explicables.
- [x] Guardar y recuperar conserva el estado exacto.
- [x] Pruebas automatizadas de los sistemas importantes; la simulación funciona sin render (40 pruebas).
- [ ] Rendimiento en dispositivos de referencia (bloqueado, F1.11).
- [ ] Duración ≈ 10–15 min y diversión validadas por pruebas de juego (F2.12).
- [x] La pantalla principal es la habitación, no un panel.

**Próximos pasos recomendados:** F2.12 (prueba de juego del propietario) → F1.11 (dispositivos) → F3.

---

## F3 — Consecuencias y personalización

- **Objetivos:** Ampliar presupuesto (reservas, partidas), alcance (funcionalidades/módulos), calidad (dimensiones), riesgos, cronograma (hitos, demo, beta) y decisiones dinámicas; registro causal visible.
- **Dependencias:** F2.
- **Tareas:** módulos y funcionalidades internos; deuda técnica; crunch y fatiga; cambios de alcance durante el desarrollo; abrir y modificar el proyecto voluntariamente; generador de Momentos Decisivos a partir del estado; estimaciones con incertidumbre; pantalla "historia del proyecto"; preferencias de notificación (info/importante/decisivo) y pausa automática.
- **Criterios de aceptación:** cada ejemplo de consecuencias del GDD §8 aplicable a un proyecto único es reproducible en una prueba; el jugador puede responder "¿por qué?" en cualquier resultado.
- **Riesgos:** sobrecarga de UI (aplicar desbloqueo progresivo); balance.

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
