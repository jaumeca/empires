# EMPIRES — Documento maestro de diseño (GDD)

> **EMPIRES — Little People. Big Ideas.**
> Versión del documento: 0.1 (Fase 0 — Fundación) · Fecha: 2026-11-14

## Leyenda de estados

| Marcador | Significado |
|---|---|
| `[CONFIRMADO]` | Decidido por el propietario. Ver `DECISIONS.md`. |
| `[PROPUESTA]` | Propuesta de diseño o técnica pendiente de aprobación. |
| `[FUTURO]` | Funcionalidad que se conserva para fases posteriores al MVP. No se descarta. |
| `[PREGUNTA]` | Pregunta abierta que hay que resolver. |
| `[IMPLEMENTADO]` | Sistema ya presente en el código (hoy: ninguno). |

**Sistemas implementados `[IMPLEMENTADO]` (2026-11-14, v0.1 en desarrollo):**
- Reloj continuo con pausa y velocidades 1x/2x/4x/8x, independiente de los FPS; pausa automática en acontecimientos decisivos (§10).
- Simulación determinista con semilla y guardado versionado; pausa y guardado al pasar a segundo plano (§10, §18).
- Oficina viva: habitación voxel, Empirian fundador personalizable, animaciones y burbujas ligadas a la simulación (§3, §4).
- Primer proyecto de videojuego: tema, tamaño, enfoque, presupuesto, plazo, precio; fases concepto/producción/pulido; ritmo de trabajo (tranquilo/normal/crunch) y peso de las pruebas; ajuste de fecha y presupuesto durante el desarrollo (§6, §9).
- Consecuencias: calidad con rendimientos decrecientes, bugs ocultos y conocidos, energía, interés del público que se desvanece con los retrasos; registro causal y "¿Por qué esta nota?" (§8).
- Momentos Decisivos: "gran idea" a mitad de producción y "fecha de lanzamiento" (§7).
- Lanzamiento con celebración, cuatro críticas, ventas semanales durante 10 semanas, reputación (§13).
- Caja coleccionable del producto en la estantería (§15, versión mínima).

- Momentos Decisivos contextuales (F3.1): agotamiento, retraso previsto y plan de pulido, además de la gran idea (ahora una apuesta) y la fecha de lanzamiento (§7, §16).
- Interfaz traducible (español; inglés en borrador) (§18).
- Historial compactado para partidas largas y guardado con copias de seguridad y recuperación (§8, §18).

Detalle técnico y pruebas: `ARCHITECTURE.md` §13 y `ROADMAP.md` (F1–F2). Revisión del gameplay: `GAMEPLAY_REVIEW.md`.

---

## 1. Visión general

`[CONFIRMADO]` EMPIRES es un videojuego **premium** de simulación, gestión empresarial, estrategia y desarrollo de software. El jugador empieza como desarrollador independiente en una pequeña habitación y puede llegar a construir un imperio tecnológico.

- Referencia principal de gameplay: el género "tycoon de desarrollo de software" (p. ej. Game Dev Tycoon). EMPIRES debe ser **original**, más profundo, dinámico, personalizable y con **consecuencias persistentes**. No se copian mecánicas distintivas, textos, nombres, interfaz ni recursos de ningún juego existente.
- El jugador podrá desarrollar: videojuegos, aplicaciones móviles, aplicaciones de escritorio, software empresarial, SaaS, redes sociales, inteligencia artificial, motores gráficos, herramientas de desarrollo, sistemas operativos, plataformas digitales, servicios en la nube y otros tipos de software.
- Combina gestión, estrategia, simulación, creatividad, progresión, personalización y narrativa emergente.

### 1.1 Principios fundamentales `[CONFIRMADO]`

1. **Es un VIDEOJUEGO, no una aplicación de gestión.** La complejidad vive en el motor; la experiencia es divertida, accesible y llena de vida.
2. **Consecuencias coherentes** a corto, medio y largo plazo para cada decisión significativa.
3. **Personalización** de prácticamente todos los aspectos de la empresa y los proyectos.
4. **No existe una única estrategia correcta** ni una única forma de tener éxito.
5. **Entretenido y educativo**: se aprenden conceptos reales de desarrollo de software, gestión de proyectos, economía y emprendimiento a través de las consecuencias. **No** es un curso ni un simulador profesional serio.

### 1.2 Pilares de diseño (síntesis) `[PROPUESTA]`

Para evaluar cualquier funcionalidad futura propongo estos cinco pilares. Si una funcionalidad no refuerza al menos uno, se cuestiona:

1. **Un mundo pequeño y vivo** — la oficina y los Empirians son la pantalla principal.
2. **Decisiones con causa y efecto** — el jugador entiende por qué pasa lo que pasa.
3. **Tu empresa, tu historia** — personalización y narrativa emergente; cada partida es distinta.
4. **Profundidad opcional** — fácil de empezar, profundo para quien quiere controlarlo todo.
5. **El imperio se ve** — los logros se convierten en objetos visibles (museo, trofeos, cajas).

---

## 2. Identidad visual: los Empirians

`[CONFIRMADO]` Los personajes se llaman **Empirians**. Estética **voxel isométrica**, como maquetas construidas con bloques. Nombre provisional del estilo: **Cozy Voxel Tech Tycoon**. Lema provisional: **EMPIRES — Little People. Big Ideas.**

Resumen (detalle completo en `ART_DIRECTION.md`):

- Cabezas cúbicas ligeramente grandes, cuerpos pequeños y compactos, extremidades geométricas sencillas.
- Peinados voxel de pequeños bloques; caras minimalistas pero expresivas.
- Diversidad de tonos de piel; gafas, barbas, accesorios y prendas personalizables.
- Ropa informal, profesional, creativa y tecnológica.
- Animaciones simpáticas; siluetas reconocibles a tamaño pequeño; aspecto de figuras coleccionables.
- **No** muñecos redondeados de vinilo como dirección principal.
- Oficinas como maquetas isométricas con paredes abiertas o parcialmente visibles: escritorios, ordenadores, plantas, estanterías, libros, pizarras, ventanas, sillas, lámparas, cafeteras, consolas, sofás, decoración, trofeos, salas de reuniones, laboratorios y servidores.
- Paleta cálida, pastel, madera, iluminación suave. Acogedor, tecnológico y colorido.

### 2.1 Originalidad y propiedad intelectual `[CONFIRMADO]`

- Todos los recursos serán originales o con licencias adecuadas, con procedencia documentada (`ASSET_REGISTRY.md`).
- **No** copiar personajes, proporciones distintivas, texturas, diseños, logotipos ni recursos de Minecraft, LEGO, Playmobil, Game Dev Tycoon u otras marcas.
- La imagen de referencia del propietario es inspiración artística, **no** un recurso autorizado para incorporar.

---

## 3. La oficina como corazón del videojuego

`[CONFIRMADO]` La pantalla principal es una **oficina viva**, no un dashboard. El jugador observa un pequeño mundo tecnológico.

### 3.1 Qué hacen los Empirians en pantalla

Programar, diseñar, investigar, caminar, reunirse, tomar café, descansar, probar productos, hablar con compañeros, frustrarse ante problemas, celebrar éxitos, recibir nuevos empleados y reaccionar a las decisiones del jugador.

