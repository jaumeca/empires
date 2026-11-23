# EMPIRES — Registro de decisiones

> Las propuestas técnicas **no** se convierten en decisiones confirmadas sin autorización explícita del propietario.
>
> Estados: **Confirmada** (decidida por el propietario) · **Propuesta** (pendiente de aprobación) · **Rechazada** · **Sustituida** (indicar por cuál).

---

## Decisiones confirmadas

Tomadas por el propietario en el documento fundador (2026-11-14).

### D-001 — Nombre del juego y de sus personajes
- **Fecha:** 2026-11-14 · **Estado:** Confirmada
- **Decisión:** El juego se llama **EMPIRES**; sus personajes, **Empirians**. Lema provisional: *Little People. Big Ideas.*
- **Motivo:** Identidad comercial del proyecto.
- **Alternativas:** —
- **Consecuencias:** Pendiente verificación de marca y disponibilidad en tiendas (Q-006). El lema sigue siendo provisional.

### D-002 — Dirección artística voxel isométrica
- **Fecha:** 2026-11-14 · **Estado:** Confirmada
- **Decisión:** Estética voxel isométrica tipo maqueta ("Cozy Voxel Tech Tycoon"), personajes geométricos de cabeza cúbica; no muñecos redondeados de vinilo como dirección principal.
- **Motivo:** Identidad propia, encanto de figura coleccionable.
- **Alternativas:** Estilo vinilo redondeado; 2D ilustrado.
- **Consecuencias:** Condiciona el motor visual (D-005) y el pipeline de recursos (D-014). Exige vigilancia de originalidad frente a Minecraft/LEGO.

### D-003 — Juego premium, offline, sin cuentas ni monetización invasiva
- **Fecha:** 2026-11-14 · **Estado:** Confirmada
- **Decisión:** Publicación premium en App Store y Google Play; offline; guardado local; exportar/importar; sin cuentas ni servidores obligatorios; sin anuncios; sin compras integradas en la propuesta inicial. Posible versión web/escritorio.
- **Motivo:** Modelo comercial y experiencia deseada.
- **Alternativas:** Free-to-play; suscripción.
- **Consecuencias:** No se necesita backend. El guardado y su robustez son críticos.

### D-004 — Principios de arquitectura y de proyecto
- **Fecha:** 2026-11-14 · **Estado:** Confirmada
- **Decisión:** Una única base de código multiplataforma; simulación estrictamente separada de la representación; pruebas sin renderizar; estado serializable con guardado versionado; simulación independiente de los FPS; sin IA generativa en tiempo real; tiempo continuo con pausa y velocidades Pausa/1x/2x/4x/8x; recursos originales o con licencia documentada; el repositorio como memoria permanente (documentos maestros).
- **Motivo:** Mantenibilidad, testabilidad, rendimiento móvil y propiedad intelectual.
- **Alternativas:** —
- **Consecuencias:** Ver `ARCHITECTURE.md`. La reproducibilidad mediante semillas se adopta como requisito de diseño (el propietario pidió "considerarla"; ver D-018).

---

### D-005 — Motor visual: solución híbrida (voxel 3D, cámara isométrica fija, UI HTML)
- **Fecha:** 2026-11-14 · **Estado:** Confirmada
- **Decisión propuesta:** Opción C con **Three.js** + UI HTML superpuesta. Validación obligatoria de rendimiento en F1 antes de considerarla definitiva.
- **Motivo:** Personalización modular real sin explosión de sprites; animación rígida barata; cámara fija controla rendimiento y composición; HTML para la UI narrativa. Detalle en `ARCHITECTURE.md` §2.
- **Alternativas:** A) 3D con cámara libre (Three.js/Babylon.js); B) 2.5D con sprites prerenderizados (Phaser); Godot 4 (plan B); Babylon.js en lugar de Three.js.
- **Consecuencias:** Necesidad de un pipeline voxel → glTF; riesgo R-001 (WebGL en Android de gama baja).
- **Aprobación:** Aprobada por el propietario (2026-11-14): opción C — Three.js, escena voxel 3D, cámara ortográfica fija, UI HTML superpuesta. **Sujeta a validación de rendimiento en móviles reales** (F1.11). Si hay problemas, no se cambia de motor automáticamente: se documentan resultados y soluciones.

### D-006 — Lenguaje: TypeScript
- **Fecha:** 2026-11-14 · **Estado:** Confirmada
- **Decisión propuesta:** TypeScript en modo estricto para simulación, render, UI y herramientas.
- **Motivo:** Tipado para un modelo de simulación grande; ecosistema web; pruebas rápidas; un solo lenguaje.
- **Alternativas:** GDScript/C# (si Godot); JavaScript sin tipos.
- **Consecuencias:** Herramientas: Vite, Vitest, ESLint (pendiente de aprobar dependencias).
- **Aprobación:** Aprobada (2026-11-14).

### D-007 — Empaquetado móvil: Capacitor
- **Fecha:** 2026-11-14 · **Estado:** Confirmada
- **Decisión propuesta:** Capacitor para iOS y Android; la build web sirve como versión web.
- **Motivo:** Una base de código web con acceso a APIs nativas (archivos, ciclo de vida, háptica).
- **Alternativas:** Cordova (en declive); Tauri Mobile; Godot nativo.
- **Consecuencias:** Rendimiento depende del WebView del sistema; requiere Xcode y Android Studio en fases de pruebas en dispositivo.
- **Aprobación:** Aprobada (2026-11-14) como estrategia para iOS y Android.

### D-008 — Framework de UI
- **Fecha:** 2026-11-14 · **Estado:** Confirmada
- **Opciones:** Preact (+ signals), Svelte, Solid, o DOM sin framework.
- **Recomendación provisional:** Preact o Svelte — ligeros y suficientes. Decidir al iniciar F2 (la UI de F1 es mínima y puede hacerse sin framework).
- **Aprobación:** Delegada en Claude (2026-11-14). **Elección: sin framework** — componentes en TypeScript + DOM con un pequeño helper `h()` propio (`src/ui/dom.ts`). Motivo: la UI de F1–F2 son pocas tarjetas, una barra y diálogos; un framework añadiría dependencia, peso y build sin beneficio claro. Revisable si la UI crece (Preact sería la opción natural de migración).

### D-009 — Cámara isométrica
- **Fecha:** 2026-11-14 · **Estado:** Confirmada
- **Decisión propuesta:** Cámara ortográfica fija; elegir entre isométrica verdadera (~35,26°) y dimétrica (~30°) mediante comparación visual en F1. Rotación en pasos de 90° y zoom: futuro.
- **Alternativas:** Cámara libre; perspectiva.
- **Aprobación:** Aprobada (2026-11-14): cámara ortográfica fija. Probar isométrica y dimétrica y elegir provisionalmente (resultado en DEVELOPMENT_LOG y D-009a).

### D-010 — Escala de tiempo de la simulación
- **Fecha:** 2026-11-14 · **Estado:** Confirmada
- **Decisión propuesta:** 1 tick = 1 hora de juego; a 1x ≈ 3 s reales por día laborable. A ajustar tras pruebas de juego.
- **Aprobación:** Aprobada (2026-11-14): ticks independientes del render. 3 s/día provisional; la escala temporal es **configurable** (`src/sim/config.ts`).

### D-011 — Orientación horizontal
- **Fecha:** 2026-11-14 · **Estado:** Confirmada
- **Decisión propuesta:** Horizontal como orientación principal, validada en F1 en móvil real. Considerar soporte vertical en tabletas en el futuro.
- **Aprobación:** Aprobada (2026-11-14): horizontal como objetivo inicial. Vertical pendiente de evaluar.

### D-012 — Formato y almacenamiento de partidas
- **Fecha:** 2026-11-14 · **Estado:** Confirmada
- **Decisión propuesta:** JSON versionado con migraciones encadenadas; IndexedDB (web) / sistema de archivos Capacitor (móvil); autoguardado rotativo; exportación como archivo `.empires`.
- **Aprobación:** Aprobada (2026-11-14).

### D-013 — Comportamiento al cerrar o pasar a segundo plano
- **Fecha:** 2026-11-14 · **Estado:** Confirmada
- **Decisión propuesta:** Pausar y autoguardar. Sin progreso ni pérdidas en tiempo real fuera del juego. Al volver, el juego sigue en pausa.
- **Aprobación:** Aprobada (2026-11-14).

### D-014 — Herramientas de producción voxel
- **Fecha:** 2026-11-14 · **Estado:** Confirmada
- **Decisión propuesta:** MagicaVoxel (objetos y piezas), Blockbench (esqueleto y animaciones), Blender (opcional). En la primera iteración técnica, modelos definidos en JSON y generados por código.
- **Consecuencias:** Verificar licencias de cada herramienta antes de producir recursos definitivos.
- **Aprobación:** Aprobada (2026-11-14): MagicaVoxel y Blockbench como candidatas; los primeros recursos se generan por código a partir de definiciones voxel.

### D-015 — Dispositivos de referencia y métricas de rendimiento
- **Fecha:** 2026-11-14 · **Estado:** Confirmada
- **Decisión propuesta:** Tabla de `ARCHITECTURE.md` §9 (mínimo iPhone 11 / Android gama media-baja 2021–22; 30 FPS mínimo, 60 FPS en referencia).
- **Aprobación:** Aprobada (2026-11-14). **No se declara validación móvil sin pruebas en dispositivos reales.**

