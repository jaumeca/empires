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