`[IMPLEMENTADO]` (0.18.0, D-065) **Gestos con personalidad:** estirarse, bostezar, inspiración, concentración, rascarse la cabeza, frustración, puño arriba, saludo, asentir, hombros caídos y mirar, con ritmo propio de cada Empirian y pesos según rasgo, energía y ánimo; reacciones escalonadas a los compañeros; objeto personal en cada escritorio, vapor de la taza por la mañana y luz del ordenador. Respeta la regla de oro: todo sale del estado real (actividad, energía, rasgo, hora, acontecimientos).

### 3.2 Burbujas, partículas e iconos

Sobre sus cabezas: código, diseño, creatividad, investigación, ideas, bugs, pruebas, calidad, problemas, motivación, cansancio y progreso.

`[CONFIRMADO]` **Regla de oro:** toda representación visual se deriva del estado real de la simulación. No hay animaciones desconectadas del gameplay. (Implementación propuesta en `ARCHITECTURE.md` §6: la simulación emite *actividades* y *eventos*; la representación los traduce en animaciones y burbujas).

`[PROPUESTA]` Las burbujas son **información jugable de bajo coste**: un jugador atento puede detectar problemas antes que en cualquier panel (p. ej. muchas burbujas de bug en un Empirian cansado = señal de que conviene descansar o reforzar pruebas).

### 3.3 Evolución de las instalaciones

1. Pequeña habitación. 2. Garaje. 3. Estudio independiente. 4. Oficina profesional. 5. Edificio tecnológico. 6. Campus empresarial.

El jugador personaliza progresivamente: escritorios, ordenadores, muebles, plantas, decoración, salas de reuniones, zonas de descanso y laboratorios. Algunos objetos tienen efecto jugable, otros son decorativos.

Ejemplos de efectos: mejores ordenadores → productividad; sala de descanso → recuperación de energía; pizarra → sesiones creativas; mala distribución → peor comunicación; infraestructura insuficiente → limita ciertos proyectos.

`[PREGUNTA]` Q-001: **Oficinas prediseñadas personalizables vs. construcción libre por cuadrícula.**
`[PROPUESTA]` Enfoque intermedio por etapas: (a) MVP: habitación fija con *ranuras* (slots) predefinidas donde colocar objetos; (b) Fase 4: plantillas de oficina con colocación libre de muebles sobre cuadrícula dentro de habitaciones fijas; (c) futuro: construcción de paredes/salas en cuadrícula en edificio y campus. El modelo de datos usará **cuadrícula desde el principio** (cada objeto tiene huella en celdas) para no cerrar ninguna opción.

---

## 4. Personalización del fundador y los Empirians

Al empezar, el jugador crea su **Empirian fundador**, eligiendo progresivamente: nombre, apariencia, peinado, color de pelo, tono de piel, ropa, accesorios, personalidad, experiencia inicial, especialización e historia de origen.

Orígenes de ejemplo, cada uno con ventajas, limitaciones y oportunidades:

| Origen | Ventaja (propuesta) | Limitación (propuesta) |
|---|---|---|
| Programador autodidacta | Tecnología alta, aprende rápido | Diseño y negocio bajos, sin contactos |
| Diseñador creativo | Diseño/creatividad altos | Calidad técnica y bugs |
| Emprendedor | Dinero inicial, marketing, contactos | Habilidad técnica baja |
| Desarrollador sénior | Habilidades altas, menos bugs | Menos ahorros (deja un empleo), menos energía |
| Investigador | Descubrimientos y tecnologías | Lento en producción, poco comercial |
| Equipo de amigos | Varios Empirians desde el inicio | Gastos altos, relaciones y conflictos |

Los empleados también tienen apariencia única y personalidad reconocible. Objetivo: que el jugador reconozca visualmente a sus Empirians y se encariñe con ellos.

`[PROPUESTA]` MVP (primera versión jugable): nombre, tono de piel, peinado, color de pelo, color de ropa y un accesorio. Origen y personalidad llegan en fases posteriores.

---

## 5. Gameplay central

### 5.1 Tres niveles conectados `[CONFIRMADO]`

- **Táctico — los proyectos:** crear productos, definir funcionalidades, presupuestos, tecnologías, equipos y decisiones durante el desarrollo.
- **Estratégico — la empresa:** contratar, mejorar instalaciones, gestionar recursos, investigar, mantener productos, proyectos simultáneos.
- **Global — el imperio:** divisiones, adquisiciones, licencias, plataformas y ecosistemas, liderazgo de la industria.

### 5.2 Bucle principal `[CONFIRMADO]`

1. Descubrir oportunidades. 2. Crear un proyecto. 3. Personalizar el producto. 4. Presupuesto, alcance y cronograma. 5. Organizar el equipo. 6. Observar a los Empirians trabajando. 7. Tomar decisiones durante el desarrollo. 8. Resolver problemas y aprovechar oportunidades. 9. Probar y pulir. 10. Publicar. 11. Críticas, ventas y reacciones. 12. Mantener, actualizar o crear nuevos productos. 13. Reinvertir y ampliar la empresa.

Cada partida genera historias diferentes. El jugador siempre tiene objetivos atractivos: publicar un producto, contratar al primer empleado, comprar una oficina, desarrollar una tecnología, competir contra un rival.

`[PROPUESTA]` **Sistema de objetivos visibles**: siempre hay 1–3 objetivos sugeridos en pantalla (no obligatorios), generados a partir del estado de la partida ("Publica tu primer juego", "Ahorra para el garaje", "Supera a PixelForge en críticas").

`[IMPLEMENTADO]` (0.17.0, D-063) Versión discreta: **un solo** objetivo cercano en una línea del HUD, leído del estado real (`systems/goals.ts`), sin recompensas ni lista de misiones; nunca apunta a algo bloqueado y al tocarlo abre lo que corresponde. Los objetivos múltiples y los rivales concretos siguen como propuesta.

---

## 6. Personalización profunda de los proyectos

`[CONFIRMADO]` Pilar principal. El jugador puede modificar casi cualquier aspecto **antes y durante** el desarrollo. Se amplía progresivamente; no todo entra en la primera versión.

| Área | Elementos |
|---|---|
| Identidad | Nombre, marca, logotipo, descripción, tipo de software, género/categoría, temática, público objetivo, plataformas, idiomas |
| Alcance | Funcionalidades, contenido, tamaño, complejidad, características opcionales, compatibilidad, integraciones, prioridades |
| Presupuesto | Inicial, restante, límite de gasto, reserva para imprevistos, inversión en desarrollo/pruebas/investigación/marketing, servicios externos, contratación, infraestructura |
| Cronograma | Fecha objetivo, duración, hitos, fases, sprints, demo, beta, lanzamiento, actualizaciones |
| Equipo | Empleados asignados, roles, responsables, especialistas, dedicación, formación, contratistas, distribución del trabajo |
| Tecnología | Lenguajes, frameworks, motores, arquitectura, bibliotecas, dependencias, herramientas, tecnologías propias, servicios de terceros |
| Calidad | Estabilidad, rendimiento, seguridad, UX, diseño, accesibilidad, mantenibilidad, calidad del código, compatibilidad, pruebas |
| Riesgos | Riesgo aceptado, técnicos, financieros, comerciales, de planificación, dependencias externas, reservas, mitigación |
| Metodología | Agile, Scrum, Kanban, Cascada, sistemas personalizados, niveles de planificación y documentación |
| Comercialización | Precio, modelo de negocio, marketing, distribución, acceso anticipado, betas, demos, suscripciones, licencias |
| Mantenimiento | Actualizaciones, correcciones, soporte, infraestructura, nuevas funcionalidades, expansiones, fin del soporte |

