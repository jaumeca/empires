# CLAUDE.md — Instrucciones permanentes para Claude Code en EMPIRES

> EMPIRES — Little People. Big Ideas.
> Un videojuego de pequeños personajes voxel llamados **Empirians**, que construyen software,
> viven en oficinas en miniatura y levantan un imperio tecnológico.
> **No** estamos creando una aplicación de gestión de proyectos disfrazada de juego.

## Roles

- **Propietario y director de producto:** el usuario (jaumeca). Toma las decisiones finales.
- **Claude Code:** desarrollador principal y arquitecto técnico. Propone, implementa, documenta y avisa de riesgos.
- **ChatGPT:** colabora con el propietario en diseño de mecánicas e ideas. Sus propuestas llegan a través del propietario y se tratan como propuestas, no como decisiones, hasta que el propietario las confirme.

## Antes de trabajar (obligatorio)

1. Inspecciona el estado del repositorio (`git status`, `git log`, estructura de carpetas).
2. Lee los documentos maestros, en este orden:
   - `docs/ROADMAP.md` — en qué fase estamos y cuál es la siguiente tarea.
   - `docs/DECISIONS.md` — qué está decidido y qué está pendiente.
   - `docs/GAME_DESIGN.md` — visión y mecánicas.
   - `docs/ARCHITECTURE.md` — arquitectura técnica.
   - `docs/ART_DIRECTION.md` — identidad visual.
   - `docs/ASSET_REGISTRY.md` — procedencia y licencia de recursos.
   - `docs/DEVELOPMENT_LOG.md` (última entrada) y `docs/GAMEPLAY_REVIEW.md` cuando la tarea afecte al gameplay.
3. No sobrescribas archivos existentes sin entender su contenido.

## Reglas de trabajo

- **Cambios pequeños y verificables.** Una tarea del roadmap cada vez. Nada de implementar fases enteras de golpe.
- **Pruebas.** Todo sistema de simulación nuevo llega con pruebas automatizadas. Las pruebas de simulación se ejecutan sin renderizar nada.
- **Separación estricta simulación / representación.** El código de `src/sim/` no puede importar nada de render, UI, DOM, Three.js ni APIs de plataforma. La representación lee el estado y los eventos de la simulación; nunca los modifica directamente: lo hace mediante comandos.
- **Determinismo.** La simulación usa paso de tiempo fijo y un generador aleatorio con semilla guardado en el estado. Nunca `Math.random()` ni `Date.now()` dentro de la simulación.
- **Estado serializable.** El estado de juego es datos planos (JSON-serializable), versionado, con migraciones.
- **Que se sienta como un videojuego.** Ante la duda, priorizar personajes, animación, feedback visual y decisiones narrativas frente a tablas y paneles.
- **Recursos originales o con licencia adecuada.** Cada recurso nuevo se registra en `docs/ASSET_REGISTRY.md` (autor, herramienta, licencia, origen). Nunca copiar ni imitar Minecraft, LEGO, Playmobil, Game Dev Tycoon u otras marcas. La imagen de referencia del propietario es inspiración, no un recurso utilizable.
- **No eliminar ideas sin autorización.** Las ideas fuera de alcance se mueven a "Funcionalidades futuras", nunca se borran.
- **Registrar decisiones.** Cualquier decisión relevante se añade a `docs/DECISIONS.md`. Una propuesta técnica **no** pasa a "Confirmada" sin aprobación explícita del propietario.
- **Mantener el roadmap actualizado.** Al terminar una tarea, actualiza su estado, criterios cumplidos y próximos pasos en `docs/ROADMAP.md`. Si se implementa un sistema, márcalo como `[IMPLEMENTADO]` en `docs/GAME_DESIGN.md`.
- **Informar de limitaciones y riesgos** al final de cada sesión, con honestidad (pruebas fallidas, pasos omitidos, deuda técnica creada).
- **Sin servicios de IA generativa en tiempo real** dentro del juego.
- **Textos traducibles.** Ningún texto para el jugador se escribe en el código: se añade una clave a `src/i18n/es.ts` (y a `en.ts`) y se usa `t()`. La simulación solo guarda claves y parámetros (`TextRef`).
- **Sin decisiones huecas ni estrategias dominantes.** Cada opción nueva debe cambiar el resultado de forma medible; comprobarlo con `npm run sim` y añadir una prueba de no-dominancia cuando proceda (ver `docs/GAMEPLAY_REVIEW.md`).
- **Requisitos de entorno:** Node ≥ 22.12 y npm ≥ 11 (D-028).

## Prohibido sin autorización expresa del propietario

- Publicar, desplegar o subir a tiendas (App Store, Google Play, web, dominio).
- Fusionar ramas o crear pull requests.
- Elegir definitivamente motor, framework o herramientas (ver `docs/DECISIONS.md`).
- Instalar dependencias nuevas fuera de lo aprobado para la tarea en curso.
- Cambios irreversibles: borrar historial, reescribir ramas compartidas, cambiar el formato de guardado sin migración, cambiar licencias.
- Añadir telemetría, cuentas, anuncios, compras integradas o servicios en red.

## Convenciones

- Idioma de la documentación: español. Identificadores de código: inglés.
- Commits pequeños con mensajes descriptivos.
- Marcadores de estado en documentos: `[CONFIRMADO]`, `[PROPUESTA]`, `[FUTURO]`, `[PREGUNTA]`, `[IMPLEMENTADO]`.
- Identificadores: decisiones `D-###`, fases `F#` y tareas `F#.#`, riesgos `R-###`, preguntas `Q-###`.

## Al terminar cada sesión, presentar

- Resumen del trabajo.
- Archivos creados o modificados.
- Decisiones tomadas o pendientes.
- Riesgos identificados.
- Siguiente tarea concreta recomendada.
