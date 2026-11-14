# EMPIRES — Roadmap

> Versión 0.1 · 2026-11-14 · Roadmap incremental. Se puede reorganizar con motivo justificado, pero **no** se eliminan funcionalidades ni se reduce la visión sin consultar al propietario.
>
> Estados: ⬜ Pendiente · 🟦 En curso · ✅ Hecho · ⏸ Bloqueado (esperando aprobación)

## Resumen

| Fase | Nombre | Estado | Entregable |
|---|---|---|---|
| F0 | Fundación | 🟦 En curso | Documentos maestros + decisiones aprobadas |
| F1 | El primer Empirian | ⏸ | Habitación voxel con un Empirian animado, medido en móviles reales |
| F2 | El primer proyecto | ⬜ | **v0.1 — primera versión jugable** |
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

## F0 — Fundación

- **Objetivos:** Documentar la visión completa, la dirección artística y la propuesta técnica; identificar riesgos y decisiones; acordar el plan.
- **Dependencias:** —
- **Riesgos:** Aprobar demasiado pronto decisiones técnicas que dependen de la validación en dispositivos.

| ID | Tarea | Estado |
|---|---|---|
| F0.1 | Inspeccionar el repositorio | ✅ (repositorio vacío, sin commits) |
| F0.2 | Crear documentos maestros (`CLAUDE.md`, `docs/GAME_DESIGN.md`, `docs/ROADMAP.md`, `docs/DECISIONS.md`, `docs/ART_DIRECTION.md`, `docs/ARCHITECTURE.md`, `docs/ASSET_REGISTRY.md`) | ✅ |
| F0.3 | Analizar la imagen de referencia | ⏸ La imagen no llegó a la sesión; pendiente de que el propietario la añada a `docs/references/` |
| F0.4 | Revisión de documentos con el propietario | ⬜ |
| F0.5 | Aprobación (o cambio) de D-005 a D-021, como mínimo D-005, D-006, D-007, D-009, D-011, D-014, D-016, D-018 | ⬜ |
| F0.6 | Respuesta a preguntas abiertas prioritarias: Q-005 (dominio), Q-006 (marca), Q-008 (dispositivos de prueba) | ⬜ |

**Criterios de aceptación:** documentos aprobados por el propietario; decisiones necesarias para F1 confirmadas; ninguna idea del documento fundador perdida.

**Próximo paso:** revisión del propietario.

---

## F1 — El primer Empirian

- **Objetivos:** Validar la identidad voxel, la cámara, la escala, la iluminación, las animaciones, la interacción táctil y el rendimiento en móviles; establecer los cimientos técnicos (proyecto, pruebas, simulación mínima).
- **Dependencias:** F0.5 (motor, lenguaje, empaquetado, herramientas aprobados) y autorización para instalar dependencias.
- **Riesgos:** R-001 (rendimiento WebView), estética poco atractiva en la primera iteración, sobreinversión en recursos antes de validar.

| ID | Tarea | Criterio de aceptación | Estado |
|---|---|---|---|
| F1.1 | Esqueleto del proyecto: Vite + TS estricto + Vitest + ESLint con regla de límites `sim/` | `npm test` y `npm run build` pasan; una importación prohibida desde `sim/` falla el lint | ⬜ |
| F1.2 | Núcleo de simulación sin gameplay: `GameState`, reloj de paso fijo, velocidades, pausa, PRNG con semilla, bus de eventos | Pruebas: mismos comandos + semilla ⇒ mismo estado; resultado idéntico con fotogramas de 8, 16, 33 y 100 ms; pausa no avanza ticks | ⬜ |
| F1.3 | Guardado v1: serializar/deserializar, cabecera versionada, almacenamiento en memoria e IndexedDB, migración de ejemplo | Prueba guardar→cargar ≡ estado idéntico; importar archivo corrupto se rechaza con error claro | ⬜ |
| F1.4 | Escena de habitación con cámara ortográfica; comparación isométrica vs. dimétrica | Capturas de ambas para que el propietario elija (D-009) | ⬜ |
| F1.5 | Paleta maestra y voxelizador desde JSON: mallado optimizado, AO por vértice, canales de color | Habitación con suelo, 2 paredes (ventana), escritorio, ordenador, silla, planta, lámpara, estantería con libros y un decorativo | ⬜ |
| F1.6 | Primer Empirian modular (esqueleto rígido, piezas, canales de color, cara-calcomanía) | Cambiar piel/pelo/ropa en tiempo de ejecución sin nuevos modelos; legible a 60 px de altura en móvil | ⬜ |
| F1.7 | Animaciones: reposo, caminar, trabajar en el ordenador, celebrar | Las 4 animaciones en bucle sin saltos; el Empirian camina por la habitación sin atravesar muebles | ⬜ |
| F1.8 | Burbujas e interacción táctil: tocar al Empirian muestra su nombre/estado; burbujas de prueba conectadas a eventos simulados (código, bug, idea, cansancio) | Las burbujas aparecen solo cuando la simulación emite el evento; toque reconocido de forma fiable en pantalla de 6" | ⬜ |
| F1.9 | Controles de tiempo (pausa/1x/2x/4x/8x) conectados al reloj y a la velocidad de animación | Pausar detiene simulación y animaciones de trabajo (el reposo puede seguir vivo); la UI refleja la velocidad | ⬜ |
| F1.10 | Panel de diagnóstico (FPS, tiempo de fotograma, draw calls, triángulos, memoria) y escena de estrés (habitación + 10 Empirians) | Datos visibles en dispositivo | ⬜ |
| F1.11 | Build Capacitor y medición en dispositivos de referencia (requiere aprobación, Xcode/Android Studio y dispositivos) | Métricas de `ARCHITECTURE.md` §9.2 cumplidas en "mínimo soportado", o informe con plan de optimización / plan B | ⬜ |
| F1.12 | Revisión de dirección artística y originalidad con el propietario; decisión de orientación (D-011) | Aprobación de la identidad visual del Empirian y la habitación | ⬜ |