`[PROPUESTA]` **Desbloqueo progresivo de la complejidad**: cada área aparece en la interfaz cuando el jugador la necesita o la desbloquea (p. ej. "Metodología" aparece al tener 3+ empleados; "Riesgos" detallados al tener proyectos medianos). Así se reconcilia "personalizar todo" con "accesible".

`[PREGUNTA]` Q-002: ¿Tecnologías, plataformas y empresas del mundo del juego son **reales** (Unity, iOS, Python) o **ficticias** inspiradas en ellas? `[PROPUESTA]` Ficticias con parodia amable, por riesgo de marcas registradas y para controlar el equilibrio; el valor educativo se conserva usando conceptos reales (motor, framework, nube, base de datos).

---

## 7. Presentación de decisiones al jugador

`[CONFIRMADO]` No presentar veinte paneles a la vez. Usar: ventanas visuales, tarjetas ilustradas, conversaciones con Empirians, burbujas de diálogo, pequeñas reuniones, controles sencillos, iconos, animaciones, avisos contextuales y decisiones narrativas.

Ejemplo: un Empirian levanta la mano: «¡Jefe! Si dedicamos dos semanas más al sistema de combate, podríamos mejorar muchísimo el juego». Opciones: aprobar la ampliación; mantener el plan; aumentar el presupuesto; reducir otras funcionalidades; pedir una solución más sencilla; posponer para una actualización.

- Las opciones se adaptan al estado real del proyecto (solo aparecen las viables; las demás pueden mostrarse bloqueadas con motivo).
- El jugador puede abrir voluntariamente el proyecto y modificar presupuesto, cronograma, calidad, alcance, equipo y riesgos. **No se depende solo de eventos aleatorios.**
- Opciones avanzadas para quien quiera gestionar cada detalle, nunca obligatorias.

`[PROPUESTA]` Cada opción de una decisión muestra **estimaciones** (no certezas) con iconos de tendencia y un nivel de confianza que depende de la experiencia del equipo: "Calidad ↑ (probable)", "Coste ↑↑ (seguro)", "Riesgo de retraso ↑ (incierto)".

---

## 8. Sistema de consecuencias

`[CONFIRMADO]` Pilar fundamental. Las decisiones no son simples modificadores arbitrarios de estadísticas.

Ejemplos que el motor debe poder producir:

- Más presupuesto no garantiza más calidad.
- Más tiempo no garantiza un producto mejor.
- Más personas = más capacidad, pero más costes y coordinación.
- Reducir funcionalidades puede mejorar el enfoque.
- Trabajar demasiado → agotamiento y errores.
- Invertir en arquitectura facilita proyectos futuros.
- Retrasar un lanzamiento mejora la calidad pero puede perder una oportunidad comercial.
- Reducir pruebas acelera y provoca problemas posteriores.
- Cambiar de tecnología a mitad → retrabajo.
- Formar a un empleado → menos productividad hoy, más mañana.
- Eliminar una funcionalidad puede decepcionar a usuarios que la esperaban.
- Reutilizar código ahorra tiempo pero propaga problemas existentes.

**Tipos de consecuencias:** inmediatas, diferidas, indirectas y emergentes.

**Historial causal** `[CONFIRMADO]`: el motor conserva un historial de decisiones y acontecimientos relevantes. Ante un problema, el jugador puede comprender sus causas.

> Ejemplo: una aplicación pierde usuarios porque su última actualización introdujo problemas de rendimiento. El módulo afectado acumulaba deuda técnica desde hacía meses y el equipo redujo las pruebas para cumplir una fecha de lanzamiento.

El jugador aprende mediante consecuencias, no castigos arbitrarios.

`[PROPUESTA]` Implementación: **registro causal** (*causal ledger*). Cada decisión y evento recibe un identificador; cada efecto relevante guarda referencias a sus causas. La interfaz ofrece "¿Por qué ha pasado esto?" en noticias, críticas y crisis, mostrando la cadena como una pequeña historia ilustrada (no un árbol técnico). Detalle en `ARCHITECTURE.md` §5.4.

### 8.1 Rendimientos decrecientes `[CONFIRMADO]`

Más dinero, empleados y tiempo no siempre producen mejores resultados. Un producto puede llegar a un punto en el que invertir más apenas mejora su calidad. Cambian el mercado, los competidores y las tecnologías.

### 8.2 Información e incertidumbre `[CONFIRMADO]`

La simulación distingue entre: **objetivos**, **estimaciones**, **resultados reales**, **información conocida por el jugador** y **riesgos/incertidumbre**. El jugador no conoce necesariamente los resultados futuros con exactitud.

`[PROPUESTA]` Cada magnitud importante tiene un **valor real oculto** y un **valor percibido** con margen de error. El margen se reduce con experiencia, pruebas, prototipos, betas e investigación de mercado. Ej.: "bugs conocidos: 12 · estimación de bugs ocultos: 5–20".

---

## 9. Motor de desarrollo de software

### 9.1 Fases del proyecto `[CONFIRMADO]` (inicialmente tres)

1. **Concepto y prototipo:** investigación, ideas, diseño inicial, selección tecnológica, prototipos, validación del concepto.
2. **Producción:** desarrollo, diseño, integración, funcionalidades, gestión de problemas, cambios de alcance.
3. **Pulido y lanzamiento:** pruebas, corrección de errores, optimización, mejoras de UX, marketing, preparación comercial, publicación.

### 9.2 Estructura interna

Cada proyecto se compone de **módulos, funcionalidades, dependencias y tareas**. El jugador no gestiona manualmente cada tarea pequeña.

`[FUTURO]` **Mapa visual de desarrollo**: módulos conectados entre sí para explorar dependencias, bloqueos, prioridades y rutas alternativas hacia el lanzamiento.

### 9.3 Magnitudes que el motor contemplará progresivamente

Progreso, complejidad, calidad técnica, calidad de diseño, rendimiento, seguridad, errores conocidos y ocultos, deuda técnica, mantenibilidad, dependencias, reutilización de tecnologías, habilidades, productividad, motivación, riesgos, costes y coordinación.

- Un módulo terminado no significa que esté bien construido.
- El código y las tecnologías reutilizables pueden convertirse en **patrimonio de la empresa**.

### 9.4 Modelo propuesto para el primer prototipo `[PROPUESTA]`

Modelo mínimo pero ya con las propiedades que exige §8 (detalle de fórmulas en `ARCHITECTURE.md` §5.5):

- **Trabajo**: cada día, el Empirian genera *puntos de trabajo* según habilidad, energía y motivación, repartidos entre diseño, código y pruebas según la fase y el foco elegido.
- **Calidad con rendimientos decrecientes**: la calidad se acerca asintóticamente a un techo que depende de la habilidad y el alcance. Las primeras semanas mejoran mucho; las últimas, poco.
- **Bugs**: se generan al programar (más con cansancio, prisa o alcance excesivo). Parte son **ocultos**; las pruebas los descubren y la corrección los elimina.
- **Energía**: trabajar baja la energía; el *crunch* la baja más deprisa y aumenta los errores.
- **Mercado**: la expectativa (hype) y la ventana de oportunidad decaen con el tiempo; retrasar el lanzamiento cuesta dinero y oportunidad.
- **Resultado**: críticas = f(calidad percibida, bugs que llegan al público, encaje tema/público, expectativas). Ventas = f(críticas, precio, tamaño del mercado, momento, marketing, reputación).

Con este modelo, "más tiempo" mejora la calidad pero con retorno decreciente, y cuesta dinero y oportunidad: **dedicar más tiempo no garantiza mejores resultados**.