### D-016 — Licencia del código y de los recursos
- **Fecha:** 2026-11-14 · **Estado:** Confirmada
- **Decisión propuesta:** Repositorio privado y "todos los derechos reservados" (sin archivo de licencia abierta), por tratarse de un producto comercial. No añadir ningún archivo LICENSE sin aprobación.
- **Aprobación:** Aprobada (2026-11-14): todos los derechos reservados para código y recursos propios; respetar licencias de dependencias y recursos externos.

### D-017 — Uso de IA generativa en la producción de recursos
- **Fecha:** 2026-11-14 · **Estado:** Confirmada
- **Contexto:** Está prohibida la IA generativa en tiempo real dentro del juego. No está definido si puede usarse durante la **producción** (conceptos, texturas, textos).
- **Decisión propuesta:** No usar IA generativa para recursos finales hasta que el propietario lo apruebe, por incertidumbre sobre derechos de autor y políticas de tiendas. Permitido como apoyo a la documentación y el código.
- **Aprobación:** Aprobada (2026-11-14): autorizados recursos generados mediante código y prototipos visuales. Recursos finales generados mediante IA deben revisarse antes de su aprobación comercial.

### D-018 — Simulación determinista con semilla
- **Fecha:** 2026-11-14 · **Estado:** Confirmada
- **Decisión propuesta:** Paso fijo + PRNG con semilla y flujos separados, estado del RNG guardado en la partida. Permite pruebas de regresión, depuración por *replay* y balance masivo.
- **Aprobación:** Aprobada (2026-11-14).

### D-019 — Oficinas: modelo de cuadrícula con construcción progresiva
- **Fecha:** 2026-11-14 · **Estado:** Confirmada
- **Decisión propuesta:** Modelo de datos en cuadrícula desde el principio; MVP con ranuras fijas; colocación libre de muebles en F4; construcción de salas en etapas avanzadas (GDD §3.3, Q-001).
- **Aprobación:** Aprobada (2026-11-14).

### D-021 — Mundo con empresas y tecnologías ficticias
- **Fecha:** 2026-11-14 · **Estado:** Confirmada
- **Decisión propuesta:** Plataformas, empresas y tecnologías ficticias inspiradas en las reales (Q-002), por riesgo de marcas y control del balance.
- **Aprobación:** Aprobada (2026-11-14): empresas, tecnologías y marcas ficticias.

---

## Propuestas pendientes de aprobación

_(Ninguna abierta tras la 3.ª sesión salvo las marcadas como provisionales más abajo; D-020 se conserva aquí por trazabilidad.)_

### Q-011 — ¿Cómo dar uso al dinero acumulado? — **Respondida** (5.ª sesión): no reducir ingresos de forma arbitraria; dar utilidad al dinero con inversiones, equipamiento, actividades y progresión. Se aplica en Growing Together (GT.1–GT.4, reequilibrio en GT.7).
- **Contexto:** tras un año de juego el estudio acumula 137 000–310 000 €; la oficina absorbe ≤ 3 %.
- **Opciones:** (a) **recomendada:** adelantar de F4 la contratación del primer empleado con salario (el gran uso del dinero y el siguiente paso natural del estudio) y la ampliación de la oficina; reequilibrar ingresos después; (b) recortar ahora los ingresos de los juegos ≈ 30–40 % (más tensión pronto, pero el excedente vuelve en el segundo año); (c) dejarlo así hasta F4 y priorizar F3.2+.
- **Necesita:** decisión del propietario.

### D-020 — Ubicación de los documentos
- **Fecha:** 2026-11-14 · **Estado:** Confirmada (propietario, 2026-11-14 — 3.ª sesión): documentos en `docs/`, `CLAUDE.md` en la raíz.
- **Decisión propuesta:** `CLAUDE.md` en la raíz (lo lee Claude Code automáticamente); el resto de documentos maestros en `docs/`.
- **Nota (2026-11-14):** el propietario indica que no se explicó en el informe; **no está aprobada**. Contenido: `CLAUDE.md` en la raíz (Claude Code lo carga automáticamente) y el resto de documentos maestros en `docs/`. Es una organización de archivos reversible; se mantiene así hasta que el propietario decida.

---

## Decisiones menores y reversibles tomadas por Claude (sesión F1–F2, 2026-11-14)

Autorizadas por el propietario como "decisiones pequeñas, reversibles y coherentes con lo aprobado". Pueden revertirse sin coste relevante.

### D-009a — Cámara dimétrica como predeterminada (provisional)
- **Estado:** Confirmada como provisional por el propietario (3.ª sesión): se mantiene la dimétrica y la alternativa isométrica hasta F1.12.
- **Decisión:** Dimétrica (elevación 30°) por defecto; isométrica (35,26°) disponible en el menú y con `?cam=iso`.
- **Motivo:** Muestra más las paredes (póster, ventana, estantería: personalidad de la habitación), menos suelo vacío y encaja mejor en horizontal. Comparativa: `docs/screenshots/cam-dimetric.png` vs `cam-isometric.png`.

### D-022 — Escala de los Empirians: 0,78 respecto al vóxel del escenario
- **Estado:** Mantener provisionalmente (propietario, 3.ª sesión) hasta su revisión visual (F1.12).
- **Decisión:** El Empirian conserva sus proporciones en vóxeles (cabeza 10×10×9, ≈ 45 % de la altura) pero se dibuja a escala 0,78.
- **Motivo:** A escala 1 el personaje parecía gigante frente a un escritorio de 10 vóxeles de alto. Alternativa descartada por ahora: reducir la resolución del personaje (perdía detalle facial) o agrandar todos los muebles (rehacer la escala de la cuadrícula).
- **Consecuencias:** Los vóxeles del personaje son algo más pequeños que los del escenario. Si se considera un problema estético, la alternativa es rehacer los muebles a mayor tamaño.

### D-023 — Guardado web en localStorage (en lugar de IndexedDB)
- **Estado:** Aceptada para el prototipo (propietario, 3.ª sesión). **Revisar la estrategia de almacenamiento antes de cualquier versión comercial.**
- **Decisión:** `LocalSaveStorage` con autoguardado + copia de seguridad (`auto.bak`). La interfaz `SaveStorage` permite cambiar a IndexedDB o al sistema de archivos de Capacitor sin tocar el juego.
- **Motivo:** Las partidas pesan pocos KB; localStorage es síncrono y más simple. Revisar cuando el registro causal crezca (R-004) o al añadir el adaptador nativo.

### D-024 — Valores de balance iniciales
- **Estado:** Provisional
- **Decisión:** Constantes en `src/sim/config.ts`, ajustadas con `npm run sim` para que: el plazo óptimo sea interior (~8 semanas para un juego pequeño), el presupuesto tenga rendimientos decrecientes (a partir de ~4000 € deja de compensar), el precio tenga un óptimo que sube con la calidad, y el crunch y las pocas pruebas empeoren el resultado en promedio.

### D-025 — Pinchar dependencias de desarrollo a versiones actuales sin vulnerabilidades
- **Estado:** Aplicada; **sustituida en parte por D-028** (ya no hace falta `--legacy-peer-deps`).
- **Decisión:** Vite 8.3.5, Vitest 5.0.5, Three.js 0.170, TypeScript 5.6, Capacitor 8.5.3. Instalación con `npm install --legacy-peer-deps` (fallo interno de npm al resolver *peer dependencies* opcionales de Vitest 5).
- **Licencias:** todas permisivas (MIT, ISC, BlueOak-1.0.0, BSD-3-Clause, Apache-2.0, 0BSD, Unlicense). Ver `ASSET_REGISTRY.md`.

### D-026 — Identificador de aplicación provisional `top.expires.empires`
- **Estado:** Provisional (propietario, 3.ª sesión). **No es definitivo para publicación**; decidir antes de F10.
- **Motivo:** Capacitor necesita un identificador; se ha usado el dominio disponible. **Una vez publicada la app no puede cambiarse**, así que debe confirmarse antes de F10.

### D-027 — Límites de arquitectura comprobados por prueba en lugar de ESLint
- **Estado:** Confirmada (propietario, 3.ª sesión).
- **Decisión:** `tests/architecture.test.ts` comprueba que `src/sim/` no importa render/UI/plataforma/Three.js ni usa `Math.random`, `Date.now`, DOM o `localStorage`. Evita añadir ESLint y su árbol de dependencias por ahora.

---

