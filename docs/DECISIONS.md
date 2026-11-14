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

## Propuestas pendientes de aprobación

### D-005 — Motor visual: solución híbrida (voxel 3D, cámara isométrica fija, UI HTML)
- **Fecha:** 2026-11-14 · **Estado:** Propuesta
- **Decisión propuesta:** Opción C con **Three.js** + UI HTML superpuesta. Validación obligatoria de rendimiento en F1 antes de considerarla definitiva.
- **Motivo:** Personalización modular real sin explosión de sprites; animación rígida barata; cámara fija controla rendimiento y composición; HTML para la UI narrativa. Detalle en `ARCHITECTURE.md` §2.
- **Alternativas:** A) 3D con cámara libre (Three.js/Babylon.js); B) 2.5D con sprites prerenderizados (Phaser); Godot 4 (plan B); Babylon.js en lugar de Three.js.
- **Consecuencias:** Necesidad de un pipeline voxel → glTF; riesgo R-001 (WebGL en Android de gama baja).

### D-006 — Lenguaje: TypeScript
- **Fecha:** 2026-11-14 · **Estado:** Propuesta
- **Decisión propuesta:** TypeScript en modo estricto para simulación, render, UI y herramientas.
- **Motivo:** Tipado para un modelo de simulación grande; ecosistema web; pruebas rápidas; un solo lenguaje.
- **Alternativas:** GDScript/C# (si Godot); JavaScript sin tipos.
- **Consecuencias:** Herramientas: Vite, Vitest, ESLint (pendiente de aprobar dependencias).

### D-007 — Empaquetado móvil: Capacitor
- **Fecha:** 2026-11-14 · **Estado:** Propuesta
- **Decisión propuesta:** Capacitor para iOS y Android; la build web sirve como versión web.
- **Motivo:** Una base de código web con acceso a APIs nativas (archivos, ciclo de vida, háptica).
- **Alternativas:** Cordova (en declive); Tauri Mobile; Godot nativo.
- **Consecuencias:** Rendimiento depende del WebView del sistema; requiere Xcode y Android Studio en fases de pruebas en dispositivo.

### D-008 — Framework de UI
- **Fecha:** 2026-11-14 · **Estado:** Propuesta (sin elección)
- **Opciones:** Preact (+ signals), Svelte, Solid, o DOM sin framework.
- **Recomendación provisional:** Preact o Svelte — ligeros y suficientes. Decidir al iniciar F2 (la UI de F1 es mínima y puede hacerse sin framework).

### D-009 — Cámara isométrica
- **Fecha:** 2026-11-14 · **Estado:** Propuesta
- **Decisión propuesta:** Cámara ortográfica fija; elegir entre isométrica verdadera (~35,26°) y dimétrica (~30°) mediante comparación visual en F1. Rotación en pasos de 90° y zoom: futuro.
- **Alternativas:** Cámara libre; perspectiva.

### D-010 — Escala de tiempo de la simulación
- **Fecha:** 2026-11-14 · **Estado:** Propuesta
- **Decisión propuesta:** 1 tick = 1 hora de juego; a 1x ≈ 3 s reales por día laborable. A ajustar tras pruebas de juego.

### D-011 — Orientación horizontal
- **Fecha:** 2026-11-14 · **Estado:** Propuesta
- **Decisión propuesta:** Horizontal como orientación principal, validada en F1 en móvil real. Considerar soporte vertical en tabletas en el futuro.

### D-012 — Formato y almacenamiento de partidas
- **Fecha:** 2026-11-14 · **Estado:** Propuesta
- **Decisión propuesta:** JSON versionado con migraciones encadenadas; IndexedDB (web) / sistema de archivos Capacitor (móvil); autoguardado rotativo; exportación como archivo `.empires`.

### D-013 — Comportamiento al cerrar o pasar a segundo plano
- **Fecha:** 2026-11-14 · **Estado:** Propuesta (coincide con la propuesta inicial del propietario)
- **Decisión propuesta:** Pausar y autoguardar. Sin progreso ni pérdidas en tiempo real fuera del juego. Al volver, el juego sigue en pausa.

### D-014 — Herramientas de producción voxel
- **Fecha:** 2026-11-14 · **Estado:** Propuesta
- **Decisión propuesta:** MagicaVoxel (objetos y piezas), Blockbench (esqueleto y animaciones), Blender (opcional). En la primera iteración técnica, modelos definidos en JSON y generados por código.
- **Consecuencias:** Verificar licencias de cada herramienta antes de producir recursos definitivos.

### D-015 — Dispositivos de referencia y métricas de rendimiento
- **Fecha:** 2026-11-14 · **Estado:** Propuesta
- **Decisión propuesta:** Tabla de `ARCHITECTURE.md` §9 (mínimo iPhone 11 / Android gama media-baja 2021–22; 30 FPS mínimo, 60 FPS en referencia).

### D-016 — Licencia del código y de los recursos
- **Fecha:** 2026-11-14 · **Estado:** Propuesta
- **Decisión propuesta:** Repositorio privado y "todos los derechos reservados" (sin archivo de licencia abierta), por tratarse de un producto comercial. No añadir ningún archivo LICENSE sin aprobación.

### D-017 — Uso de IA generativa en la producción de recursos
- **Fecha:** 2026-11-14 · **Estado:** Propuesta (pregunta abierta)
- **Contexto:** Está prohibida la IA generativa en tiempo real dentro del juego. No está definido si puede usarse durante la **producción** (conceptos, texturas, textos).
- **Decisión propuesta:** No usar IA generativa para recursos finales hasta que el propietario lo apruebe, por incertidumbre sobre derechos de autor y políticas de tiendas. Permitido como apoyo a la documentación y el código.

### D-018 — Simulación determinista con semilla
- **Fecha:** 2026-11-14 · **Estado:** Propuesta
- **Decisión propuesta:** Paso fijo + PRNG con semilla y flujos separados, estado del RNG guardado en la partida. Permite pruebas de regresión, depuración por *replay* y balance masivo.

### D-019 — Oficinas: modelo de cuadrícula con construcción progresiva
- **Fecha:** 2026-11-14 · **Estado:** Propuesta
- **Decisión propuesta:** Modelo de datos en cuadrícula desde el principio; MVP con ranuras fijas; colocación libre de muebles en F4; construcción de salas en etapas avanzadas (GDD §3.3, Q-001).

### D-020 — Ubicación de los documentos
- **Fecha:** 2026-11-14 · **Estado:** Propuesta (aplicada de forma reversible)
- **Decisión propuesta:** `CLAUDE.md` en la raíz (lo lee Claude Code automáticamente); el resto de documentos maestros en `docs/`.

### D-021 — Mundo con empresas y tecnologías ficticias
- **Fecha:** 2026-11-14 · **Estado:** Propuesta
- **Decisión propuesta:** Plataformas, empresas y tecnologías ficticias inspiradas en las reales (Q-002), por riesgo de marcas y control del balance.