---

## 10. Sistema de tiempo

`[CONFIRMADO]` Tiempo continuo con pausa. Velocidades: **Pausa, 1x, 2x, 4x, 8x**. El mundo evoluciona mientras el tiempo está activo.

Clasificación de acontecimientos:

- **Informativos**: no detienen el juego.
- **Importantes**: generan avisos.
- **Decisivos**: pueden pausar automáticamente la simulación.

El jugador podrá ajustar sus preferencias de notificación y delegar decisiones.

`[CONFIRMADO]` La simulación es **independiente de la velocidad de renderizado**: una caída de FPS no cambia los resultados.

`[PROPUESTA]` Al cerrar la aplicación o pasar a segundo plano, la simulación **se pausa** y se guarda automáticamente. No hay progreso ni pérdidas en tiempo real fuera del juego. (Pendiente de confirmación: D-013).

`[PROPUESTA]` Escala temporal inicial (ajustable tras pruebas): 1 tick de simulación = 1 hora de juego; a 1x, 1 día laborable ≈ 3 segundos reales (≈ 1 semana en 15 s, un juego pequeño en 2–4 minutos reales a 1x). Calendario: días, semanas, meses y años de juego.

---

## 11. Empleados y personalidades

Los Empirians no son simples estadísticas. Cada empleado tendrá progresivamente: nombre, apariencia, edad, habilidades técnicas y creativas, experiencia, especializaciones, personalidad, motivación, energía, ambición, relaciones profesionales, preferencias e historial laboral.

Personalidades de ejemplo: creativo, perfeccionista, veterano, ambicioso, bromista, investigador, organizado, impulsivo, mentor.

Pueden: aprender, especializarse, ascender, formar a compañeros, desarrollar relaciones, cambiar de empresa, convertirse en directores, crear nuevas tecnologías y **fundar empresas rivales**.

La empresa desarrolla una **cultura propia** según las decisiones del jugador. Motivación, ambiente, salarios, carga de trabajo y relaciones influyen en productividad y permanencia.

`[PROPUESTA]` Los rasgos de personalidad tienen expresión **visual** (forma de moverse, burbujas, frases, objetos personales en su escritorio) además de efecto jugable.

---

## 12. Mercado y competidores

Los productos no desaparecen tras el lanzamiento. Generan: ventas, suscripciones, usuarios, críticas, reputación, gastos de mantenimiento, necesidades de soporte, actualizaciones y oportunidades comerciales.

`[IMPLEMENTADO]` (0.19.0, D-067) **Juegos con identidad y recuerdos físicos:** caja y portada propias de cada juego (temática, nota, tamaño, actualizaciones), expuestas solas en estanterías y vitrinas en orden de lanzamiento; portada enmarcada del primer juego, cartucho de oro (diez juegos) y tablón de fans (primera actualización); versión, ventas y aniversarios en «Tus juegos».

`[IMPLEMENTADO]` (0.19.0, D-068) **Ideas del equipo:** surgen de lanzamientos, charlas entre amigos, curiosidad y comunidad; opcionales al planear (+techo, +trabajo; no dominante).

`[IMPLEMENTADO]` (0.17.0, D-064, `docs/PRODUCTS.md`) **Productos persistentes para videojuegos:** catálogo «Tus juegos», parches (arreglan bugs sin cambiar la nota), actualizaciones de contenido (pequeño relanzamiento con rendimientos decrecientes, máx. 2) y vida posterior contada con notas tranquilas (crítica tardía, comunidad, pocos pero fieles, despedida, abandonado). Suscripciones, usuarios, expansiones y secuelas siguen como `[FUTURO]`.

| Tipo | Factores propios |
|---|---|
| Videojuegos | Diversión, diseño, arte, rendimiento, comunidad, críticas, expansiones, secuelas |
| Aplicaciones | Utilidad, UX, compatibilidad, descubrimiento, retención |
| SaaS | Clientes, ingresos recurrentes, seguridad, soporte, escalabilidad, cancelaciones |
| Inteligencia artificial | Investigación, datos, precisión, costes computacionales, utilidad |
| Plataformas y redes sociales | Usuarios, comunidades, efectos de red, infraestructura, moderación |
| Herramientas y motores | Rendimiento, compatibilidad, documentación, licencias, ecosistema de desarrolladores |

Empresas rivales que evolucionan, lanzan productos, contratan talento, investigan y compiten. `[PROPUESTA]` Simulación **agregada** de competidores (estadísticas por empresa y segmento, no simulación individual de empleados rivales), con "personajes" visibles solo para rivales destacados.

Queremos un mundo que parezca vivo y cambie durante la partida.

`[PREGUNTA]` Q-003: ¿Línea temporal **histórica** (p. ej. empezar en los 80 y vivir la evolución de la industria) o **contemporánea/ficticia**? Afecta a contenido, tecnologías y la mecánica "evolución histórica de la industria".

---

## 13. Lanzamientos y recompensas

El lanzamiento es uno de los momentos más emocionantes. Los Empirians se reúnen y celebran. El jugador recibe: primeras críticas, ventas, usuarios, reacciones, noticias, resultados económicos, opiniones de clientes y propuestas de actualización.

El éxito no depende solo de una puntuación global de calidad: influyen mercado, precio, competencia, público objetivo, marketing y reputación.

`[IMPLEMENTADO]` (0.17.0, D-063) **Lanzamientos memorables:** banner «¡A la venta!», titular según el nivel del lanzamiento (fracaso, correcto, sorpresa, éxito; `systems/launch.ts`), nota que sube contando y, en un fracaso, la lección principal y «Aprender y seguir». Una decisión que llega al lanzar va primero; los resultados esperan.

Tras el lanzamiento: mantener, actualizar, expansiones, secuela, cambiar modelo de negocio, vender o licenciar, abandonar el mantenimiento.

`[PROPUESTA]` Secuencia de lanzamiento del MVP: botón grande "¡Publicar!" → los Empirians se reúnen alrededor del ordenador → cuenta atrás → primeras críticas aparecen una a una como tarjetas → contador de ventas → celebración (o decepción) acorde al resultado → objeto conmemorativo (caja del producto) aparece en la estantería.

---

## 14. Investigación y tecnologías reutilizables

Descubrir tecnologías, herramientas y capacidades. La investigación **no es solo un árbol de desbloqueos**: también surgen descubrimientos durante proyectos reales.

> Ejemplo: desarrollar un juego de estrategia permite crear un motor de simulación propio, reutilizable en otros juegos, licenciable a rivales o vendible como producto independiente.

Las tecnologías tienen: nivel de madurez, calidad, costes de mantenimiento, compatibilidad, potencial de reutilización y riesgo de obsolescencia. Cada empresa desarrolla una trayectoria tecnológica diferente.

---

## 15. El imperio como colección de recuerdos

`[CONFIRMADO]` (se conserva en el roadmap aunque no se implemente al principio).

Los logros se convierten en objetos visuales en la oficina: cajas coleccionables de cada juego publicado; iconos o piezas de exposición para aplicaciones; trofeos por premios; objetos conmemorativos de tecnologías importantes; fotografías del equipo en aniversarios; museo de la empresa con productos históricos.

Tras veinte años de partida, la oficina cuenta visualmente la historia del imperio.

`[PROPUESTA]` Incluir una versión mínima en la primera versión jugable: la caja del primer producto aparece en una estantería. Coste bajo, gran valor emocional, y valida la idea pronto.

---

