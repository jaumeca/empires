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

## Respuestas del propietario a preguntas abiertas (2026-11-14)

- **Q-005 Dominio:** el dominio disponible es **expires.top** (no es errata). El juego se llama EMPIRES. Uso pendiente.
- **Q-006 Marca:** EMPIRES y Empirians son nombres de trabajo; revisión comercial antes del lanzamiento.
- **Q-003 Ambientación:** mundo **contemporáneo**. Carreras históricas desde los 80 = funcionalidad futura.
- **Q-004 Bancarrota:** existirá en el futuro con oportunidades de recuperación; el sandbox podrá desactivarla.
- **Q-010 Recursos:** modelos originales mediante código y definiciones voxel modulares; sin artistas ni recursos externos en esta fase.
- **Q-008 Dispositivos:** sin lista definitiva. Se hacen las comprobaciones posibles en el entorno y se documentan las pruebas móviles pendientes.
