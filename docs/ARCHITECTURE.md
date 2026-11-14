# EMPIRES — Arquitectura técnica

> Versión 0.1 · 2026-11-14 · **Ninguna tecnología está elegida definitivamente.**
> Todo lo marcado `[PROPUESTA]` requiere aprobación del propietario (ver `DECISIONS.md`).

---

## 1. Requisitos que guían la arquitectura

| # | Requisito | Origen |
|---|---|---|
| A1 | Simulación estrictamente separada del motor visual | Propietario `[CONFIRMADO]` |
| A2 | Pruebas sin renderizar la oficina | Propietario `[CONFIRMADO]` |
| A3 | Estado serializable y guardado versionado | Propietario `[CONFIRMADO]` |
| A4 | Simulación reproducible mediante semillas | Propietario (a considerar) |
| A5 | Simulación independiente de los FPS | Propietario `[CONFIRMADO]` |
| A6 | Sin IA generativa en tiempo real | Propietario `[CONFIRMADO]` |
| A7 | Una base de código para iOS, Android (y web/escritorio) | Propietario `[CONFIRMADO]` |
| A8 | Offline, sin cuentas ni servidores obligatorios | Propietario `[CONFIRMADO]` |
| A9 | Rendimiento móvil y mantenibilidad; evitar complejidad prematura | Propietario `[CONFIRMADO]` |
| A10 | Estética voxel isométrica con personajes personalizables y animados | Propietario `[CONFIRMADO]` |
| A11 | UI rica en texto, tarjetas y diálogos, accesible y localizable | Derivado del GDD §7 |

---

## 2. Comparativa de alternativas de motor visual

### 2.1 Opción A — Voxel 3D real (Three.js / Babylon.js), cámara libre

Escena 3D completa, con rotación y zoom de cámara, construcción en 3D y la UI también dentro del motor o superpuesta.

- **A favor:** personajes 3D modulares; cualquier ángulo; iluminación real; reutilización total de modelos; construcción libre natural.
- **En contra:** la cámara libre multiplica los problemas (oclusión de paredes, legibilidad, controles táctiles complejos, más geometría visible); más riesgo de rendimiento en Android de gama baja; mayor coste de diseño de niveles.

### 2.2 Opción B — 2.5D con sprites prerenderizados (Phaser)

Modelos voxel renderizados a sprites desde 2–4 ángulos; el juego es 2D isométrico.

- **A favor:** renderizado sencillo y muy eficiente; control total de la composición; Phaser es maduro y conocido.
- **En contra (decisivos para EMPIRES):**
  - **Explosión combinatoria**: cada pieza de personaje × cada animación × cada fotograma × cada dirección debe prerenderizarse por separado y componerse en capas. Con personalización profunda (pieles, peinados, ropa, accesorios, colores) el número de sprites o la complejidad de la composición por capas crece muy deprisa, y el recoloreado por paleta en 2D con iluminación es delicado.
  - Las animaciones deben producirse desde cada ángulo.
  - Cualquier cambio de ángulo o de iluminación obliga a re-renderizar todo.
  - Ordenación en profundidad (*depth sorting*) isométrica con muebles de varias celdas: problema clásico y fuente de errores.
  - Cerrar la puerta a rotación de cámara, zoom fluido y ciclo día/noche.

### 2.3 Opción C — Híbrida: escena voxel 3D con cámara isométrica fija + UI web superpuesta

Renderizado 3D real con **cámara ortográfica fija** (rotación en pasos de 90° posible en el futuro), y la interfaz como capa HTML/CSS encima del canvas.

- **A favor:**
  - Personalización modular real: las piezas se combinan en tiempo de ejecución y se recolorean por **canales de paleta** en el shader; una animación sirve para todos los Empirians.
  - Animación **rígida por segmentos** (sin *skinning*): barata en GPU y fácil de producir, perfecta para voxel.
  - Cámara fija = composición controlada como en 2.5D, escena pequeña, pocos *draw calls*, sin problemas de ordenación en profundidad (lo resuelve el z-buffer).
  - UI en HTML/CSS: texto, tarjetas, diálogos, accesibilidad, localización y diseño adaptable mucho más fáciles que dentro de un motor 3D.
  - Deja abiertas rotación por pasos, zoom, día/noche y construcción por cuadrícula.