## 16. Mecánicas especiales para el futuro `[FUTURO]`

No se descartan por quedar fuera del MVP:

- Momentos Decisivos contextualizados (surgen de situaciones reales de la simulación siempre que sea posible).
- Crisis jugables con decisiones encadenadas (pueden convertirse en pequeñas secuencias especiales de gameplay). Ej.: una app se vuelve viral, los servidores colapsan y hay que gestionar infraestructura, equipo, costes y comunicación con los usuarios.
- Contratos de clientes.
- Cambios de requisitos.
- Prototipos experimentales.
- Proyectos secretos.
- Productos que puedan probarse mediante pequeñas simulaciones.
- Rivalidades personales.
- Antiguos empleados que fundan empresas.
- Premios y ceremonias.
- Presentaciones de productos.
- Eventos tecnológicos.
- Museo de la empresa.
- Historial de productos.
- Colecciones de objetos.
- Genealogía de tecnologías.
- Evolución histórica de la industria.
- Adquisiciones.
- Fusiones.
- Divisiones empresariales.
- Plataformas y ecosistemas.
- Delegación a directores.
- Investigación avanzada.
- Expansión internacional.
- Diferentes caminos de éxito.
- Mapa visual de desarrollo con módulos y dependencias (§9.2).

---

## 17. Modos de juego

- **Carrera libre** `[FUTURO]` (modo principal): construir una empresa desde cero durante décadas sin final obligatorio. *La primera versión jugable es un fragmento de este modo.*
- **Escenarios** `[FUTURO]`: empresas y problemas predefinidos.
- **Desafíos** `[FUTURO]`: objetivos concretos (sobrevivir con poco presupuesto, producto rentable sin financiación externa…).
- **Sandbox** `[FUTURO]`: condiciones iniciales, dificultad, recursos y mercado personalizables.

`[CONFIRMADO]` Crecer hasta miles de empleados no es la única forma de éxito. Un pequeño estudio especializado puede tener una carrera satisfactoria.

`[PREGUNTA]` Q-004: ¿Existe la **bancarrota** (fin de partida) o se ofrece siempre una salida (préstamo, trabajo freelance, inversor)? `[PROPUESTA]` En carrera libre, la bancarrota existe pero con avisos tempranos y salidas narrativas (contrato de emergencia, préstamo, volver a trabajar para otros); en desafíos puede ser fin de partida.

---

## 18. Plataformas y modelo comercial

`[CONFIRMADO]` Objetivo: **Apple App Store y Google Play como videojuego premium**.

Preferencias iniciales `[CONFIRMADO]`:

- Una única base de código multiplataforma.
- Funcionamiento offline. Partidas guardadas localmente. Exportación e importación de partidas.
- Sin cuentas obligatorias. Sin servidores obligatorios. Sin anuncios. Sin compras integradas en la propuesta inicial.
- Interfaz adaptada a móviles. Posibilidad de versión web y escritorio.

`[PROPUESTA]` Orientación **horizontal** (candidata; validar en Fase 1 con prototipo en móvil real — D-011).

`[CONFIRMADO]` (D-043, 5.ª sesión) **Tres destinos con una sola base de código, una sola simulación y un solo guardado:**
- **Web, pensada primero para ordenador** (pantalla grande, ratón, teclado, sesiones largas) y también jugable en móvil y tableta con controles táctiles. `[IMPLEMENTADO]` v0.4.0: atajos de teclado, colocación con ratón, diálogos laterales que dejan ver la oficina, formularios en dos columnas; despliegue estático en Hostinger desde la rama `production-web` (D-044, `docs/DEPLOY_WEB.md`).
- **iOS y Android** nativas, más adelante, con Capacitor y las adaptaciones de cada plataforma.
- En ordenador la interfaz no debe parecer un móvil estirado; en móvil, la escena se prioriza en horizontal, con zonas seguras y botones grandes.

`[PREGUNTA]` Q-005: El dominio indicado es **expires.top**. ¿Es correcto o se refiere a **empires.top**? Uso pendiente (web del juego, versión web, presskit).

`[PREGUNTA]` Q-006: "EMPIRES" es un nombre muy genérico y existen títulos con "Empires" en las tiendas. Recomiendo una búsqueda de marcas y de disponibilidad en tiendas antes de invertir en logotipo/marketing (posible nombre comercial ampliado, p. ej. "EMPIRES: Little People, Big Ideas").

`[PREGUNTA]` Q-007: Idiomas de lanzamiento (¿español e inglés?). Precio objetivo. Clasificación por edades.

---

## 19. Arquitectura técnica

Ver `ARCHITECTURE.md`. La elección del motor visual está **pendiente de aprobación** (D-005).

Requisitos comunes `[CONFIRMADO]`: separación estricta simulación/visual; pruebas sin renderizar; estado serializable; guardado versionado; simulación reproducible con semillas (propuesta aceptada como requisito a considerar); sin IA generativa en tiempo real; mantenibilidad y rendimiento móvil; evitar complejidad prematura.

---

## 20. Producción de recursos voxel

Ver `ART_DIRECTION.md` §8–10. Sistema modular de personajes (cabezas, caras, peinados, cuerpos, camisetas, pantalones, calzado, gafas, barbas, accesorios) y catálogo modular de muebles.

---

## 21. Primera versión jugable (v0.1 "Primer Lanzamiento")

`[IMPLEMENTADO]` los 13 puntos son jugables (pendiente: prueba de juego del propietario y validación en móviles). `[CONFIRMADO]` (alcance definido por el propietario). El jugador puede:

1. Ver una habitación voxel.
2. Ver a su Empirian fundador.
3. Personalizar mínimamente su apariencia.
4. Observar animaciones básicas.
5. Pausar y acelerar el tiempo.
6. Crear un pequeño proyecto.
7. Elegir presupuesto y plazo.
8. Observar cómo trabaja el Empirian.
9. Ver burbujas de progreso, código y errores.
10. Tomar al menos una decisión con consecuencias reales.
11. Terminar y publicar el producto.
12. Recibir críticas o resultados comerciales básicos.
13. Guardar y recuperar la partida.

Debe sentirse como un pequeño videojuego, no como un dashboard. Objetivo: demostrar que observar a un Empirian construir software, decidir y publicar resulta divertido.

Especificación detallada y criterios de aceptación: `ROADMAP.md` (fases F1 y F2).

### 21.1 Guion de experiencia propuesto para v0.1 `[PROPUESTA]`

1. **Inicio**: pantalla de título con el Empirian saludando en su habitación.
2. **Creación del fundador** (≤ 60 s): nombre + 5 elecciones visuales con vista previa girando.
3. **La habitación**: el fundador pasea, se sienta, mira el ordenador. Un globo sugiere: "¿Y si hacemos nuestro primer juego?".
4. **Nuevo proyecto** (tarjetas ilustradas): nombre, tema (5–6 temas), tamaño (pequeño / mediano), presupuesto (ahorros disponibles), plazo (4–12 semanas) y foco (diseño ↔ técnica).
5. **Desarrollo**: el Empirian trabaja; burbujas de código, diseño, ideas y bugs. Barra de progreso compacta y fecha. Controles de tiempo.
6. **Momento decisivo** (pausa automática): p. ej. «¡Jefe! Se me ha ocurrido una mecánica genial, pero necesito dos semanas más». Opciones: aprobar (+calidad potencial, +tiempo, +coste), mantener plan, hacer versión sencilla (+bugs leves), posponer a una actualización (registra "promesa").
7. **Fase de pulido**: el jugador elige cuánto tiempo dedicar a pruebas (o publicar ya). Se ve cómo bajan los bugs conocidos.
8. **Lanzamiento**: celebración, críticas en tarjetas, ventas, dinero.
9. **Explicación**: "¿Por qué esta nota?" muestra 2–3 causas reales.
10. **Recuerdo**: la caja del juego aparece en la estantería. Guardado automático.
11. **Siguiente**: invitación a crear otro proyecto (el bucle se repite con el dinero ganado).

