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

### D-020 — Ubicación de los documentos
- **Fecha:** 2026-11-14 · **Estado:** Propuesta (aplicada de forma reversible)
- **Decisión propuesta:** `CLAUDE.md` en la raíz (lo lee Claude Code automáticamente); el resto de documentos maestros en `docs/`.
- **Nota (2026-11-14):** el propietario indica que no se explicó en el informe; **no está aprobada**. Contenido: `CLAUDE.md` en la raíz (Claude Code lo carga automáticamente) y el resto de documentos maestros en `docs/`. Es una organización de archivos reversible; se mantiene así hasta que el propietario decida.

---

## Respuestas del propietario a preguntas abiertas (2026-11-14)

- **Q-005 Dominio:** el dominio disponible es **expires.top** (no es errata). El juego se llama EMPIRES. Uso pendiente.
- **Q-006 Marca:** EMPIRES y Empirians son nombres de trabajo; revisión comercial antes del lanzamiento.
- **Q-003 Ambientación:** mundo **contemporáneo**. Carreras históricas desde los 80 = funcionalidad futura.
- **Q-004 Bancarrota:** existirá en el futuro con oportunidades de recuperación; el sandbox podrá desactivarla.
- **Q-010 Recursos:** modelos originales mediante código y definiciones voxel modulares; sin artistas ni recursos externos en esta fase.
- **Q-008 Dispositivos:** sin lista definitiva. Se hacen las comprobaciones posibles en el entorno y se documentan las pruebas móviles pendientes.