- **En contra:**
  - WebGL dentro de WebView (Capacitor) en Android de gama baja: hay que medirlo (F1).
  - Hay que construir un pequeño *pipeline* de recursos voxel → glTF.
  - Sincronizar UI HTML y escena 3D (posiciones de burbujas, clics en objetos) requiere una capa de proyección.

### 2.4 Otras alternativas consideradas

| Alternativa | Valoración |
|---|---|
| **Godot 4** (motor nativo, exporta a iOS/Android/web/escritorio) | Alternativa seria: rendimiento nativo, editor de escenas, buen 3D ortográfico. Inconvenientes para nosotros: UI rica en texto menos ágil que HTML, pruebas de simulación menos cómodas que en TS, exportación web con limitaciones (C# no exporta a web; tamaño de descarga), y menor productividad con flujo de trabajo basado en Claude Code y revisión de código. **Plan B** si la validación de rendimiento de F1 falla. |
| **Unity** | Muy capaz en móvil, pero licencias y condiciones cambiantes, ecosistema cerrado y binarios grandes; desproporcionado para la escena pequeña de EMPIRES. No recomendado. |
| **Babylon.js** (en lugar de Three.js dentro de la opción C) | Más "baterías incluidas" (inspector, GUI, físicas). Mayor tamaño y API más opinada. Three.js encaja mejor con una escena pequeña controlada por código. Alternativa viable. |
| **PixiJS / Phaser + voxel prerenderizado** | Ver opción B. |
| **React Native / Flutter + motor 3D** | Complejidad extra de puente con el renderizado 3D sin ventaja clara. |

### 2.5 Recomendación `[PROPUESTA]` — D-005

**Opción C (híbrida)**, con:

- **TypeScript** en todo el proyecto.
- **Three.js** para la escena voxel con cámara ortográfica isométrica fija.
- **UI en HTML/CSS** superpuesta, con un framework ligero (candidato: **Preact** o **Svelte**; decisión D-008).
- **Vite** como herramienta de compilación; **Vitest** para pruebas.
- **Capacitor** para empaquetar en iOS y Android (y la misma build sirve como versión web; escritorio con Tauri/Electron en el futuro si se desea).

**Justificación resumida:** la personalización profunda de Empirians y oficinas es un pilar del juego, y solo una representación 3D modular la hace escalable sin explosión de recursos; la cámara fija elimina los grandes riesgos de la opción A; y el HTML resuelve la UI narrativa basada en tarjetas. TypeScript permite que la simulación (el corazón del juego) sea un módulo puro, rápido de probar y de iterar.

**Condición:** la elección se valida en **F1** con un prototipo que mida rendimiento en dispositivos reales (ver §9). Si no se alcanzan los objetivos tras optimizar, se reevalúa con Godot 4 como plan B. Como la simulación es TS puro y aislado, un cambio de motor visual no afectaría a la simulación (salvo si se pasa a Godot, donde habría que portarla o ejecutarla vía JS).

---

## 3. Arquitectura propuesta (vista general)

```
┌──────────────────────────────────────────────────────────────────────┐
│                         app/ (orquestación)                          │
│  Bucle principal · reloj real → ticks · ciclo de vida · guardado     │
└───────────────┬───────────────────────────┬──────────────────────────┘
                │ comandos                  │ snapshots + eventos (solo lectura)
                ▼                           ▼
┌───────────────────────────┐   ┌──────────────────────────────────────┐
│ sim/ (TS puro, sin DOM)   │   │ presentation                         │
│ estado · sistemas · RNG   │   │  ├─ render/ (Three.js, escena voxel) │
│ eventos · registro causal │   │  ├─ ui/ (HTML: tarjetas, diálogos)   │
│ save/migraciones          │   │  └─ audio/                           │
└───────────────────────────┘   └──────────────────────────────────────┘
                ▲                           │
                │                           ▼
┌───────────────────────────┐   ┌──────────────────────────────────────┐
│ content/ (datos JSON)     │   │ platform/ (adaptadores)              │
│ temas, tipos, eventos,    │   │ almacenamiento, ciclo de vida,       │
│ textos, balance           │   │ exportar/importar, háptica           │
└───────────────────────────┘   └──────────────────────────────────────┘
```

**Regla de dependencias** (se hará cumplir con una regla de lint en cuanto exista código):

- `sim/` solo puede importar de `sim/` y de tipos de `content/`. Nunca de `render/`, `ui/`, `platform/`, `app/`, del DOM ni de Three.js.
- `render/` y `ui/` leen el estado y escuchan eventos; **nunca mutan el estado**: envían **comandos** (`StartProject`, `ChooseDecisionOption`, `SetSpeed`…).
- `platform/` se accede mediante interfaces, para poder sustituirlo en pruebas (memoria) y en web (IndexedDB) / móvil (Capacitor).

---

## 4. Estructura de código propuesta `[PROPUESTA]`

```
/
├─ CLAUDE.md
├─ docs/                     # documentos maestros
│  └─ references/            # referencias visuales (NO recursos del juego)
├─ assets/source/            # fuentes de recursos (.vox, .bbmodel, .json de metadatos)
├─ public/assets/            # recursos compilados (.glb, atlas) — generados
├─ tools/
│  ├─ asset-pipeline/        # .vox/.bbmodel → .glb optimizado
│  └─ sim-runner/            # ejecutar miles de partidas sin render (balance)
├─ src/
│  ├─ sim/
│  │  ├─ core/               # reloj, tick, RNG, eventos, comandos, registro causal
│  │  ├─ systems/            # proyectos, trabajo, bugs, energía, mercado, lanzamiento…
│  │  ├─ model/              # tipos del estado
│  │  └─ save/               # serialización, versiones, migraciones
│  ├─ content/               # datos de juego (temas, eventos, textos) + validación
│  ├─ render/                # Three.js: escena, cámara, Empirians, muebles, burbujas
│  ├─ ui/                    # componentes de interfaz
│  ├─ audio/
│  ├─ platform/              # almacenamiento, ciclo de vida, exportación
│  └─ app/                   # arranque y bucle principal
└─ tests/                    # pruebas de integración / regresión con semillas
```

Un único paquete (sin monorepo) para evitar complejidad prematura; los límites se protegen con lint y revisión.

---

## 5. Motor de simulación

### 5.1 Paso de tiempo fijo

- **1 tick = 1 hora de juego** `[PROPUESTA]`. La simulación solo avanza en ticks enteros.
- El bucle principal acumula tiempo real × velocidad y ejecuta los ticks que correspondan (patrón *fixed timestep with accumulator*), con un máximo de ticks por fotograma para evitar la "espiral de la muerte". Si se supera, se ralentiza el tiempo de juego, **nunca** se cambia el resultado.
- Velocidades: 0 (pausa), 1x, 2x, 4x, 8x. A 1x ≈ 3 s reales por día laborable (8 ticks de trabajo + horas no laborables comprimidas). Ajustable.
- El render interpola entre el estado del tick anterior y el actual para movimientos suaves.
- Resultado: **el mismo estado inicial + la misma semilla + los mismos comandos en los mismos ticks = el mismo resultado**, en cualquier dispositivo y a cualquier FPS.

### 5.2 Estado

- Un único objeto `GameState` de **datos planos** (sin clases con métodos, sin referencias circulares, sin `Map`/`Set` en el estado persistido; IDs en lugar de punteros).
- Incluye: `schemaVersion`, `seed`, estado del RNG, reloj (`tick`), empresa, Empirians, proyectos, productos, mercado, registro causal, decisiones pendientes, preferencias de partida.
- Los sistemas son funciones `(state, ctx) => void` que se ejecutan en orden fijo en cada tick (o con su propia frecuencia: diaria, semanal, mensual).

### 5.3 Aleatoriedad

- PRNG con semilla, pequeño y rápido (p. ej. *sfc32* o *mulberry32*), con estado guardado en `GameState`.
- **Flujos separados** por dominio (mercado, eventos, bugs, generación de Empirians) para que añadir una tirada en un sistema no cambie los resultados de otro (estabilidad de pruebas y del balance).
- Prohibido `Math.random()` y `Date.now()` en `sim/` (regla de lint).

### 5.4 Eventos, comandos y registro causal

- **Comandos** (entrada): acciones del jugador validadas por la simulación (`StartProject`, `SetBudget`, `ChooseOption`, `SetSpeed`, `ReleaseProduct`…). Se aplican al principio de un tick. Pueden registrarse para *replays* y depuración.
- **Eventos de dominio** (salida): `BugCreated`, `BugFound`, `QualityMilestone`, `EnergyLow`, `DecisionRequested`, `ProductReleased`, `ReviewPublished`… Con severidad `info | important | decisive` (GDD §10). La representación los consume para burbujas, animaciones y avisos. Los `decisive` pueden pausar automáticamente.
- **Registro causal**: los hechos relevantes (decisiones, cambios de plan, crunch, recortes de pruebas, lanzamientos, problemas) se guardan como entradas `{id, tick, tipo, datos, causas: id[]}`. Los modificadores que un sistema aplica llevan la referencia de su causa. Para explicar un resultado ("¿por qué un 6/10?"), se recogen las causas con mayor contribución y se presentan como texto narrativo con plantillas.
- Para que no crezca sin límite: se compactan entradas antiguas en resúmenes por producto/año, conservando los hitos (que alimentarán el museo e historial).

### 5.5 Modelo inicial de un proyecto (borrador para F2) `[PROPUESTA]`

Valores ilustrativos; el balance se ajustará con `tools/sim-runner`.

- **Puntos de trabajo por hora** = `habilidad × eficiencia(energía) × motivación × bonusEquipo`.
- **Alcance** define los puntos necesarios: `pequeño ≈ 400`, `mediano ≈ 1200`.
- **Calidad (con rendimientos decrecientes)**: `calidad = techo × (1 − e^(−k · inversión/alcance))`, donde `techo` depende de la habilidad y del encaje tema/público; `k` controla la rapidez. Pasado cierto punto, más semanas apenas suben la calidad.
- **Bugs**: por cada bloque de puntos de código, probabilidad de bug = `base × (1 + fatiga) × (1 + presión) × (1 + complejidad)`. Proporción oculta inicial ≈ 70 %. Tests descubren bugs ocultos con probabilidad proporcional a la inversión en pruebas; corregir consume puntos.
- **Energía**: −x por hora trabajada (más en *crunch*), +y por descanso; por debajo de un umbral sube la tasa de bugs y baja la eficiencia.
- **Mercado**: `interés(t)` del tema decae lentamente; el *hype* del producto decae si se retrasa sin comunicarlo; existe una ventana de oportunidad.
- **Crítica** = combinación de calidad percibida, bugs que llegan al público (ocultos no corregidos), encaje y expectativa (un juego muy esperado se juzga con más dureza). Ruido controlado por semilla.
- **Ventas** = `mercado × atractivo(crítica, precio) × visibilidad(marketing, reputación) × momento`.

Propiedades verificables con pruebas (ver §8):
1. Más tiempo ⇒ calidad no decreciente pero con incrementos cada vez menores.
2. Más tiempo ⇒ más coste y menos *hype*: existe un óptimo interior, no "cuanto más, mejor".
3. Menos pruebas ⇒ más bugs ocultos en el lanzamiento ⇒ peores críticas (en promedio).
4. *Crunch* ⇒ más progreso a corto plazo y más bugs/fatiga.

### 5.6 Información conocida vs. real

Cada magnitud relevante tiene `valorReal` (oculto) y `estimación {min, max}` que la UI muestra. Las estimaciones se calculan en la simulación (no en la UI) para que también sean deterministas y comprobables.

---

## 6. Motor visual (Opción C)

### 6.1 Sincronización simulación → escena

- Cada Empirian en la simulación tiene una **actividad** (`idle`, `walking_to`, `coding`, `designing`, `testing`, `resting`, `celebrating`, `raising_hand`…) y un **destino** (punto de interacción de un mueble).
- La capa de render tiene una máquina de estados de animación por Empirian que sigue la actividad, con transiciones suaves y variaciones cosméticas (aleatoriedad visual **no** determinista, separada del RNG de la simulación: la representación puede variar sin afectar al resultado).
- Los **eventos de dominio** generan burbujas y partículas (tabla en `ART_DIRECTION.md` §5). La cantidad de burbujas se limita y prioriza visualmente; los datos no se pierden.
- Recorridos dentro de la habitación: búsqueda de caminos simple sobre la cuadrícula (A* en celdas). Es una cuestión **visual**: la simulación decide *qué* hace el Empirian, la representación decide *cómo* llega allí; el tiempo de desplazamiento no afecta a la productividad simulada (en el MVP).

### 6.2 Escena

- Cámara ortográfica isométrica/dimétrica (a validar), recorte de paredes delanteras.
- Mallas voxel optimizadas (*greedy meshing*) con colores por vértice + atributo de **canal de paleta**; un material compartido con una textura de paleta pequeña ⇒ casi todo se dibuja con muy pocos materiales.
- Personajes: un `Group` por Empirian con un nodo por hueso; las piezas se adjuntan a las ranuras. Los Empirians de una escena pequeña (≤ 10–20) se dibujan sin instanciación; con muchos se usará `InstancedMesh` por pieza.
- Caras: textura atlas con desplazamiento UV por expresión.
- Sombras: mapa de sombras pequeño solo para Empirians, o sombra circular falsa en calidad baja.
- **Niveles de calidad** (bajo/medio/alto) para resolución de render, sombras y post-procesado.

### 6.3 UI

- Capa HTML sobre el canvas. Componentes: barra superior (dinero, fecha, velocidad), tarjetas de proyecto, diálogos de decisión con retrato del Empirian, tarjetas de críticas, avisos.
- Burbujas: renderizadas en la escena 3D (sprites) para que se integren con la profundidad; las burbujas de **diálogo** con texto largo pueden ser HTML posicionado mediante proyección.
- Selección táctil: *raycasting* sobre la escena, áreas táctiles ampliadas para personajes pequeños.
- Textos en archivos de localización desde el primer día (español + inglés recomendados).

---

## 7. Recursos y animación

- Fuentes: `.vox` (MagicaVoxel) y/o `.bbmodel` (Blockbench) — ver `ART_DIRECTION.md` §8–9.
- `tools/asset-pipeline` (Node, TS): lee la fuente, genera malla optimizada, oclusión ambiental por vértice, canales de color, valida y exporta `.glb` + manifiesto.
- Animaciones: como son rígidas, se pueden definir como **datos** (keyframes de rotación/posición por hueso en JSON) o exportarse desde Blockbench a glTF. Recomendación: empezar con datos en código/JSON para F1 (iteración muy rápida, sin herramienta), y pasar a Blockbench cuando un artista las produzca.
- *Placeholders* propios: para la primera iteración técnica de F1 se pueden generar Empirian y muebles **por código** a partir de definiciones voxel en JSON (recursos 100 % originales), mientras se producen los modelos definitivos.

---

## 8. Pruebas

| Tipo | Herramienta propuesta | Qué cubre |
|---|---|---|
| Unitarias | Vitest | Sistemas de simulación, RNG, reloj, migraciones de guardado, validación de contenido |
| Propiedades | fast-check (opcional) | "Más tiempo ⇒ rendimientos decrecientes", "guardar → cargar ≡ identidad", invariantes (dinero, bugs ≥ 0…) |
| Regresión con semilla | Vitest + instantáneas | Partida con semilla fija y comandos guionizados ⇒ resultado esperado; detecta cambios de balance no intencionados |
| Independencia de FPS | Vitest | La misma partida simulada con distintos tamaños de paso de fotograma produce el mismo estado |
| Simulación masiva | `tools/sim-runner` | Miles de partidas sin render para balance y distribución de resultados |
| Render (humo) | Playwright (ya disponible en el entorno) | La escena carga, hay N objetos, capturas de pantalla para revisión visual |
| Rendimiento | Escena de referencia + medición en dispositivos | §9 |

---

## 9. Rendimiento

### 9.1 Dispositivos de referencia `[PROPUESTA]` (D-015)

| Nivel | iOS | Android |
|---|---|---|
| Mínimo soportado | iPhone 11 / iPhone SE (2.ª gen.) — A13 | Gama media-baja de 2021–2022 (p. ej. Samsung Galaxy A13/A14, Xiaomi Redmi Note 10) |
| Referencia | iPhone 13 | Google Pixel 6a / Samsung Galaxy A54 |
| Tableta | iPad 9.ª gen. | Tableta Android de gama media |

Disponibilidad real de dispositivos de prueba: `[PREGUNTA]` Q-008.

### 9.2 Métricas objetivo (escena de F1: 1 habitación, 1–3 Empirians)

| Métrica | Mínimo soportado | Referencia |
|---|---|---|
| FPS sostenidos (10 min) | ≥ 30 | 60 |
| Tiempo de fotograma p95 | ≤ 33 ms | ≤ 16,7 ms |
| *Draw calls* | ≤ 100 | ≤ 100 |
| Triángulos en escena | ≤ 150 k | ≤ 300 k |
| Memoria del proceso | ≤ 300 MB | ≤ 400 MB |
| Arranque hasta escena interactiva | ≤ 5 s | ≤ 3 s |
| Coste de 1 tick de simulación (F2) | ≤ 1 ms | ≤ 0,5 ms |
| Tamaño del paquete instalable | ≤ 100 MB | — |
| Batería/temperatura | Sin calentamiento notable en 20 min | — |

Además: tope de FPS configurable (30/60) y renderizado a petición cuando el juego está en pausa y nada se mueve, para ahorrar batería.

---

## 10. Guardado

- **Formato**: JSON del `GameState` con cabecera `{ schemaVersion, gameVersion, createdAt, savedAt, seed, checksum }`. `createdAt/savedAt` los pone `platform/`, no la simulación.
- **Migraciones**: funciones `migrate_N_to_N+1(save)` encadenadas; cada migración con prueba. Nunca se cambia el formato sin migración.
- **Almacenamiento**: interfaz `SaveStorage` con implementaciones: memoria (pruebas), IndexedDB (web), sistema de archivos de Capacitor (móvil). Varias ranuras + autoguardado rotativo (p. ej. 3 copias) para resistir corrupción.
- **Exportar/importar**: archivo `.empires` (JSON, opcionalmente comprimido) mediante compartir/descargar del sistema. Validación estricta al importar (esquema + versión + checksum).
- **Ciclo de vida** `[PROPUESTA]` (D-013): al pasar a segundo plano o cerrar ⇒ pausa + autoguardado. Al volver ⇒ el juego sigue pausado hasta que el jugador lo reanude.

---

## 11. Decisiones técnicas pendientes

Ver `DECISIONS.md`: D-005 (motor visual), D-006 (lenguaje), D-007 (empaquetado móvil), D-008 (framework de UI), D-009 (cámara), D-010 (escala de tiempo), D-011 (orientación), D-012 (guardado), D-013 (segundo plano), D-014 (herramientas de recursos), D-015 (dispositivos y métricas), D-016 (licencia del código).

## 12. Riesgos técnicos

| ID | Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|---|
| R-001 | WebGL en WebView rinde mal en Android de gama baja | Media | Alto | Validar en F1 con dispositivos reales; niveles de calidad; plan B Godot |
| R-002 | Simulación pierde determinismo (coma flotante, orden de iteración) | Media | Medio | Paso fijo, RNG propio, orden estable, pruebas de regresión; evitar funciones matemáticas dependientes de plataforma en decisiones críticas |
| R-003 | Fuga de lógica de juego a la capa visual | Media | Alto | Regla de lint de dependencias, revisión, pruebas headless |
| R-004 | Crecimiento sin límite del registro causal y del tamaño del guardado | Media | Medio | Compactación por periodos; métricas de tamaño de guardado en pruebas |
| R-005 | Migraciones de guardado rotas tras muchas versiones | Media | Alto | Partidas de ejemplo de cada versión guardadas como *fixtures* de prueba |
| R-006 | Pipeline de recursos voxel más costoso de lo previsto | Media | Medio | Empezar con modelos definidos en JSON y generados por código; pipeline después |
| R-007 | Limitaciones de las tiendas (WebView/"apps web empaquetadas") | Baja | Alto | El juego es offline y con contenido propio; revisar guías de App Store antes de F10 |
| R-008 | Rendimiento de la UI HTML con muchas actualizaciones por fotograma | Baja | Medio | La UI se actualiza por eventos/ticks, no por fotograma |