---

## 23. "A Living Studio": el estudio como mundo vivo `[CONFIRMADO]` (D-036)

El jugador deja de encadenar juegos: gestiona un estudio que evoluciona. Toda mecánica tiene representación en la oficina. Nada de paneles permanentes.

### 23.1 El fundador aprende `[IMPLEMENTADO]` (D-035, D-037)
- Habilidades: **programación, diseño, creatividad, gestión** y **especialización por tema**.
- Se aprende **haciendo**: programar sube programación, diseñar sube diseño, idear y pulir sube creatividad, planificar y cerrar proyectos o contratos sube gestión, trabajar en un tema da especialización en ese tema.
- Rendimientos decrecientes y techo: cada punto cuesta más que el anterior; no hay crecimiento infinito.
- Se percibe: burbuja de estrella y aviso al subir de nivel; ficha del Empirian con niveles.
- Ampliable a empleados, personalidades y equipos (F4).

### 23.2 Catálogo y personalización de la oficina `[IMPLEMENTADO]` (D-038)
- Catálogo de objetos como **datos**: id, nombre traducible, precio, tamaño en cuadrícula, categoría, requisitos, efectos, coste recurrente, modelo voxel.
- Categorías: ordenadores, escritorios, sillas, plantas, lámparas, cafeteras, pizarras, estanterías, decoración, sofás, tecnología, servidores (más adelante).
- **Comprar, colocar, mover, girar y vender** sobre cuadrícula, respetando colisiones y el acceso del Empirian. Táctil.
- Efectos con **contrapartidas y rendimientos decrecientes** (no apilar lo mismo; lo caro no siempre compensa): la silla ergonómica reduce la fatiga; la cafetera recupera energía pero cuesta dinero cada día; un ordenador potente acelera el trabajo técnico, no el diseño; la pizarra ayuda a diseñar; el sofá permite descansar; las plantas y la decoración mejoran el ambiente.
- Efectos explicados con palabras e iconos, no con estadísticas.
- `[FUTURO]` Garaje, estudio, oficina, edificio y campus (§3.3); servidores; objetos de pared; museo.

### 23.3 Empires Daily: noticias y tendencias `[IMPLEMENTADO]` (D-039)
- El mundo evoluciona solo, con el reloj y la semilla: **tendencias** de temas (empiezan, alcanzan un pico y desaparecen), **competidores ficticios** que publican juegos, **economía** con cambios moderados, **noticias tecnológicas** con efectos temporales, **resurgimientos** de temas antiguos.
- **Cada noticia corresponde a un cambio real** del estado simulado; no hay titulares decorativos.
- Anticiparse a una tendencia puede compensar; llegar tarde enfrenta a más competencia. Perseguir siempre la tendencia no debe ser lo óptimo.
- Se consulta desde el corcho de la oficina (y un pequeño botón); solo los acontecimientos importantes generan aviso.

### 23.4 Eventos dinámicos `[IMPLEMENTADO]` (1.er conjunto de 4 eventos, D-040)
- Disparados por el estado: proyecto, energía, calidad, economía, tendencias, reputación, productos anteriores, oportunidades externas.
- Cada evento: condiciones, frecuencia, opciones con consecuencias distintas y, cuando procede, **efectos diferidos** (programados y registrados en el registro causal). Base preparada para eventos encadenados.
- Ejemplos: creador de contenido que quiere una versión anticipada; competidor que anuncia un juego similar; cliente que descubre un error grave en un juego publicado; oferta de contrato; nueva tecnología; resurgimiento de un juego antiguo.

### 23.5 Actividades además de crear juegos
- `[IMPLEMENTADO]` (D-041) **Contratos externos** (primera actividad alternativa): ingresos previsibles a cambio de tiempo, esfuerzo y compromisos; penalizaciones por retraso; dan experiencia.
- `[FUTURO]` Investigación tecnológica (F6), mantenimiento y actualizaciones, expansiones y secuelas, portabilidad a plataformas, descanso y formación, ferias, gestión de productos antiguos (venta, licencia).

### 23.6 Productos con vida propia
- `[IMPLEMENTADO]` (1.ª parte) Ventas residuales tras el lanzamiento y resurgimientos vinculados a las noticias.
- `[FUTURO]` Comunidad/usuarios, mantenimiento, actualizaciones, expansiones, secuelas, valor comercial, venta o licencia; tocar la caja de la estantería para ver la historia del producto y actuar sobre él.

### 23.7 Economía `[CONFIRMADO]` (D-034)
Primero usos para el dinero (equipamiento, costes recurrentes, formación, investigación, mantenimiento, contratación, expansión) y después equilibrio conjunto. Debe seguir siendo viable un estudio pequeño y rentable; sin cadenas de compras obligatorias.

`[IMPLEMENTADO]` Primera revisión conjunta (LS.9, D-042): sin estrategias dominantes; el dinero se acumula a largo plazo y los grandes usos (contratación, ampliación) llegan con F4 (pregunta Q-011).

## 24. "Growing Together": de desarrollador solitario a estudio `[CONFIRMADO]` (5.ª sesión)

El fundador deja de estar solo. Es la siguiente gran etapa y también la forma de dar **usos con sentido al dinero** (Q-011): sueldos, puestos de trabajo, ampliaciones, equipamiento. No se recortan ingresos de forma arbitraria.

### 24.1 Contratar al primer Empirian `[IMPLEMENTADO]` (D-046)
- Candidatos generados por la semilla, cada uno con nombre, aspecto, habilidades (programación, diseño, creatividad, gestión), un **rasgo de personalidad** y un **sueldo** pedido. Más habilidad, más sueldo.
- Hace falta un **puesto libre** (escritorio con ordenador y silla): la oficina limita el tamaño del estudio y el catálogo cobra sentido.
- La entrevista se ve en la oficina: el candidato entra, saluda y espera. Contratar o no es una decisión con consecuencias; despedir cuesta ánimo y reputación.
- Implementado: tarjeta de candidatos con cara, habilidades, rasgo explicado con palabras y sueldo; si no hay puesto, acceso directo al modo decoración; el contratado aparece en la oficina, celebra y se sienta en su escritorio. `[FUTURO]` El candidato entrando por la puerta para la entrevista.

### 24.2 Empleados vivos `[CONFIRMADO]` (base `[IMPLEMENTADO]`: rasgos, sueldo, energía y ánimo propios)
- Aprenden haciendo con el mismo modelo que el fundador (§23.1), tienen **energía y ánimo propios**, cobran **cada semana** y pueden cansarse, alegrarse o desanimarse.
- Los rasgos tienen efecto y expresión visual (p. ej. *perfeccionista*: menos bugs y más lento; *noctámbulo*: rinde más con crunch y se agota antes; *sociable*: mejora el ánimo de los demás; *curioso*: aprende más rápido). Ningún rasgo es siempre mejor.

