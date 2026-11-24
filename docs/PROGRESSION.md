# EMPIRES — Progresión: de pequeño a imperio (D-062)

> **Estado:** `[PROPUESTA]` aplicada en desarrollo, provisional hasta que el propietario juegue.
> **Problema (prueba del propietario en macOS):** demasiada información y posibilidades desde el principio.
> **Principio:** no se elimina ninguna mecánica; se reorganiza **cuándo** se presenta. El jugador debe pensar «¡anda, ahora puedo hacer esto!», no «¿qué hago con todos estos botones?».

## 1. Qué veía un jugador nuevo (0.15.0, medido con `tools/e2e/firstminutes.cjs`)

| Momento | Lo que aparecía |
|---|---|
| Oficina, nada más empezar | Día, dinero, 5 botones de velocidad, periódico, decorar, menú y **dos acciones**: «¡Crear mi primer juego!» y «Encargos de clientes» |
| Primer juego | 6 temas, 2 tamaños, 4 precios, enfoque, presupuesto, plazo, **7 funcionalidades (5 bloqueadas con su explicación)**, prototipo, estimación y etiqueta de tipo de proyecto: **164 palabras, 29 botones, 5 elementos bloqueados** |
| Tarjeta del proyecto | 7 indicadores (contenido, calidad, bugs, **código**, energía, **interés**, **gasto**), ritmo, **plan de pruebas**, fecha y **presupuesto** |
| Decorar | 10 categorías, incluidos **escritorios para empleados que no existen**, estaciones de 3600 € y «**Ampliar el estudio**» (25 000 €) desde el día 1 |

## 2. Etapas (orientativas, no niveles rígidos)

1. **Fundador** — tu personaje, tu oficina, tu primer juego: tema, enfoque y plazo; ritmo de trabajo; decoración sencilla.
2. **Pequeño equipo** — contratación, papeles, relaciones.
3. **Estudio consolidado** — juegos medianos, prototipos, deuda técnica, fama del estudio.
4. **Imperio** — ampliar la oficina, proyectos ambiciosos, clientes habituales (y, más adelante, productos persistentes).

## 3. Desbloqueos (por hitos reales, nunca por esperar días)

| Desbloqueo | Condición (frase para el jugador) | Qué aparece | Evidencia en partidas antiguas |
|---|---|---|---|
| **Primeros pasos** | Desde el principio | Crear juego (nombre, tema, enfoque, plazo), ritmo, publicar, decorar (paredes y suelo, plantas, lámparas, decoración, descanso), Ayuda, menú | — |
| **Mejor equipo** | Tu primer juego pasa a producción | Decorar: ordenadores, sillas y creatividad | Haber comprado algo de esas categorías |
| **Planificar** | Publicas tu primer juego | Precio, presupuesto y funcionalidades al crear un juego; plan de pruebas y presupuesto en la tarjeta del proyecto; interés y gasto; eventos del estudio | Proyectos con funcionalidades o ya publicados |
| **Periódico** | Publicas tu primer juego | Empires Daily (tendencias, críticas, rivales) | Proyectos publicados |
| **Encargos** | Las primeras ventas semanales de tu juego | Encargos de clientes | Algún encargo aceptado o entregado |
| **Equipo** | Dos lanzamientos, o un encargo entregado, o un lanzamiento con 15 000 € en caja | Botón Equipo, candidatos, escritorios | Alguien contratado |
| **Estudio** | Dos juegos publicados | Juegos medianos, prototipo, estado del código y su revisión, «Lo que se dice del estudio» | Proyecto mediano o con prototipo |
| **Ampliación** | El equipo llena la oficina, o cuatro juegos publicados | «Ampliar el estudio» | Oficina ya ampliada |
| **Tus juegos** (0.17.0, D-064) | Dos juegos publicados y uno con su campaña de lanzamiento completa (10 semanas) | Botón «Tus juegos»: parches y contenido nuevo | Ya hizo algún mantenimiento |

- **Nunca se vuelve a bloquear** lo ya desbloqueado (se guarda) ni lo que el jugador ya usó (evidencia).
- **Partidas antiguas:** al cargarlas, todo lo que ya cumple su condición o su evidencia queda desbloqueado **sin celebración** (migración v10 → v11).
- **Cada desbloqueo:** un aviso breve («¡Nuevo! …» con una frase), una pequeña celebración en la oficina (confeti y estrellas), un recuerdo en la Historia y un punto «nuevo» en el botón durante unos días.

## 4. Interfaz que crece con el estudio

- Lo no desbloqueado **no se muestra** (sin candados). Donde ayuda, **una sola línea** dice cuál es lo siguiente y cómo conseguirlo (p. ej., en el plan del juego: «Al publicar tu primer juego podrás fijar el precio y el presupuesto, y añadir funcionalidades»).
- Ayuda, menú, guardar, pausa y velocidades: siempre disponibles.
- **Primer juego más tranquilo:** sin eventos del estudio (feria, críticos, clientes…) hasta publicar; los momentos del propio proyecto (gran idea, cansancio, retraso, plan de pulido, fecha) sí, porque enseñan.

## 5. Equilibrio y casos imposibles (comprobados con pruebas)

- Nada necesario para terminar un juego está bloqueado: publicar, ritmo, fecha y descanso siempre disponibles.
- Contratar solo aparece cuando hay con qué pagar: un encargo entregado, dos lanzamientos o 15 000 € tras publicar.
- Un desbloqueo nunca interrumpe una decisión en curso: el aviso espera a que no haya ninguna.
- Ningún desbloqueo exige repetir tareas aburridas: todos llegan jugando normalmente (prueba de carrera).

## 6. Fuera de esta versión (FUTURO)

Productos persistentes (GT.6) y clientes importantes como desbloqueos de la etapa «Imperio»; temas que se descubren con el tiempo.