**Criterios de aceptación de F1 (prototipo visual):**
- La identidad voxel resulta atractiva al propietario; el Empirian tiene personalidad visual.
- La habitación se siente viva (el Empirian se mueve, reacciona, hay burbujas).
- El personaje se distingue en una pantalla móvil.
- Las interacciones táctiles funcionan.
- El tiempo se puede pausar y acelerar correctamente.
- La simulación funciona y se prueba sin renderizar.
- Rendimiento adecuado en los dispositivos de referencia según métricas acordadas.

**Próximos pasos tras F1:** confirmar D-005 definitivamente (o activar plan B) y empezar F2.

---

## F2 — El primer proyecto → v0.1 "Primer Lanzamiento"

- **Objetivos:** El primer bucle jugable completo (GDD §21): crear un producto, elegir características, presupuesto y plazo, observar el desarrollo, decidir, publicar y obtener resultados; guardar y cargar.
- **Dependencias:** F1 completada; D-008 (framework UI) aprobada.
- **Riesgos:** Que no sea divertido (mitigación: guion de experiencia GDD §21.1, pruebas de juego tempranas); balance (mitigación: `sim-runner`); exceso de UI tipo panel.

| ID | Tarea | Criterio de aceptación | Estado |
|---|---|---|---|
| F2.1 | Modelo de proyecto y sistemas: fases, trabajo, calidad con rendimientos decrecientes, bugs ocultos/conocidos, energía, coste (ARCHITECTURE §5.5) | Pruebas de propiedades 1–4 de ARCHITECTURE §5.5 | ⬜ |
| F2.2 | Mercado mínimo, críticas y ventas | Mismo producto lanzado en distintos momentos/precios da resultados coherentes y explicables | ⬜ |
| F2.3 | `tools/sim-runner` para simular miles de proyectos sin render | Informe de distribuciones; existe un plazo óptimo interior (no "cuanto más, mejor") | ⬜ |
| F2.4 | Creación del fundador (nombre, piel, peinado, color de pelo, ropa, accesorio) | Se completa en ≤ 60 s; el aspecto se guarda y se recupera | ⬜ |
| F2.5 | Tarjetas de nuevo proyecto: nombre, tema, tamaño, presupuesto, plazo, foco | Sin tablas; cada elección muestra estimaciones, no certezas | ⬜ |
| F2.6 | Representación del desarrollo: actividades → animaciones; eventos → burbujas de código, diseño, bugs, progreso | Cada burbuja corresponde a un evento real (verificable en modo depuración) | ⬜ |
| F2.7 | Momento Decisivo con consecuencias reales (p. ej. "dos semanas más para la mecánica genial") con 3–4 opciones adaptadas al estado | Cada opción produce efectos distintos medibles y quedan en el registro causal | ⬜ |
| F2.8 | Pulido y lanzamiento: elegir tiempo de pruebas, secuencia de lanzamiento con celebración | Bugs conocidos bajan visiblemente al probar; celebración proporcional al resultado | ⬜ |
| F2.9 | Resultados: tarjetas de críticas, ventas, dinero; "¿Por qué esta nota?" con 2–3 causas reales | Las causas mostradas proceden del registro causal | ⬜ |
| F2.10 | Recuerdo: la caja del producto aparece en la estantería | Persiste tras guardar/cargar | ⬜ |
| F2.11 | Guardado en interfaz: autoguardado, cargar partida, exportar/importar archivo; pausa al ir a segundo plano | Guardar/cargar en cualquier momento conserva el estado exacto (prueba automatizada + manual) | ⬜ |
| F2.12 | Pruebas de juego con el propietario y ajustes | Ver criterios abajo | ⬜ |

**Criterios de aceptación de v0.1 (incluye los del documento fundador §24):**
- El jugador completa un ciclo de desarrollo y lanzamiento en ≈ 10–15 minutos sin ayuda externa.
- Modificar presupuesto y plazo produce consecuencias coherentes; dedicar más tiempo no garantiza mejores resultados (demostrado con `sim-runner` y en juego).
- Al menos una decisión con consecuencias reales y explicables.
- Guardar y recuperar conserva el estado exacto.
- Los sistemas importantes tienen pruebas automatizadas; la simulación funciona sin render.
- Rendimiento dentro de las métricas en los dispositivos de referencia.
- Sensación de videojuego: la pantalla principal es la habitación, no un panel.

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