### 24.2b Relaciones en el equipo `[IMPLEMENTADO]` (E.3, D-056)
- Cada pareja tiene un **vínculo** (−100…100) que solo cambia por hechos: charlar en los descansos (más con alguien sociable, menos con un perfeccionista; dos curiosos conectan), trabajar juntos (solo hasta "buen equipo"), lanzar juegos juntos (un éxito une; un fracaso distancia, salvo a los amigos), perder una discusión (distancia) o llegar a un acuerdo (acerca), y el crunch (desgasta).
- De ahí surgen **amistad**, **buen equipo**, **respeto** (éxitos compartidos), **mentoría** (alguien claramente mejor en su habilidad principal enseña al otro; cada dos días se sientan juntos y quien aprende progresa más rápido hasta casi alcanzarle), **tensión** y **rivalidad**.
- **Efectos pequeños y con tope:** coordinación del equipo ±5 %, ánimo ±0,3 al día, aprendizaje del aprendiz. Los amigos charlan más; quienes tienen tensión no charlan entre sí; las discusiones salen donde la relación es más débil. La tensión se suaviza sola con el tiempo: nunca hunde el estudio.
- **Se ve:** corazones, nube o libro sobre los dos cuando cambia la relación; sesiones de mentoría; sección "Con el equipo" en la ficha (como mucho 3 líneas) y recuerdos en la Historia con ambos.

### 24.3 Trabajo en equipo `[IMPLEMENTADO]` (coordinación GT.3; reparto D-054)
- Reparto del trabajo (programar, diseñar, probar) entre los Empirians; la coordinación tiene **rendimientos decrecientes**: dos personas no son el doble de rápidas.
- Cada Empirian va a su puesto y se le ve hacer su parte.
- **Papeles** (Equipo → Reparto de tareas): Auto, Diseño, Código o Pruebas. Los especialistas son algo más rápidos, pero el juego necesita su mezcla de diseño y código; el de Pruebas encuentra y arregla bugs mientras se construye y hace que los demás cometan menos, a cambio de construir menos. Compensa en juegos grandes o con plazos ajustados, no en los pequeños y holgados.
- `[FUTURO]` Reparto automático por fases e investigación/mantenimiento como papeles cuando haya equipos grandes y productos persistentes.

### 24.4 Oficinas más grandes y nuevas ubicaciones `[CONFIRMADO]`
- Habitación → garaje → estudio: más espacio, más puestos, más ambiente y más coste mensual. Mudanza visible (cajas, oficina nueva vacía que se amuebla).

### 24.5 Otros tipos de software `[CONFIRMADO]`
- Primero **aplicaciones** y **herramientas**, con factores de éxito propios (utilidad, estabilidad, soporte) distintos de los juegos (diversión, novedad, encaje del tema). Se amplía después con F7.

### 24.6 Productos persistentes `[CONFIRMADO]`
- Mantenimiento, actualizaciones y parches; los usuarios esperan arreglos; abandonar un producto tiene consecuencias. Tocar la **caja de la estantería** abre la historia del producto y sus acciones (se une a §23.6).

### 24.7 Reglas de la etapa
- Todo con representación en la oficina; nada de tablas empresariales.
- Mantener las ideas anteriores (§23, F4–F10); lo que no entre se queda en `[FUTURO]`.
- Reequilibrar la economía con `economy.report.ts` cuando existan sueldos y ampliaciones.

## 25. "More Life, More Fun": un estudio con vida e historia `[CONFIRMADO]` (6.ª sesión)

Diversión, personalidad y claridad por delante de la complejidad. Conservar la estética voxel.

### 25.1 La pausa congela el mundo `[IMPLEMENTADO]` (D-047)
Al pausar, los Empirians, las burbujas, el confeti y las pantallas se quedan exactamente como estaban; la interfaz, la cámara y la decoración siguen funcionando; al reanudar todo continúa sin saltos.

### 25.2 Recuerdos `[IMPLEMENTADO]` (D-048)
El estudio recuerda sus momentos importantes (primer éxito, primer fracaso, contrataciones, grandes decisiones, hitos…), ligados a personas y productos. Se consultan desde la estantería y los trofeos; cada caja de producto cuenta su historia.

### 25.3 Logros y desbloqueos `[IMPLEMENTADO]` (1.er conjunto, D-048)
Logros opcionales que desbloquean decoraciones especiales. Nunca bloquean mecánicas básicas; se puede disfrutar siendo pequeño o creciendo. `[FUTURO]` Colecciones, tecnologías, especializaciones y retos.

### 25.4 Personalización de oficina `[CONFIRMADO]`
Colores de paredes y suelo, variantes de muebles, zonas de descanso y ocio con sinergias sencillas, objetos de personalidad. Distinguir lo estético de lo funcional; decorar nunca es obligatorio.

### 25.5 Empirians más personales `[CONFIRMADO]`
Cambiar aspecto, nombre y apodo del fundador y de los empleados; más peinados, ropa y accesorios; la personalidad se ve en la oficina (reacciones, manías) y tiene consecuencias jugables.

### 25.6 Momentos con más vida `[CONFIRMADO]`
Eventos contextuales nuevos (idea experimental, negociar un encargo, conflicto en el equipo, responder a una crítica, aprovechar una tendencia, feria, oportunidad inesperada) que dependen del estado real, con consecuencias diferidas y sin interrumpir en exceso.

## 26. "A World Alive": vida, variedad, tutorial y diversión `[CONFIRMADO]` (7.ª sesión)

Que EMPIRES sea divertido desde el primer minuto, que la oficina parezca viva y que cada partida cuente una historia distinta. Principio: un videojuego con personalidad, no un simulador lleno de números.

### 26.1 Tutorial integrado `[IMPLEMENTADO]` (D-049)
Una bienvenida, no una obligación: guía contextual que acompaña con acciones reales, se puede omitir, se puede repetir desde Ayuda y recuerda el progreso en la partida.

### 26.2 Oficina viva `[IMPLEMENTADO]` (1.ª versión, D-050)
Rutinas con propósito según energía, ánimo, personalidad y muebles: café, descanso, charlas, estiramientos, celebraciones, reacciones a malas noticias. Deterministas, con efectos moderados y congeladas en pausa.

### 26.3 Personalidades que se notan `[IMPLEMENTADO]` (hábitos AW.B, ficha AW.C)
Cada rasgo se expresa con gestos, burbujas y comportamientos reconocibles, sin estereotipos rígidos. La ficha muestra nombre, apodo, aspecto, personalidad, estado, habilidades, tarea y una pequeña biografía, con el personaje visible.

### 26.4 Identidad del estudio y de los personajes `[IMPLEMENTADO]` (D-051)
Colores de paredes y suelos, nuevos muebles, rincón de bebidas; editar aspecto, nombre y apodo sin tocar progresión ni historia.