### D-028 — npm ≥ 11 obligatorio; versiones exactas; override de `uuid`
- **Fecha:** 2026-11-14 (3.ª sesión) · **Estado:** Aplicada (reversible)
- **Causa exacta del `--legacy-peer-deps`:** fallo interno de **npm 10.9.x** (`TypeError: Cannot read properties of null (reading 'edgesOut')` en `@npmcli/arborist` → `build-ideal-tree.js #loadPeerSet`). Se reproduce instalando **solo `vitest`** (4.1.12 o 5.0.5) en un directorio vacío con npm 10.9.9; no es un conflicto real entre nuestras dependencias. Las *peer dependencies* opcionales de Vitest (`@vitest/browser-*`, `@vitest/ui`, `@vitest/coverage-*` que a su vez declaran `vitest` como *peer*) forman, probablemente, un ciclo de *peers* que esa versión de npm no resuelve (hipótesis; el síntoma y la solución sí están verificados).
- **Comprobado:** npm 11.21.1 y 12.2.1 instalan el proyecto desde cero sin errores y sin indicadores especiales.
- **Decisión:** `package.json` declara `"engines": {"npm": ">=11.0.0", "node": ">=22.12.0"}` y `"packageManager": "npm@11.21.1"`; lockfile regenerado con npm 11. Con npm 10 instalado, usar `npx npm@11 install`.
- **Versiones exactas** (sin `^`) para evitar que una instalación nueva traiga versiones publicadas hace días: three 0.170.0, @capacitor/* 8.5.3, vite 8.3.5, vitest 5.0.5, typescript 5.9.3, @types/node 22.20.5, @types/three 0.170.0.
- **Override:** `@capacitor/cli 8.5.3 → xcode 3.0.1 → uuid 7.0.3` tiene un aviso moderado (GHSA-w5hq-g745-h8pq, afecta a v3/v5/v6 con `buf`). `xcode` solo usa `uuid.v4()`; se fuerza `uuid 11.1.1` (compatible CJS, `v4` verificado). Herramienta de desarrollo, no se distribuye en el juego. Retirar el override al actualizar a una CLI de Capacitor que ya lo incluya (8.6.2+).
- **Resultado:** `npm audit` 0 vulnerabilidades; 40/40 pruebas; build correcta.

### D-029 — Historial para partidas largas y política de guardado
- **Fecha:** 2026-11-15 · **Estado:** Aplicada (reversible; revisar con D-023 antes de versiones comerciales)
- **Medición:** 60 proyectos (11 años de juego) = 151 kB de partida (2,5 kB por proyecto), 532 entradas de registro, 361 comandos. El crecimiento es lineal y pequeño; los datos de producto (críticas, ventas) pesan más que el registro.
- **Registro causal:** se conserva completo para el proyecto activo y los 5 últimos publicados; en los anteriores se archivan las entradas rutinarias (cambios de ritmo, presupuesto, pruebas) y se conservan siempre los hitos (inicio, decisiones, promesas, lanzamiento) y toda entrada citada por una explicación, de forma transitiva. La compactación forma parte de la simulación determinista. Los datos de producto no se borran nunca (alimentarán el museo, GDD §15).
- **Comandos:** el registro de comandos es solo de sesión (en memoria, con tope de 5 000). **La partida guardada es un punto de control completo** (estado + generador aleatorio): la reproducibilidad se garantiza desde cualquier guardado más los comandos posteriores, sin necesidad de conservar todos los comandos desde el día 1. Alternativa descartada: guardar el historial completo de comandos para repetir la partida entera (crece sin límite y se rompe al cambiar el balance entre versiones).
- **Guardado:** escritura verificada (se serializa, se relee y se compara antes de sustituir nada), dos copias de seguridad rotativas, recuperación automática de la copia más reciente válida con aviso al jugador, y cuarentena de partidas dañadas o de versiones más nuevas (nunca se sobrescriben). Importar y "nueva partida" dejan la partida anterior en copia.
- **Pendiente para versiones comerciales:** almacenamiento nativo (Capacitor Filesystem), varias ranuras visibles para el jugador, y política ante cambios de balance entre versiones.

### D-030 — Ajustes de balance tras la revisión del gameplay
- **Fecha:** 2026-11-15 · **Estado:** Aplicada (provisional hasta F2.12)
- **Motivo:** la simulación de 648 planes mostró tres estrategias dominantes (aprobar siempre la gran idea, ritmo siempre normal, tamaño siempre pequeño). Detalle y tablas antes/después en `GAMEPLAY_REVIEW.md` §1.
- **Cambios:** gran idea como apuesta con semilla (65 % gran salto, 35 % pequeño; +35 % de trabajo; bugs ×1,2); desgaste de energía a ritmo normal 0,7 → 0,85 y crunch ×1,45 con desgaste 1,5; juegos medianos con audiencia ×1,9 y precio aceptado +3 €.
- **Protección:** 6 pruebas de no-dominancia en `tests/sim/consequences.test.ts`.
- **No cambiado a propósito:** la escala económica (sobra dinero). Requiere decisión del propietario tras jugar.

### D-031 — Internacionalización
- **Fecha:** 2026-11-15 · **Estado:** Aplicada
- **Decisión:** sistema propio y mínimo (`src/i18n`): catálogos por idioma como objetos TypeScript, función `t(clave, parámetros)` con formatos (dinero, números, porcentaje, precio, tema) y plurales mediante `Intl`. Español es el idioma base; inglés incluido como **borrador sin revisar**. Sin dependencias nuevas.
- **Regla:** la simulación no contiene texto para el jugador; guarda referencias `{clave, parámetros}` (registro causal, decisiones, críticas) y códigos de error. Así una partida guardada puede mostrarse en cualquier idioma y añadir un idioma no toca la lógica.
- **Consecuencia:** el formato de guardado pasa a la versión 2, con migración desde la 1 probada con partidas reales de la versión anterior.
- **Para añadir un idioma:** crear `src/i18n/<código>.ts` con las mismas claves (una prueba lo exige) y registrarlo en `i18n.ts`.

### D-032 — Dirección artística aprobada como base (F1.12)
- **Fecha:** 2026-11-15 (4.ª sesión) · **Estado:** Confirmada por el propietario
- **Decisión:** se conserva la identidad visual actual (Empirians, paleta, oficina voxel) como base del juego. Cámara dimétrica (D-009a) y escala 0,78 (D-022) quedan como valores actuales. Sin rediseño radical.
- **Consecuencias:** los objetos nuevos (catálogo de oficina, etc.) deben mantener la escala, la paleta maestra y el mallado voxel existentes.

### D-033 — Primera prueba de juego del propietario (F2.12)
- **Fecha:** 2026-11-15 · **Estado:** Registrada
- **Valoración:** muy positiva para una versión temprana. Peticiones principales: más personalización de la oficina, más variedad de actividades, eventos, noticias y tendencias.
- **Importante:** el equilibrio y la diversión definitiva **no** se consideran validados; habrá más pruebas de juego tras *A Living Studio*.

### D-034 — Economía: dar usos al dinero antes de recortar ingresos
- **Fecha:** 2026-11-15 · **Estado:** Confirmada por el propietario
- **Decisión:** no reducir drásticamente los ingresos todavía. Primero introducir usos interesantes del dinero (equipamiento, costes recurrentes, formación, investigación, mantenimiento, contratación, expansión) y después equilibrar ingresos, gastos, inversión y progresión de forma conjunta. Debe seguir siendo viable jugar como estudio pequeño y rentable, sin cadenas de compras obligatorias.

### D-035 — Experiencia del fundador adelantada desde F4
- **Fecha:** 2026-11-15 · **Estado:** Confirmada por el propietario
- **Decisión:** se adelanta a esta actualización una parte pequeña de F4: el fundador aprende de sus actividades reales y se especializa, con rendimientos decrecientes y sin progresión infinita. El sistema se diseña para ampliarse a empleados, personalidades y equipos en F4.

### D-036 — Actualización "A Living Studio" y orden de trabajo
- **Fecha:** 2026-11-15 · **Estado:** Confirmada (visión y orden propuestos por el propietario; reordenación técnica documentada en `ROADMAP.md`)
- **Decisión:** la siguiente actualización convierte la sucesión de juegos en un estudio vivo: experiencia del fundador, catálogo y personalización de la oficina, Empires Daily (noticias y tendencias), eventos dinámicos, una primera actividad alternativa (contratos) y una revisión económica conjunta. Se adelantan partes pequeñas de F4 (oficina, experiencia), F5 (tendencias, competidores, productos persistentes) y F8 (contratos). El resto de esas fases sigue en su sitio.

### D-037 — Modelo de experiencia del fundador y ajustes asociados
- **Fecha:** 2026-11-15 · **Estado:** Aplicada (provisional hasta LS.9 y nuevas pruebas de juego)
- **Modelo:** nivel = base + 3 · (1 − e^(−xp/1800)), techo 9,5. La experiencia se mide en **horas de práctica** de cada actividad (1 tick = 1 hora), no en puntos producidos: así el presupuesto o el equipamiento no "compran" aprendizaje. Programar → programación; diseñar → diseño; concepto y pulido de mejoras → creatividad; días gestionando un proyecto, decisiones y lanzamientos → gestión; horas en un tema → especialización (máx. +0,45 de techo de calidad, escala 1 500 h).
- **Efectos:** programación/diseño afectan a velocidad, techo de calidad y bugs (como antes); creatividad: +0,12 de techo por nivel sobre 5 y +4 % de acierto de la gran idea; gestión: −3 % de cansancio por nivel sobre 5.
- **Medición (10 juegos del mismo tema, 6 semillas):** nota 6,4 → 8,1; sin aprendizaje 6,2 → 6,7. El aprendizaje aporta ≈ +1,3 puntos en 10 juegos; un fundador que programa acaba con programación ≈ 7 y uno que diseña, con diseño ≈ 7.
- **Ajustes colaterales necesarios:**
  - La velocidad por habilidad pasa de proporcional (nivel 7,5 = ×1,5) a suave (`1 + 0,1·(nivel − 5)`, nivel 7,5 = ×1,25): con la anterior el aprendizaje se retroalimentaba (más velocidad → más pulido → más calidad) y la nota subía > 2 puntos.
  - El marketing satura dentro de un proyecto (`hypeSaturation` 4) y el impulso de productividad del presupuesto baja de 0,45 a 0,30: con juegos algo mejores, el presupuesto máximo volvía a ser lo más rentable. La velocidad de trabajo pasará a venir sobre todo del equipamiento de la oficina (LS.4). Ajuste final en LS.9.

### D-038 — Oficina por catálogo: cuadrícula, reglas y efectos
- **Fecha:** 2026-11-15 · **Estado:** Aplicada (provisional hasta LS.9 y pruebas de juego)
- **Cuadrícula:** medias baldosas de 6 vóxeles; la habitación inicial mide 10 × 8. Rotación en pasos de 90° alrededor del centro de la huella.
- **Capas:** muebles sólidos, alfombras (se pisan y admiten muebles encima) y piezas montadas (ordenador y silla van en un escritorio; un escritorio nuevo incluye los básicos).
- **Reglas de colocación** (en la simulación, compartidas con la vista previa): dentro de la habitación; sin solapes; respetar la **zona de acceso** de cada mueble (delante del escritorio, del sofá, de la cafetera…); y que **todo el suelo libre quede conectado** (sin rincones inaccesibles). No se puede vender el último escritorio ni la última estantería (guarda las cajas de los juegos). Vender devuelve el 50 %.
- **Efectos sin acumulación:** ordenador y silla solo cuentan en el puesto del fundador (el escritorio con mejor ordenador); de pizarras, sitios de descanso y cafeteras cuenta solo el mejor; la decoración mejora el ambiente con saturación fuerte (`1 − e^(−x/3)`), que arrastra el ánimo hacia 52–78.
- **Contrapartidas:** la estación de trabajo acelera la programación (+16 %) pero no el diseño (−2 %) y gasta 6 €/día; el equipo creativo, al revés; el ordenador de desarrollo mejora un poco ambos; la cafetera da energía cada mañana a cambio de 5 €/día; la silla ergonómica reduce el cansancio un 15 %.
- **Medido por pruebas:** en un juego técnico la estación de trabajo supera al equipo creativo y en uno de diseño ocurre lo contrario; ningún ordenador se amortiza en un solo juego (inversión a largo plazo); dos pizarras valen lo mismo que una.
- **La habitación de la v0.1 es la oficina inicial** con efectos neutros: el equilibrio anterior no cambia (todas las pruebas previas siguen pasando).

### D-039 — Empires Daily: modelo del mundo y equilibrio de las tendencias
- **Fecha:** 2026-11-15 · **Estado:** Aplicada (provisional hasta LS.9 y pruebas de juego)
- **Demanda de un tema** = deriva semanal × curva de tendencia × economía ÷ (1 + competencia). El mundo usa su propio flujo aleatorio (`world`), así que no altera el resto de tiradas.
- **Tendencias:** como mucho 2 a la vez; suben 35–56 días hasta un pico (+90 % a +140 % de demanda) y se apagan en 42–70 días. **Competidores** (PixelForge, ByteBakery, Nimbus Games, LoopLab): publican con un 10 % semanal; cuando una tendencia ya está en su pico, la mitad se lanzan a ella y la saturan (la competencia decae un 12 % semanal). **Economía:** paseo aleatorio en 0,85–1,15; solo hay noticia al cruzar ±6 %. **Herramientas:** +8 % de velocidad en programar o diseñar durante 42 días. **Resurgimientos:** un tema de un juego tuyo de hace más de 140 días vuelve brevemente y ese juego vuelve a vender.
- **Regla:** cada titular lo escribe un cambio real del estado (prueba automática sobre 1 500 días y 3 semillas). Solo los lanzamientos rivales notables (nota ≥ 7,3) o del tema en el que trabajas salen en el periódico; la saturación siempre se simula y se ve en la etiqueta del tema.
- **Medición (8 juegos, 16 semillas):** perseguir cualquier tendencia en cualquier fase rinde ≈ −37 % frente a quedarse en un tema; anticiparse a tendencias recién anunciadas queda entre −6 % y +3 % según el tema propio (alternativa viable con otro riesgo); evitar temas saturados ≈ igual. Ninguna estrategia domina.
- **Productos con vida propia (1.ª parte):** tras las 10 semanas de lanzamiento, cola de ventas del 5 % de la primera semana con caída del 7 % semanal hasta < 3 copias (en las pruebas, menos del 35 % de las ventas de lanzamiento).

### D-040 — Eventos dinámicos: motor, ritmo y primer conjunto
- **Fecha:** 2026-11-15 · **Estado:** Aplicada (provisional hasta pruebas de juego)
- **Motor:** cada evento tiene condición sobre el estado real, probabilidad diaria (puede depender del estado: la creatividad aumenta las ideas inesperadas), enfriamiento por tipo, opciones y efectos. Los **efectos diferidos** se guardan en `state.scheduled` (día, causa, efecto serializable: reputación, competencia, parche) y al aplicarse dejan una entrada en el registro causal enlazada a la decisión que los provocó. Es la base para eventos encadenados.
- **Ritmo:** como mucho un evento cada 14 días y 2 por proyecto, además de los Momentos Decisivos del proyecto (máx. 3 + gran idea + fecha). Medido: ≈ 0,5 eventos por juego pequeño y ≈ 1,5 por mediano.
- **Eventos:** vista previa para una creadora de contenido (más interés; si el juego sale con ≥ 5 bugs, la crítica lo recuerda: −0,6 de nota y causa en "¿Por qué?"); rival que anuncia un juego similar (su fecha la fija su plan: ~7 días después de la tuya; adelantarse, diferenciarse o ignorarlo); error grave en un juego publicado (parche ahora: +reputación y ventas; parche más tarde: −4 de reputación a los 21 días; ignorarlo: −6 y −30 % de ventas); idea inesperada en el concepto (explorarla ahora o guardarla: el **siguiente** proyecto gana +0,4 de techo).
- **Equilibrio medido (30 semillas):** ante el rival, en un juego pequeño diferenciarse rinde +16 % frente a ignorar y en uno mediano adelantarse y diferenciarse empatan (+22 %); ante la vista previa, dar la versión actual gana con juegos limpios (+15 %) y es la peor opción con juegos llenos de bugs, donde gana la demo pulida. Ninguna opción domina en todos los contextos.
- **Corregido durante la medición:** (1) el rival llegaba según la nueva fecha del jugador, así que adelantarse nunca servía; (2) la idea inesperada mezclaba condición y azar en el disparador; (3) el jugador automático no respondía a eventos surgidos entre proyectos.

### D-041 — Contratos externos: primera actividad alternativa
- **Fecha:** 2026-11-16 · **Estado:** Aplicada (provisional hasta LS.9 y pruebas de juego)
- **Regla:** un solo trabajo a la vez: un juego **o** un encargo. Los encargos llegan cada semana (al menos uno si hay hueco, hasta 3), caducan en 7–14 días y vienen de clientes ficticios (panadería, gimnasio, museo, startup, escuela, floristería) con cuatro tipos (web, app, corrección de errores, prototipo) que piden más programación o más diseño.
- **Pago y plazo:** pago = trabajo × 62 € × (0,85 + reputación/200) × ±10 %. El jugador ve su **estimación honesta** (habilidad real, oficina y una eficiencia media del 85 %) y el plazo del cliente (estimación + 20–60 %); si la estimación se acerca al plazo, la oferta se marca como arriesgada.
- **Consecuencias:** −4 % del pago por día de retraso (máximo −60 %) y −1 a −3 de reputación; +10 % y +2 de reputación si entregas con un cuarto del plazo de margen; cancelar cuesta 4 de reputación y no cobra nada. Dan experiencia de programación/diseño y +8 de gestión.
- **Equilibrio medido (autoplay, varias semillas):** encargos ≈ 377 €/día frente a ≈ 839 €/día haciendo juegos (≈ 45 %), ≈ 9 % de entregas tardías. Son ingresos **seguros** para tapar huecos o reponerse tras un fracaso, no la estrategia dominante (prueba `contracts are a safe alternative, not a dominant strategy`).
- **Representación:** botón "Encargos" con contador en la oficina, tarjeta de ofertas, píldora de progreso abajo y el Empirian trabajando en su escritorio; aviso al entregar.

### D-042 — Revisión económica conjunta tras "A Living Studio" (LS.9)
- **Fecha:** 2026-11-16 · **Estado:** Aplicada (medición); la respuesta al excedente queda como pregunta Q-011
- **Medición:** carreras de un año con 9 estrategias y 20 semillas (`docs/GAMEPLAY_REVIEW.md` §9). Juegos ≈ 239 000 €/año; encargos ≈ 57 % de eso con menos riesgo; oficina sensata +9 %, oficina cara apenas +2 % más; crecer a mediano con oficina +22 %; tendencias −10 % y más riesgo; ninguna estrategia baja de 0 €.
- **Conclusión:** no hay estrategias dominantes ni opciones huecas nuevas; **no se cambian constantes**. Se corrige la estimación de proyecto para incluir la oficina.
- **Problema abierto:** el dinero se acumula (137 000–310 000 € al año; la oficina absorbe ≤ 3 %). Recortar ingresos ahora no lo resuelve.
- **Propuesta `[PROPUESTA]`:** resolverlo con los grandes usos del dinero de F4 (contratar con salarios, ampliar la oficina, formación) y **después** reequilibrar ingresos con el mismo informe (`economy.report.ts`) como referencia. Pendiente de aprobación (Q-011).
- **Observación de diseño:** el ritmo normal no es sostenible en proyectos de más de ~40 días sin silla ni cafetera (gasta 6,8 de energía al día, recupera 5). Se mantiene: da una razón visible para invertir en la oficina y para alternar ritmos.

### D-043 — Plataformas: web para ordenador primero, una sola base de código
- **Fecha:** 2026-11-16 · **Estado:** Confirmada (propietario, 5.ª sesión)
- EMPIRES tendrá tres destinos: **web** (pensada para ordenador, jugable en móvil y tableta), **iOS** y **Android** (más adelante con Capacitor). Una sola base de código, una sola simulación y un solo sistema de guardado; la presentación se adapta al dispositivo sin duplicar lógica.
- **Web para ordenador:** ratón (el objeto fantasma sigue al cursor, un clic coloca), teclado (atajos que solo llaman a las mismas acciones de la interfaz), diálogos al lado en pantallas grandes para que la oficina siga visible, formularios en dos columnas. Los atajos y las pistas de teclado solo aparecen con puntero fino.
- **Móvil/tableta:** se mantienen los controles táctiles y el diseño horizontal existentes.

### D-044 — Ramas y despliegue web
- **Fecha:** 2026-11-16 · **Estado:** Confirmada (propietario, 5.ª sesión)
- `claude/friendly-ptolemy-klybh8` = desarrollo; **`production-web`** = solo versiones estables, actualizadas por Claude Code sin force push tras pruebas, compilación, migraciones y e2e; `main` no se toca. Cada versión se anota en `docs/WEB_RELEASES.md`.
- El propietario despliega desde **Hostinger**; Claude Code no publica ni configura proveedores, DNS ni dominio. Sitio estático en `dist/`, rutas relativas, sin backend (`docs/DEPLOY_WEB.md`).

### D-045 — Guardado a salvo de las direcciones de prueba y versión visible
- **Fecha:** 2026-11-16 · **Estado:** Aplicada (decisión técnica reversible de Claude Code)
- **Problema:** `?fresh` creaba una partida nueva que el autoguardado escribía encima de la real.
- **Solución:** con `?debug` el juego usa ranuras separadas (`empires.debug.save.*`); `?fresh`, `?seed` y `?stress` solo funcionan con `?debug`. Una dirección normal ignora todo salvo `lang` y `cam`.
- La versión (`package.json`), el commit y la fecha de compilación se inyectan al compilar y se ven en el menú. Versión actual: **0.4.0**.

### D-046 — Contratar al primer Empirian (GT.1)
- **Fecha:** 2026-11-16 · **Estado:** Aplicada (provisional hasta GT.7 y pruebas de juego)
- **Candidatos:** se desbloquean al publicar un juego o entregar un encargo; llegan 3 cada 14 días (flujo aleatorio propio `hiring`), duran 14–24 días. Perfiles programador/diseñador/generalista, rasgo y sueldo semanal según habilidad (en la práctica 450–760 €/semana).
- **Puesto:** hace falta un escritorio libre con ordenador y silla (los escritorios nuevos los traen). El empleado se queda ese escritorio (`assignedTo`), que no se puede vender; el fundador usa el mejor de los libres. Máximo 3 empleados (en la habitación actual solo cabe uno más: GT.4).
- **Trabajo en equipo:** todos trabajan en el proyecto o encargo activo con su habilidad, su ordenador, su silla y su energía; coordinación 1/(1 + 0,15·(n−1)) por persona (2 personas ≈ 1,74×). La "gran idea", los momentos y el techo de calidad siguen siendo del fundador.
- **Rasgos (sin almuerzo gratis):** perfeccionista (−35 % bugs, −10 % velocidad), noctámbulo (+20 % en crunch, +25 % de cansancio), sociable (+7 de ánimo objetivo para todo el equipo, −5 % velocidad), curioso (+60 % experiencia, −7 % velocidad).
- **Sueldos y despidos:** sueldo cada semana; despedir cuesta 2 semanas de sueldo, −12 de ánimo al resto y −2 de reputación.
- **Medición (1 año, 20 semillas):** juegos pequeños + 1 contratación ≈ 313 000 € frente a 239 000 € sin contratar (+31 %, sueldos ≈ 21 500 €), nota media 7,1 frente a 6,4 (el tiempo extra se va a pulir); estrategia realista +6 %. Contratar es la inversión principal que pedía Q-011; el excedente de dinero sigue ahí y se reequilibra en GT.7, cuando haya oficinas más grandes y más gastos.

### D-047 — La pausa congela el mundo: reloj de animación separado
- **Fecha:** 2026-11-16 · **Estado:** Aplicada (corrección pedida por el propietario)
- **Causa raíz:** la escena recibía el tiempo real desde el arranque; todas las animaciones (caminar, teclear, parpadeo, burbujas, confeti, pantallas) seguían con él aunque la simulación estuviera parada.
- **Solución:** tres relojes. Simulación: ticks fijos, solo con velocidad > 0 (ya era así). **Mundo** (`render/worldClock.ts`): avanza con el tiempo real solo si la simulación corre; la escena usa únicamente este reloj para todo lo que vive en la oficina. **Tiempo real**: interfaz, cámara, entrada y vista previa de decoración. Al reanudar, el mundo sigue desde el mismo instante (sin saltos). Antes de crear el estudio (pantalla del fundador) el mundo no está en pausa.
- **Carga en pausa:** `scene.settle()` coloca a cada Empirian en su sitio y postura sin avanzar el reloj del mundo.
- **Mientras decides:** las decisiones también pausan; el Empirian queda congelado con la mano levantada.

### D-048 — Recuerdos del estudio y logros con decoraciones (ML.2, ML.3)
- **Fecha:** 2026-11-16 · **Estado:** Aplicada (provisional hasta pruebas de juego)
- **Recuerdos:** se derivan de hechos reales, una sola vez cada uno: fundación, primer lanzamiento, primer éxito (≥ 8), éxitos, primer fracaso (< 5), remontada (≥ 7 tras un < 5), récord del estudio, primera contratación y las siguientes, despedidas, primer encargo, un Empirian que llega a nivel 8, hitos de caja (50 000 €–1 M€), primera compra para la oficina y las grandes decisiones ya escritas en el registro causal (gran idea, rival, error grave, vista previa, idea inesperada). Ligados a Empirians y productos. Máximo 400 (se descartan primero las decisiones antiguas).
- **Acceso en el mundo:** la estantería y los trofeos abren la "Historia del estudio" (también H y el menú); la caja de cada producto muestra su historia y su vida comercial (cierra LS.6).
- **Logros (opcionales, nada básico se bloquea):** Juego de oro → trofeo; Cinco juegos → placa; Ya no estás solo → foto del equipo; Clientes felices (5 encargos) → bonsái; Caja fuerte (100 000 €) → cartel luminoso; Remontada → cactus de la suerte. Son decoraciones bonitas con ambiente pequeño (y el cartel gasta 2 €/día): recuerdan, no obligan a optimizar.
- **Partidas antiguas:** migración 8→9 con el recuerdo de la fundación; al día siguiente se generan los recuerdos de su historia real (lanzamientos, contrataciones…).

### D-049 — Tutorial integrado (AW.A)
- **Fecha:** 2026-11-17 · **Estado:** Aplicada (provisional hasta pruebas de juego)
- **Progreso en la partida** (`state.tutorial`, guardado v10). 11 pasos: fundador → conocer al Empirian → pausa y velocidad → primer juego (el plan se explica dentro del diálogo) → progreso y energía → primera decisión → publicar → críticas y ventas → decorar → historia → cómo se desbloquea contratar (informativo; nunca se fuerza una contratación).
- **Hechos reales:** cada paso se completa por un hecho del juego (proyecto creado, decisión tomada, lanzamiento, compra…) o por una marca de la interfaz para lo puramente visual (abrir la ficha, cambiar la velocidad, abrir la historia…). Lo que el jugador hace por su cuenta cuenta y no se repite. Al reiniciar el tutorial, se toma la partida actual como punto de partida (no cuentan los juegos ya hechos), sin tocar nada más.
- **Presentación:** tarjeta pequeña abajo a la izquierda que no bloquea; con una ventana abierta se integra dentro de ella; resaltado del botón y flecha sobre personajes u objetos; oculta durante las decisiones; el bocadillo del fundador calla mientras guía. Textos distintos para ratón (con atajos) y para dedo.
- **Omitir y repetir:** "Omitir tutorial" desde la primera pantalla; Menú › Ayuda (o tecla ?) tiene una guía por temas y "Repetir el tutorial".
- **Partidas anteriores:** quien ya tenía proyectos no recibe el tutorial (puede iniciarlo desde Ayuda); una partida que aún no había empezado su primer juego sí.

### D-050 — Oficina viva: rutinas con propósito (AW.B) y reajuste de encargos
- **Fecha:** 2026-11-17 · **Estado:** Aplicada (provisional hasta pruebas de juego)
- **Pausas en la simulación (deterministas, sin azar):** como mucho **una por persona y día**, de una hora, solo mientras se trabaja:
  - **Descansar** en un sofá o sillón si la energía baja de 30 (+4 de energía más el descanso del mueble); nunca en crunch.
  - **Beber** a media mañana si la energía baja de 55 y hay cafetera (+4) o fuente de agua (+2, nueva, 120 €, sin gastos); en crunch solo el noctámbulo.
  - **Charlar** después de comer, un día de cada dos, si hay alguien sociable (o dos personas con el ánimo bajo): +3 de ánimo a ambos (+5 con alguien sociable); nunca en crunch.
  - Durante la pausa no se trabaja ni se gasta energía.
- **En la escena (solo visual, con el reloj del mundo, congelado en pausa):** cada pausa en su sitio (fuente o cafetera, sofá, pareja cara a cara), animaciones de beber y charlar, estiramientos en el puesto cuando hay cansancio, bostezos al estar agotado, el noctámbulo animado en crunch, el sociable buscando compañía, el curioso que va a mirar un objeto nuevo, el perfeccionista que se toma a pecho cada bug; el equipo celebra un éxito (≥ 8) y se desanima con un fracaso (< 5), se alegra al contratar y se entristece al despedir. El tiempo libre deja de ser un paseo al azar: cada uno va donde tiene sentido según su energía, ánimo y personalidad.
- **Rutas seguras:** si un destino no es alcanzable, el Empirian se queda donde está (antes atravesaba muebles) y lo vuelve a intentar.
- **Duración visible:** una pausa de una hora son 0,4 s reales a 1x; la vista la muestra 4,5 s del reloj del mundo (congelados en pausa) para que se vea levantarse, ir y volver. La simulación no cambia.
- **Reajuste de encargos (medido):** las pausas evitan que el fundador se hunda de cansancio en los encargos (que no tienen control de ritmo), y los encargos pasaron de ≈ 137 000 € a ≈ 235 000 € al año, casi igual que hacer juegos y con menos riesgo. Para devolverles su papel (opción segura pero menos rentable, D-041): tarifa 62 → 40 €/punto, estimación 0,85 → 0,95 (ya no hay agotamiento oculto) y margen de plazo 20–60 % → 5–50 %. Resultado: encargos ≈ 142 000 € (≈ 58 % de los juegos). Las estrategias de juegos apenas cambian (+1 %).

### D-051 — Identidad: editor, ficha y acabados de la oficina (AW.C)
- **Fecha:** 2026-11-17 · **Estado:** Aplicada
- **Editor de Empirians:** un único editor (el de creación, generalizado) para el fundador y los empleados. El comando `edit_empirian` solo cambia nombre (1–24 caracteres), apodo opcional (≤ 16) y aspecto (valores validados contra los catálogos); habilidades, experiencia, personalidad, sueldo, relaciones y recuerdos no se tocan (prueba). Vista previa voxel: el personaje se coloca solo, de frente, en la casilla libre más cercana a la cámara; los demás se ocultan mientras se edita; al cancelar se restaura.
- **Ficha:** al lado de la oficina (ordenador), con retrato, nombre y apodo, personalidad, energía, ánimo, tarea actual, antigüedad, habilidades, especialidades, sus recuerdos y una **biografía hecha solo de hechos** de la partida (`systems/biography.ts`: fundación o llegada, lanzamientos en los que participó y el mejor, punto fuerte, especialidad, habilidades dominadas, estado actual).
- **Acabados:** 5 colores de pared y 4 suelos, puramente estéticos (150 € pared, 300 € suelo, solo se paga lo que cambia); se prueban en la oficina antes de pagar y salir de Decorar sin aplicar lo deshace.
- **Zona de descanso:** puf (descanso 2, 160 €), alfombra redonda, mesita; **rincón acogedor**: un sillón, sofá o puf con una lámpara o planta a ≤ 2 casillas da +1 de descanso, una sola vez (no se acumula; la oficina inicial no lo tiene).

### D-053 — Funcionalidades y prototipos (AW.D.1/D.2, sobre F3.2)
- **Fecha:** 2026-11-17 · **Estado:** Aplicada (provisional hasta pruebas de juego)
- **Funcionalidades:** historia, personalización, multijugador, IA avanzada, editor de niveles, mundo abierto (solo medianos) y multiplataforma. Huecos: 2 en juegos pequeños, 3 en medianos. Desbloqueos por experiencia real: multijugador tras 1 lanzamiento, editor tras 2, mundo abierto tras 3, IA con programación 6 en el equipo, multiplataforma con reputación 45.
- **Efectos:** cada una suma trabajo y complejidad (bugs) y tiene un riesgo técnico oculto; da atractivo (techo de calidad) según lo bien que encaje con el tema, con rendimientos decrecientes, o **alcance** (más ventas) independiente del tema. Se explican con palabras ("Poco trabajo", "Riesgo alto", "Encaja con el tema", "Más jugadores"). El "¿Por qué?" de la nota las menciona.
- **Riesgo oculto:** decidido al empezar de forma determinista a partir de la semilla (no consume tiradas). Sin prototipo aparece a un 35 % de la producción: sacarla adelante (+80 % de su trabajo), recortarla (se recupera la mitad, pero baja el interés) o dejarla tal cual (−0,6 de techo y más bugs).
- **Prototipo:** +4 % de trabajo y 200 €. Al terminar el concepto revela los problemas cuando arreglarlos cuesta poco (+25 %) o quitarlos no cuesta nada; si no hay problemas, valida la idea (+0,15).
- **Medido (16 semillas, juego pequeño):** sin funcionalidades 166–188 €/día; una que encaja con tiempo para hacerla 234 €/día y +0,8 de nota; dos que encajan con más plazo dan la mejor nota pero menos €/día; una que no encaja o dos de golpe en poco tiempo, peor que nada (119–153 €/día); las de alcance venden más con peor nota. El prototipo compensa con funcionalidades arriesgadas (multijugador 208 frente a 187 €/día) y no con las seguras. Ninguna combinación domina.

### D-052 — Primera ampliación de la oficina (AW.E.1 / GT.4)
- **Fecha:** 2026-11-17 · **Estado:** Aplicada (provisional hasta GT.7)
- **Por qué ahora:** en la habitación inicial solo cabía un empleado; sin más espacio no se podían probar equipos mayores (orden ajustado: E.1 antes que D, como pedía el propietario si era necesario).
- **Estudio:** de 10×8 a 14×10 casillas; la cuadrícula crece hacia el frente del diorama, así que paredes, muebles, decoraciones y equipo se quedan exactamente donde estaban (prueba). Segunda ventana. La cámara encuadra la sala entera y la luz cubre el nuevo espacio.
- **Coste:** 25 000 € una vez + 60 €/día de alquiler (≈ 22 000 € al año: un uso del dinero con sentido, Q-011). Plazas: hasta 6 empleados más el fundador (antes 3, en la práctica 1 por espacio). Medido: caben al menos 4 escritorios más que en la habitación, todo el suelo libre sigue conectado y nadie atraviesa muebles.
- **Momento:** el equipo lo celebra y queda en la Historia del estudio ("estrena un estudio más grande"). Partidas anteriores: sin cambios (siguen en la habitación; sin migración).

### D-054 — Reparto de tareas (AW.E.2, sobre GT.3)
- **Fecha:** 2026-11-17 · **Estado:** Aplicada (provisional hasta pruebas de juego)
- **Papeles:** cada persona puede estar en **Auto** (por defecto: hace lo que pide el proyecto; no se guarda nada, partidas antiguas sin cambios), **Diseño**, **Código** o **Pruebas**. Se elige en la tarjeta del Equipo (solo con 2 o más personas) y hay un botón **Reparto automático** que lo deshace todo. La ficha muestra el papel.
- **Especialistas (diseño o código):** +12 % de velocidad en lo suyo, pero el juego necesita su mezcla: si el reparto real de trabajo se aleja más de 15 puntos del enfoque del juego, baja el techo de calidad (2,5 por unidad de desvío). La tarjeta lo explica con la mezcla actual ("62 % código, el juego pide 45 %").
- **Pruebas:** durante la producción dedica el 65 % de su tiempo a buscar y arreglar bugs y el 35 % a construir; mientras alguien prueba, los demás introducen un 40 % menos de bugs (revisión). En el pulido, prueba en vez de pulir; los especialistas apenas prueban. Si todos son de Pruebas, construyen igualmente (el juego no se queda bloqueado).
- **Medido (6 semillas, 2 personas):** en un juego pequeño con plazo holgado gana el automático (6,8) o un diseñador y un programador si el enfoque es equilibrado (6,9); con enfoque 0,3 todo código cae a 5,2. Con tester: en un juego pequeño y holgado pierde (6,5–6,6, producción más lenta) pero en un mediano ajustado (56 días) gana claramente (6,25 frente a 5,8; con funcionalidades con muchos bugs, 6,2 frente a 4,8). Ningún reparto domina; pruebas de no-dominancia en `tests/sim/roles.test.ts`.
- **Sin automatizar más:** con 2–3 personas basta un selector por persona; la asignación automática por fases es una idea para equipos grandes (Funcionalidades futuras, ROADMAP AW.E).

### D-055 — Primeros eventos de historia (AW.D, "The Next Chapter")
- **Fecha:** 2026-11-17 · **Estado:** Aplicada (provisional hasta pruebas de juego)
- **Motor:** los mismos eventos dinámicos de LS.7 (`systems/events.ts`): disparador sobre el estado real, probabilidad diaria, enfriamiento por tipo, **como mucho 2 por proyecto y 14 días entre dos eventos** (sin cambios). Nuevo: el evento puede tener **portavoz** (el empleado implicado pregunta él mismo y levanta la mano), cada uno ocurre **una vez por proyecto o encargo**, y deja un **recuerdo en la Historia con las personas implicadas** (aparece en su ficha). Contenido nuevo en `systems/storyEvents.ts`, números en `SIM_CONFIG.storyEvents`.
- **Seis eventos:**
  - **Idea de un empleado** (concepto o primera parte de la producción; más probable si es curioso o creativo): adoptarla (+techo según su creatividad, +6 % de trabajo, ánimo ↑↑), guardarla para el próximo juego (ánimo ↑) o rechazarla (ánimo ↓).
  - **El cliente pide cambios** en un encargo a medias: aceptarlos cobrando (+30 % de trabajo, +35 % de pago, +20 % de plazo), hacerlo como favor (+15 % de trabajo, reputación +3) o negarse (reputación −1).
  - **Feria de videojuegos** con el juego en producción o pulido: stand (1 500 €, interés ↑↑, reputación +1, ánimo del equipo ↑, 2 días de trabajo menos), mesa pequeña (300 €, interés ↑) o no ir.
  - **Crítica influyente** de un lanzamiento reciente: mandarle el juego es apostar por su calidad real (nota ≥ 7: ventas ×1,35 cinco semanas; < 5,5: ×0,75 y reputación −2), una entrevista da un empujón seguro (×1,12) a cambio de tiempo, o rechazarla.
  - **Discusión en el equipo** (producción, con empleados): hacerlo bien (+5 % de trabajo, bugs ×0,8), seguir adelante (−5 % de trabajo, bugs ×1,2) o término medio; quien gana se anima y quien pierde se desanima. Es la base de las relaciones de E.3.
  - **Petición de formación** (empleados con ≥ 14 días en el estudio): curso (900 €, +½ nivel aprox. en su habilidad principal, un día fuera), libros (150 €, menos) o "ahora no" (ánimo ↓).
- **Aplazado:** "un juego antiguo vuelve a estar de moda" espera a los productos persistentes (GT.6); ya existe el resurgimiento de un tema (LS.6).
- **Medido:** en carreras de un año todos aparecen en juego normal (con un empleado: formación y discusión en 5–6 de cada 10 partidas). Los eventos cambian la suerte de las semillas: con 6 semillas el escenario "encargos tras un fracaso" pasaba de 1,07× a 0,90× los juegos puros; con 52 semillas queda en 0,94–1,0× (antes ≈ 1,0–1,07×): ferias y críticas premian un poco más publicar juegos. La prueba de economía usa ahora 12 semillas y exige ≥ 0,92× (antes 0,95× con 6).
- **Simulador:** las carreras contestan los eventos como un jugador sensato (adoptar la idea, cobrar los cambios, mesa en la feria, entrevista, término medio, libros); `autoplay` usa opciones neutras.

### D-056 — Relaciones en el equipo (E.3)
- **Fecha:** 2026-11-22 · **Estado:** Aplicada (provisional hasta pruebas de juego)
- **Compromisos de diseño:** ligeras y basadas en hechos (nada aleatorio: no hay "química" por sorteo, solo rasgos), explicables en una línea, efectos moderados con tope y una tensión que siempre se suaviza. Ninguna relación mala puede hundir el estudio.
- **Modelo:** `state.relations` (opcional; partidas antiguas empiezan sin relaciones, sin migración). Por pareja: vínculo −100…100, días trabajados juntos, lanzamientos y éxitos compartidos, mentoría. Los tipos (amistad ≥ 45, buen equipo, respeto, mentoría, tensión ≤ −15, rivalidad ≤ −40) se derivan, no se guardan.
- **Hechos:** charla +3 (×1,25 por cada sociable, ×0,8 por cada perfeccionista, ×1,2 si ambos curiosos); día trabajando juntos +0,4 solo mientras el vínculo < 20; crunch −0,6 al día; lanzamiento +2, éxito (≥ 7) +6, fracaso (< 5) −4 (o +3 entre amigos); perder una discusión −14, acuerdo +5; la tensión se recupera +0,3 al día. Las ganancias se reducen al acercarse a ±100.
- **Efectos:** coordinación × (1 ± hasta 5 %) según el vínculo medio; ánimo ±0,3/día como máximo; mentoría: +3 de experiencia diaria al aprendiz y +1 de gestión al mentor, se cierra al quedar a 0,5 niveles (+10 de vínculo). Los amigos también tienen días de charla; nadie charla con quien tiene tensión; las discusiones (`team_debate`) surgen entre la pareja con peor vínculo.
- **Medido (carreras de un año con un empleado):** según la semilla aparece respeto (2 éxitos compartidos), amistad (con un compañero sociable) o mentoría; sin crunch ni discusiones no aparecen tensiones. Una primera versión hacía amigos a todos (trabajar juntos sumaba sin límite): corregido con el tope.
- **Pendiente:** más reacciones visibles (p. ej. el mentor en el puesto del aprendiz en vez de cara a cara) y relaciones como causa de eventos (oferta de otra empresa, cambio de especialización).

### D-057 — Deuda técnica (F3.4)
- **Fecha:** 2026-11-23 · **Estado:** Aplicada (provisional hasta pruebas de juego)
- **Sistemas reutilizados:** el motor de momentos de F3.1 (con portavoz, como los eventos de D-055), el registro causal y el "¿Por qué?", la Historia, la herencia entre proyectos (como las ideas guardadas), el ritmo de trabajo y las relaciones (D-056). No se ha creado ningún panel nuevo: solo una etiqueta en la tarjeta del proyecto y otra en la del juego nuevo.
- **Modelo:** `Project.debt` 0…100 y `company.techDebt` (opcionales; sin migración). Programar en producción suma 0,1 por punto técnico × ritmo (tranquilo 0,5, normal 1, crunch 2) × persona (habilidad ±8 % por nivel, perfeccionista ×0,7) × equipo (relaciones: hasta ∓20 %).
- **Costes (con tope):** programación −0,4 % por punto (máx. −20 %), bugs +1 % por punto, techo −0,015 por punto por encima de 10 (máx. −0,6). Palabras: sólido < 12 ≤ con parches < 35 ≤ frágil.
- **Herencia:** al publicar, el 40 % pasa al estudio (lo anterior se reduce a la mitad; máx. 40) y el siguiente juego empieza con ello (registrado y explicado).
- **Momentos:** *atajo* (solo con equipo, 20–50 % de la producción): −12 % del trabajo restante y +12 de deuda; *hacerlo bien*; *base sólida*: +4 % de trabajo, −8 de deuda y −10 % de trabajo en el siguiente juego. *Revisión del código* (deuda ≥ 20): reescribir el 75 % (0,8 puntos de trabajo por punto de deuda), arreglar el 40 % o seguir así.
- **Medido (6–8 semillas):** juego normal −2 % €/día y tranquilo +1 % respecto a 0.11.0; crunch todo el proyecto −11 % (primera versión −24 %: se redujo el multiplicador de 3 a 2). Atajo: +2 % a +17 % en un juego que no llega a tiempo (14–18 días), −3 % a −7 % en dos juegos seguidos. Base sólida: −6 % en un solo juego ajustado, +1 % en dos holgados. Reescribir, arreglar o seguir así quedan a ±3 % en dos juegos con crunch; la diferencia está en lo que hereda el tercero. Juegos pequeños en solitario: deuda 8–12, sin revisión.
- **Detectado al probar:** la primera versión del atajo nunca compensaba y la base sólida tampoco; además, los momentos nuevos iban primero y desplazaban a "vas con retraso" (máx. 3 por proyecto). Se corrigió el equilibrio, se pusieron al final de la lista y el atajo solo se ofrece con equipo.

### D-058 — Cambiar el alcance a mitad de producción (F3.2) y corrección del tester (D-054)
- **Fecha:** 2026-11-23 · **Estado:** Aplicada (provisional hasta pruebas de juego)
- **Idea de alcance:** entre el 15 y el 45 % de la producción, si queda un hueco de funcionalidad libre, la persona más creativa propone añadir la funcionalidad que mejor encaja con el tema (o, si el tema está de moda, una que llegue a más jugadores). Opciones: **añadirla** (cuesta un 30 % más de trabajo que si se hubiera planeado, con su riesgo oculto de siempre), **añadirla y retrasar 7 días** (interés ×0,9) o **mantener lo planeado**. Queda en la Historia con quien la propuso, que se alegra (+5) o se desanima un poco (−2).
- **Ritmo:** como mucho **una propuesta de equipo por proyecto** (atajo de código o idea de alcance, elegida por proyecto a partir de la semilla). En solitario solo hay ideas de alcance. Se mantienen 3 momentos por proyecto y 4 días entre ellos.
- **Medido (8 semillas, juego pequeño sin funcionalidades):** con 42 días, añadir 384 €/día frente a 302 manteniendo (con más plazo, 367); con 30 días, añadir sin más plazo empeora (179 frente a 210) y añadir con más plazo es lo mejor (327, frente a 291 de mantener y retrasar gratis desde el panel). Mantener lo planeado es la opción segura cuando no se puede mover la fecha. Aparece solo si el jugador dejó huecos libres: un plan completo nunca recibe la propuesta.
- **Corrección de D-054 (tester):** la ventaja medida del tester en juegos medianos ajustados dependía de que el simulador contestara el plan de pulido con "todo mejoras, sin pruebas". Con el plan equilibrado, el tester no ganaba nunca (opción hueca). Ahora construye la mitad del tiempo (antes 35 %), los demás cometen la mitad de bugs (antes 60 %) y, como revisa el código, **el equipo deja la mitad de deuda técnica**. Medido con plan equilibrado: gana en mediano ajustado (49 días: 6,27 frente a 6,03), empata en mediano holgado y pierde en pequeño holgado (6,60 frente a 6,80).

### D-059 — Reputación con memoria (F3.8) y corrección de la pausa (ML.1)
- **Fecha:** 2026-11-23 · **Estado:** Aplicada (provisional hasta pruebas de juego)
- **Pausa (causa real, no parche):** un Empirian que llegaba a un punto intermedio de su ruta justo en el último fotograma antes de pausar no recalculaba su orientación hasta el fotograma siguiente, que ya iba con el tiempo del mundo parado: la orientación objetivo cambiaba en pausa (la rotación visible no, porque se interpola con el tiempo). Capturado con instrumentación en la e2e (1 de cada ~6 ejecuciones a 4x). Corrección: con el tiempo del mundo parado `step()` no cambia ni la ruta ni la orientación, al llegar a un punto ya mira hacia el siguiente tramo, y la postura tampoco cambia en pausa (salvo la vista previa del editor). La foto de la prueba incluye ahora la rotación visible y la postura. Prueba de regresión `tests/render/pause.test.ts` (falla con el código anterior) y e2e de pausa a 1x/2x/4x/8x: 16 ejecuciones seguidas sin fallos. Dos falsos fallos de la propia prueba, demostrados con datos: el renderizador por software a veces no dibuja ningún fotograma durante 400 ms (ni el mundo ni la simulación avanzan), y a 8x una decisión puede aparecer entre contestar y pulsar pausa. La prueba ahora espera a que avance el tiempo del mundo y reintenta tras contestar.
- **Reputación — decisión de diseño:** se mantiene el prestigio general (`company.reputation`, sin cambios) y se añade una **trayectoria** con tres aspectos (calidad, cumplimiento de fechas y promesas, innovación), cada uno de −10 a 10. No hay barras nuevas: se cuenta con palabras ("Famosos por su calidad", "Fama de impuntuales", "Algo repetitivos"…) en la Historia del estudio y en el plan del siguiente juego.
- **Hechos:** lanzamiento (nota respecto a 6 y fallos → calidad; fecha anunciada cumplida o semanas de retraso → cumplimiento; tema nuevo, funcionalidades y prototipo validado → innovación; repetir tema sin nada nuevo → algo repetitivo), encargos (a tiempo, antes o tarde; cancelar), error grave (parchear ya, más tarde o ignorarlo). Cada hecho lleva el aspecto hacia su valor (35 %), pero **solo en su dirección**: un pequeño fallo no "mejora" una mala fama ni un buen encargo estropea una buena. Cada semana todo se olvida un 1,5 %: nada es permanente y siempre se puede recuperar.
- **Efectos (moderados, con tope):** críticas más o menos pacientes con los fallos (±15 % de la penalización, explicado en "¿Por qué?"); interés inicial de un juego nuevo (±0,4 por calidad, ±0,3 por innovación si trae funcionalidades); clientes que pagan ±8 % y dan ±10 % de plazo. Sin doble castigo: los fallos ya restan en la nota, la fama solo cambia la paciencia con ellos.
- **Historia:** llegar a "famosos"/"mala fama" en un aspecto, y **salir** de una mala fama, quedan como recuerdos (repetibles tras recuperarse), con reacción del equipo en la oficina.
- **Medido (3 semillas, 4 juegos):** con juegos de 6–7 la calidad queda en "juegos cuidados"; un fracaso inicial (nota 3, 25–41 fallos) la hunde a "calidad irregular" y tres juegos normales la devuelven a neutral; cuatro juegos del mismo tema dan "algo repetitivos", cuatro temas distintos no. Los hitos de fama solo llegan con éxitos sostenidos (≥ 7,7 sin fallos) o fracasos repetidos.

### D-060 — Proyectos diferentes sobre el mismo sistema (D.4)
- **Fecha:** 2026-11-23 · **Estado:** Aplicada (provisional hasta pruebas de juego)
- **Sin modos separados:** el tipo de proyecto sale del plan y se fija al empezar; se ve como una etiqueta en el mismo diálogo de "Nuevo videojuego".
  - **Indie** (juego pequeño, fundador y como mucho una persona): barato y de poco riesgo; si la idea está **redonda** (enfoque adecuado al tema, al menos una funcionalidad que encante a los jugadores de ese tema y ninguna fuera de lugar) gana +0,25 de techo, explicado en "¿Por qué?". La primera versión lo daba a cualquier juego pequeño con buen enfoque y hacía dominante lo pequeño (1,59× frente a mediano en la prueba de viabilidad): ahora exige una elección.
  - **Ambicioso** (juego mediano con ≥ 2 funcionalidades): +0,5 de interés inicial; se le juzga con expectativas altas: nota ≥ 8 → fenómeno (ventas ×1,35 seis semanas), nota < 7 → decepción (×0,75); cada funcionalidad extra cuesta un 3 % de coordinación por persona extra (máx. −15 %). Todo queda en la Historia.
  - **Encargos:** el mismo sistema de contratos, con **relación por cliente** (confianza −10…10 y trabajos): a tiempo +3, antes +4, tarde −3 por cada 3 días, cancelar −6. Los clientes con confianza pagan hasta +15 %; tras 3 trabajos bien hechos se vuelven **habituales** (recuerdo) y vuelven a pedir con frecuencia; uno defraudado (≤ −3) deja de pedir y perdona poco a poco (+0,5 por semana).
- **Medido (8 semillas, con 70 días de ventas):** indie en solitario sin funcionalidad 221 €/día (6,4), con la funcionalidad que encaja 364 €/día (7,7); mediano con equipo y 1 funcionalidad 520 €/día; ambicioso bien planeado 533 €/día (7,5), con plazo corto 571 €/día pero rozando la decepción (mín. 6,5); **ambicioso con funcionalidades que no encajan 460 €/día frente a 605 del mediano normal (−24 %)**. Año completo (12 semillas): solo juegos 235 000 € (190–298 k), solo encargos 163 000 € (157–170 k: menos, pero muy previsible), mixto 228 000 €.

### D-061 — Decisiones conectadas (bloque 3)
- **Fecha:** 2026-11-23 · **Estado:** Aplicada (provisional hasta pruebas de juego)
- **Conexiones que ya existían (documentadas, sin doble castigo):** deuda técnica → más bugs → fama de calidad (la fama solo cambia la paciencia con los fallos, no vuelve a restar la nota); relaciones → coordinación (±5 %) y menos deuda (hasta −20 %); tester → menos deuda; ampliar el alcance retrasando la fecha → la fecha anunciada se mueve → fama de cumplimiento.
- **Nuevas:** **experiencia ↔ riesgo:** el mejor programador del equipo reduce el riesgo oculto de las funcionalidades un 6 % por nivel por encima de 5 (−27 % con la habilidad máxima); la etiqueta de riesgo del plan lo refleja. **Prototipo ↔ confianza:** un prototipo validado aumenta el interés (+0,3), además de su bonificación de techo.

### D-062 — Progresión: de pequeño a imperio (desbloqueos por hitos)
- **Fecha:** 2026-11-23 · **Estado:** Aplicada (provisional hasta que el propietario juegue) · Diseño completo en `docs/PROGRESSION.md`.
- **Problema (prueba del propietario en macOS):** demasiada información y posibilidades desde el principio.
- **Decisión:** no se elimina ninguna mecánica; se presentan cuando el estudio llega a hitos reales: *mejor equipo* (el primer juego entra en producción), *planificar* y *periódico* (primer lanzamiento), *encargos* (primeras ventas semanales), *equipo* (dos lanzamientos, un encargo entregado o un lanzamiento con 15 000 €), *estudio* (dos juegos publicados: medianos, prototipo, estado del código, fama) y *ampliación* (oficina llena o cuatro juegos). Nunca se vuelve a bloquear lo alcanzado ni lo ya usado (evidencia).
- **Simulación:** `systems/progress.ts`; guardado v11 con migración que reconstruye el progreso de las partidas antiguas en silencio. El primer juego es tranquilo (sin eventos del estudio ni ideas de alcance); los encargos no generan ofertas hasta desbloquearse; la revisión del código llega con el estudio. Un aviso de desbloqueo nunca interrumpe una decisión.
- **Interfaz:** lo no desbloqueado no se muestra (sin candados); una sola línea anuncia lo siguiente. Aviso «¡Nuevo! …» con una frase, confeti en la oficina, recuerdo en la Historia y un punto «nuevo» en el botón durante 3 días. Ayuda, menú, guardar, pausa y velocidades siempre disponibles.
- **Medido:** primer juego de 29 a 15 botones, de 164 a 96 palabras, de 5 a 0 bloqueos; tarjeta del proyecto de 7 a 4 indicadores; Decorar de 81 a 38 palabras (capturas antes/después en `docs/screenshots/progression/`). Carrera normal (simulador): mejor equipo día 4, planificar y periódico día 43, encargos día 50, equipo días 50–64, estudio día 90, ampliación días 184–303; nadie se queda bloqueado.
- **Consecuencia de diseño:** ya no se puede empezar solo con encargos (los clientes llegan con las primeras ventas). El simulador anual («C») hace ahora un juego y después encargos. El simulador también contrata durante un proyecto (un jugador puede hacerlo siempre).

> **Pendientes de confirmar por el propietario tras jugar:** D-053, D-054 y D-055 (provisionales). D-056 (relaciones), D-057 (deuda técnica), D-058 (alcance; corrige D-054), D-059 (reputación), D-060 (tipos de proyecto), D-061 (conexiones) y D-062 (progresión) también son provisionales.

## Respuestas del propietario a preguntas abiertas (2026-11-14)

- **Q-005 Dominio:** el dominio disponible es **expires.top** (no es errata). El juego se llama EMPIRES. Uso pendiente.
- **Q-006 Marca:** EMPIRES y Empirians son nombres de trabajo; revisión comercial antes del lanzamiento.
- **Q-003 Ambientación:** mundo **contemporáneo**. Carreras históricas desde los 80 = funcionalidad futura.
- **Q-004 Bancarrota:** existirá en el futuro con oportunidades de recuperación; el sandbox podrá desactivarla.
- **Q-010 Recursos:** modelos originales mediante código y definiciones voxel modulares; sin artistas ni recursos externos en esta fase.
- **Q-008 Dispositivos:** sin lista definitiva. Se hacen las comprobaciones posibles en el entorno y se documentan las pruebas móviles pendientes.