### 26.5 Variedad en los proyectos y eventos que generan historias `[CONFIRMADO]` (funcionalidades y prototipos `[IMPLEMENTADO]`, D-053; primeros eventos de historia `[IMPLEMENTADO]`, D-055)
Más decisiones durante el desarrollo (funcionalidades, prototipo, alcance, deuda técnica, pruebas, comentarios, tendencias, lanzar o retrasar) y eventos contextuales con consecuencias, reflejados en la Historia del estudio, con límites de frecuencia.
- **Eventos de historia `[IMPLEMENTADO]`:** idea de un empleado, el cliente pide cambios, feria de videojuegos, crítica influyente, discusión en el equipo y petición de formación. Pregunta quien está implicado (su retrato, su mano levantada), cada opción cambia algo medible, y queda en la Historia y en la ficha de las personas implicadas.
- **Deuda técnica `[IMPLEMENTADO]` (F3.4, D-057):** las prisas dejan parches en el código. Se acumula al programar (el crunch la duplica, el ritmo tranquilo la reduce a la mitad; la experiencia, los perfeccionistas y un equipo bien avenido la moderan). Hace la programación más lenta, aumenta los bugs y baja un poco la nota, siempre con tope, y el 40 % pasa al siguiente juego. Se ve en palabras: código sólido, con parches o frágil.
  - **Atajo** (con equipo; lo propone quien mejor programa): menos trabajo ahora y más deuda. Gana cuando el juego no llega a tiempo y pierde a lo largo de varios juegos.
  - **Base sólida:** un poco más de trabajo ahora y un 10 % menos en el siguiente juego.
  - **Revisión del código** cuando hay mucha deuda: reescribir, arreglar lo urgente o seguir así (que pasa la deuda al siguiente juego).
- **Idea de alcance `[IMPLEMENTADO]` (F3.2, D-058):** si quedan huecos de funcionalidad, a mitad de producción la persona más creativa propone añadir la que mejor encaja (o la que llega a más gente si el tema está de moda): añadirla, añadirla con una semana más o seguir con lo planeado. Una sola propuesta de equipo por proyecto (esta o el atajo de código).
- **Progresión `[IMPLEMENTADO]` (D-062, `docs/PROGRESSION.md`):** el estudio empieza pequeño (tema, enfoque, plazo y decoración sencilla) y va descubriendo herramientas al alcanzar hitos reales, con un aviso breve, una pequeña celebración y un recuerdo.
- **Tipos de proyecto `[IMPLEMENTADO]` (D.4, D-060):** sin modos separados. Un juego pequeño de un equipo pequeño es **indie**: poco riesgo, y si la idea está redonda destaca. Un juego mediano con varias funcionalidades es **ambicioso**: más expectación y más exigencia (fenómeno o decepción). Los **encargos** dan ingresos previsibles, y los clientes bien atendidos vuelven y pagan más; uno defraudado tarda en volver.
- **Decisiones conectadas `[IMPLEMENTADO]` (D-061):** la experiencia reduce el riesgo oculto, un prototipo validado convence, la deuda trae bugs que pesan en la fama, las relaciones mejoran la coordinación y reducen la deuda.
- **Fama del estudio `[IMPLEMENTADO]` (F3.8, D-059):** además del prestigio, jugadores y clientes recuerdan la **calidad**, el **cumplimiento** y la **innovación** del estudio, contados con palabras en la Historia. Pesa lo reciente, se olvida poco a poco y siempre se puede recuperar. Cambia un poco la paciencia de la crítica con los fallos, el interés inicial de un juego nuevo y las condiciones de los clientes.
- `[IMPLEMENTADO]` (0.21.0, D-070) Un juego antiguo vuelve a estar de moda. `[FUTURO]` comentarios de usuarios y recortar funcionalidades por decisión propia (D.3).

### 26.6 Pequeñas satisfacciones `[CONFIRMADO]`
Animaciones discretas para los hitos; audio opcional y silenciable.

`[IMPLEMENTADO]` (0.18.0, D-066) Primera identidad sonora procedural (Web Audio, sin archivos): interfaz, compras, colocación, desbloqueos, publicaciones, celebraciones, teclados y ambiente; volumen general, efectos, ambiente y silencio.

## 27. "Build Your Own Empire": la oficina como identidad (14.ª sesión)

### 27.1 Calidad de vida `[IMPLEMENTADO]` (0.21.0, D-071)
Cámara con zoom suave, desplazamiento, órbita suave, «ver de cerca», «seguir» y «vista general» (también táctil y en pausa); deshacer el último cambio de decoración; avisos agrupados.

### 27.2 Decisiones pendientes `[IMPLEMENTADO]` (0.21.0, D-070)
«Oficina o proyecto» y «un juego antiguo vuelve a estar de moda».

### 27.3 Oficina funcional e identidad `[IMPLEMENTADO]` (0.22.0, D-072)
- **Acabados nuevos:** paredes de ladrillo, hormigón, blanco, bosque y coral; suelos de hormigón pulido, espiga, baldosa blanca, madera oscura y ajedrez. Solo estéticos.
- **Muebles con uso:** mesa de reuniones (las charlas del equipo se hacen a su alrededor, frente a frente), rincón de la tele (descansar viendo algo), lámpara de arco, armario alto. La recreativa y la consola se **juegan**, la estantería se **lee**, la vitrina se **mira**.
- **Interacciones reales:** cada objeto con uso tiene su punto de interacción, con la postura de ese uso (jugar, leer, ver la tele) y orientado al objeto; comprobado con geometría real que ni la cabeza ni el cuerpo atraviesan el mueble. **Reservas:** un punto lo usa una sola persona a la vez.
- **Zonas que surgen de los muebles:** rincón de juegos, zona de reuniones, biblioteca, zona de descanso, office de café, jardín interior, zona de trabajo: aparecen cuando hay cosas relacionadas juntas, con su nombre flotando sobre la oficina en el modo decoración.
- **Estilo de la oficina, combinable:** industrial, acogedor, retro, moderno, minimalista o creativo, a partir de los muebles, las paredes y el suelo («acogedor e industrial»). **Descriptivo, sin efecto económico** (D-072: un «bonus de estilo» se convertiría en la única forma correcta de decorar).
- `[FUTURO]` Iluminación por zonas, muebles especializados por papel (banco de pruebas, escritorios de arte), estilos con sonido ambiente propio.

## 22. Contradicciones y tensiones identificadas

| # | Tensión | Propuesta de resolución |
|---|---|---|
| T1 | "Personalizar prácticamente todo" vs. "no veinte paneles / accesible" | Desbloqueo progresivo de áreas, valores por defecto inteligentes, delegación y modo avanzado opcional. |
| T2 | Simulación profunda y oculta vs. "el jugador debe comprender las causas" | Registro causal + explicaciones narrativas; incertidumbre en estimaciones, no en las explicaciones a posteriori. |
| T3 | Estética voxel con cabeza cúbica vs. originalidad respecto a Minecraft/LEGO | Proporciones propias (cabeza ≈ 45 % de la altura), caras como calcomanías expresivas, rasgos distintivos documentados en `ART_DIRECTION.md` y revisión de originalidad. |
| T4 | Voxel 3D (personalización, ángulos) vs. rendimiento móvil | Escena pequeña, cámara fija, mallas optimizadas, presupuestos de rendimiento y validación en dispositivos en Fase 1. |
| T5 | Tiempo continuo + eventos que pausan vs. ritmo fluido | Clasificación de eventos y preferencias de notificación; límite de pausas automáticas por periodo. |
| T6 | Educativo vs. no ser un curso | Aprender por consecuencias y explicaciones breves opcionales ("¿Sabías que…?"), sin lecciones obligatorias. |
| T7 | Visión de imperio global vs. proyecto de desarrollo incremental con recursos limitados | Roadmap por fases pequeñas; cada fase entrega algo jugable; la visión completa se conserva en `[FUTURO]`. |
| T8 | Mecánicas tipo Game Dev Tycoon vs. originalidad | Evitar replicar sistemas distintivos (p. ej. combinaciones tema/género con puntuación de encaje fija, deslizadores por fase idénticos). Diseñar desde nuestros pilares: consecuencias, módulos, personas. |
| T9 | Tecnologías/empresas reales (valor educativo) vs. riesgo de marcas | Ficción inspirada en lo real (Q-002). |
