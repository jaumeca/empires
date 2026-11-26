# EMPIRES — Registro de desarrollo

Registro cronológico de bloques de trabajo. Lo más reciente, arriba.

---

## 2026-11-26 — Decimotercera sesión: A Living Little World — 1.ª parte (0.18.0)

### Estado verificado al empezar
Coincide: `production-web` = 0.17.0 (`e992610`), desarrollo `b1df2f6`, 260 pruebas.

### Resumen
- **Shaders (validación):** arranque 0.17.0 frente a desarrollo, navegador en frío, 3 ejecuciones cada uno: hasta dos frames tras empezar, 89–106 ms frente a 67–72 ms; memoria JS 15–16 MB igual; 6 → 9 programas de shader y 12 → 13 texturas; durante 15 s de juego, 0.17.0 tiene congelaciones de 0,56–1,09 s y desarrollo ninguna. No hay espera inicial añadida ni problema de memoria apreciable.
- **Empirians vivos (D-065):** gestos con personalidad y ritmo propio, reacciones escalonadas, saludos al cruzarse, miradas al que levanta la mano o a la decoración nueva.
- **Oficina viva:** objetos personales por rasgo, vapor de taza por la mañana, luz del ordenador que parpadea al trabajar.
- **Sonido (D-066):** identidad sonora procedural con volúmenes y silencio.

### Problemas encontrados
- Un gesto programado para el futuro se descartaba en el primer frame; por eso la primera prueba de geometría de gestos pasaba **sin comprobar nada**. Al corregirlo, la prueba detectó un fallo real: sentado en la silla ergonómica, echar la cabeza atrás (estirarse, bostezar) la metía en el respaldo. Ahora, sentado, la cabeza apenas se inclina hacia atrás.
- La comprobación con cajas alineadas a los ejes exageraba los choques de una cabeza girada (casi todos los gestos «chocaban»): se cambió a una comprobación orientada (vóxeles del mueble en el espacio local de la cabeza).
- Brazos levantados invisibles: con el brazo arriba, la rotación que lo separa del cuerpo lo llevaba **hacia dentro**, detrás de la cabeza. Afectaba también a la celebración existente. Corregido.
- En las capturas, el tiempo del mundo avanza más despacio que el real (pocos frames y delta limitado a 250 ms): las sondas visuales esperan en tiempo de mundo.
- El detector de claves de traducción confundió `key: 'master'` (un tipo) con una clave: renombrado.
- **e2e `routines`:** «un fracaso decepciona al equipo» miraba las caras en el mismo instante; con reacciones escalonadas (y con el mundo en pausa, que las retiene) ya no tenía sentido. La prueba ahora deja correr 1,3 s de mundo y comprueba además que **no** reaccionan todos a la vez (9/9).
- **e2e `play`:** una vez falló «la partida corrupta se recupera de una copia»: la recuperación fue correcta (tick esperado), pero el aviso no había aparecido a los 2,5 s fijos. Coincidió con pruebas unitarias pesadas que lancé en paralelo (error mío de método). En solitario pasó 3/3; la prueba espera ahora al aviso (hasta 6 s). Causa probable, no demostrada.

### Pruebas ejecutadas (0.18.0)
- `npx vitest run`: **286 pruebas**.
- E2E en serie sobre el build: 25 suites con comprobaciones en verde (nuevas: sound 11/11; routines 9/9 con la comprobación nueva) + auditoría de primeros minutos sin errores.
- Galería: 54 capturas (nueva g54, menú de sonido). Actualización real 0.17.0 → 0.18.0 sin errores.

---

## 2026-11-24 — Después de 0.17.0: rendimiento (bloque 10), en desarrollo

- **Tirones por compilación de shaders en mitad de la partida.** Perfil de CPU de un primer juego completo: dos tareas largas de 1,3–1,6 s (`WebGLProgram.getUniforms` → `getProgramInfoLog`) en el primer bocadillo (material `Sprite`) y en otro material diferido. Con GL por software es extremo; en GPU real son decenas de ms, pero sigue siendo un tirón visible.
- **Corrección:** `OfficeScene.warmUpShaders()` tras la primera sincronización de la oficina (mismas luces que la escena real): compila con `renderer.compileAsync` los materiales que se usan más tarde (bocadillos, confeti, fantasma y rejilla de Decorar, casilla de colocación). Los objetos temporales son microscópicos y los materiales se mantienen vivos (si se liberan, three.js libera también el programa).
- **Medido (3 ejecuciones):** antes, 2 tareas > 1,3 s durante el primer juego; después, ninguna por encima de 60 ms (la carga inicial de la página sigue en ~430 ms). e2e launch 10/10, pause 19/19, routines 8/8.
- Publicado en 0.18.0.

---

## 2026-11-24 — Duodécima sesión: Make the Game Come Alive (0.17.0)

### Estado verificado al empezar
Coincide: `production-web` = 0.16.0 (`9506242`), desarrollo `43b14ea`, 243 pruebas.

### Resumen
- **0.1 Cabeza dentro de la silla:** causa medida — los respaldos medían 9–10 vóxeles por encima del asiento justo donde queda la cabeza sentada (cabeza desde 10,2; respaldo hasta 14–18). Respaldos más bajos (silla básica y ergonómica sin reposacabezas) y asiento medio vóxel más adelante. `tests/render/seating.test.ts` monta un Empirian real sentado y comprueba cráneo, torso y pelo contra los vóxeles de cada silla; falla con el código anterior.
- **0.2 Tutorial intermitente:** ver «Problemas encontrados». Tres causas reales, medidas y corregidas; no se da por resuelto por repetir la prueba.
- **1.3 Objetivo siguiente:** una línea en el HUD (`systems/goals.ts`) con la próxima ambición cercana; al tocarla abre lo que corresponde.
- **3.1 Pantallas expresivas:** cada monitor muestra la actividad de su dueño (`render/screens.ts`, una textura por actividad, compartida).
- **5 Lanzamientos:** banner «¡A la venta!», nivel del lanzamiento (fracaso/correcto/sorpresa/éxito, `systems/launch.ts`), nota que sube contando, lección en los fracasos, avisos de progreso 25/50/75 %.
- **0.3 Revisión visual:** sofá, sillón y puf comprobados con geometría real (`tests/render/lounge.test.ts`: ni la cabeza ni el torso atraviesan el mueble, sin flotar); pantallas revisadas exportando sus texturas (colores de código repetidos y filas borrosas en «pruebas», corregidos).
- **GT.6 Productos persistentes (D-064, `docs/PRODUCTS.md`):** catálogo «Tus juegos», parches, contenido nuevo (pequeño relanzamiento, máx. 2, rendimientos decrecientes) y vida posterior con notas tranquilas. Tercera actividad con coste de oportunidad real. Desbloqueo nuevo; guardado v12.

### Problemas encontrados (bloque 0.2, con medidas)
1. **Congelación de 4 s al lanzar.** Instrumentando la UI (registro de modales en `?debug`) se vio que la tarjeta de resultados, programada a 1,8 s, se abría a los 9 s. Un perfil de CPU (CDP) atribuyó el bloqueo a `iconUrl → toDataURL`: cada icono pedido con un tamaño nuevo (40 px en el banner, 22 px en la tarjeta) leía un lienzo 2D acelerado por GPU, lo que obliga a esperar a que la GPU termine todo lo encolado (la oficina). 4,0–4,5 s por tamaño con GL por software; en un móvil real sería mucho menos, pero también una espera síncrona. Corrección: lienzo de CPU (`willReadFrequently`). Después: resultados a +1,8 s exactos, ninguna tarea larga > 1,5 s alrededor del lanzamiento (comprobado en `launch.cjs`).
2. **Bloqueo sin salida (error real de juego).** `openModal` cerraba en silencio el modal anterior: si una decisión llegaba justo al lanzar, los resultados la tapaban; la decisión quedaba pendiente e invisible y el juego en pausa sin forma de seguir hasta recargar. Reproducido de forma determinista (lanzar + `forceEvent('critical_bug')`). Corrección: la decisión va primero y los resultados esperan en cola; una decisión nunca sustituye a los resultados; el paso «críticas» del tutorial solo cuenta si el jugador cierra los resultados (no si otra ventana los sustituye).
3. **Resaltado perdido durante un frame.** Al reconstruirse el HUD (p. ej. al cambiar la velocidad) el botón nuevo no tenía el resaltado del tutorial hasta el siguiente frame (~160 ms aquí). Corrección: el resaltado se reaplica en el mismo momento en que se reconstruye el HUD.
- Además, la prueba del móvil medía el coach a 600 ms fijos (menos de dos frames con GL por software): ahora espera a que aparezca.
4. **Paso «meet» y «Ayuda reinicia» (artefacto de la prueba, demostrado).** Tras los arreglos anteriores siguió fallando a veces el paso 2. Primera hipótesis (CPU compartida con `vitest`) **descartada**: volvió a fallar en serie. Con diagnóstico ampliado: a los 655 ms el estado era correcto (paso «meet», tutorial activo, sin modal) pero el coach no estaba; a los 2,6 s sí. Sonda con navegador en frío: el coach aparece en 130–210 ms, pero **1,1–1,65 s si justo antes se hace una captura de Playwright** (sin tareas largas en la página: es el canal de renderizado por software poniéndose al día). La prueba hacía una captura justo antes de esos dos clics. Corrección en la prueba: esperar al coach (hasta 4 s) en lugar de 600/400 ms fijos. El juego no tenía fallo en este punto.

### Problemas encontrados (GT.6)
- Primer diseño de actualizaciones = trampa: solo multiplicaban la cola de ventas (≈ 5 % de la primera semana) y rendían menos que la mitad de lo que daría ese tiempo en un juego nuevo. Rediseñadas como ola de ventas proporcional al lanzamiento.
- El sorteo de la vida posterior consumía el generador aleatorio del mercado y reordenaba la suerte de todo (la prueba de economía de encargos saltó de 0,74 a 0,765): ahora usa su propio hash.
- Parches de 12–19 días en la primera versión (demasiado caros): ahora ~1 semana.
- En la e2e, el bocadillo del fundador pedía «¿Un juego nuevo o un encargo?» durante un parche, y el tema salía como clave sin traducir: corregidos.

---

## 2026-11-23 — Undécima sesión: From Little to Empire — progresión por desbloqueos (0.16.0)

### Estado verificado al empezar
Coincide: `production-web` = 0.15.0 (`f40fb50`), desarrollo `5bdcae4`, 230 pruebas.

### Resumen
- **Auditoría** de lo que ve un jugador nuevo (`tools/e2e/firstminutes.cjs`), antes y después, con capturas en `docs/screenshots/progression/`.
- **Diseño** en `docs/PROGRESSION.md` y D-062: 7 desbloqueos por hitos reales (mejor equipo, planificar, periódico, encargos, equipo, estudio, ampliación), nunca por esperar días; nada se vuelve a bloquear.
- **Simulación:** `systems/progress.ts`, guardado v11 con migración que reconstruye el progreso de las partidas antiguas sin avisos; primer juego sin eventos del estudio ni ideas de alcance; ofertas de encargos solo tras desbloquearse; contratar con el desbloqueo «equipo».
- **Interfaz:** HUD, primer juego, tarjeta del proyecto, Decorar (incluidos trofeos sin ganar) y atajos de teclado solo muestran lo desbloqueado; una línea anuncia lo siguiente; aviso «¡Nuevo!», confeti, recuerdo y punto «nuevo» de 3 días.

### Pruebas ejecutadas
- `npx vitest run`: **239 pruebas** (nuevas: `tests/sim/progress.test.ts` 9; las pruebas de mecánicas usan `unlockAll`).
- E2E en serie sobre el build publicado: **progression 15/15** (nueva) y las otras 21 suites en verde. Las suites de mecánicas llaman a `__empires.unlockAll()` (prueban la mecánica, no cuándo se desbloquea).
- Galería 49. Actualización real 0.15.0 → 0.16.0 (v10 → v11) sin errores ni tutorial forzado; partida antigua con un juego publicado: conserva planificar, periódico y encargos sin avisos.

### Problemas encontrados
- El simulador anual dejó de contratar (0 contrataciones): solo contrataba entre proyectos, y el desbloqueo «equipo» llega ahora con el segundo lanzamiento, cuando ya ha empezado el siguiente juego. Un jugador puede contratar siempre; el simulador ahora también.
- La estrategia «solo encargos desde el día 1» ya no es posible por diseño (los clientes llegan con las primeras ventas).
- Pruebas e2e que daban por hecho que todo existía desde el principio (periódico, encargos, funcionalidades, categorías de Decorar) o que el último recuerdo era el suyo: adaptadas.
- `tutorial` falló una vez en el paso 11 (contratar) y pasó en 4 repeticiones; queda un diagnóstico en la prueba por si vuelve.

---

## 2026-11-23 — Décima sesión (2.ª parte): D.4 tipos de proyecto y decisiones conectadas (0.15.0)

### Revisión previa
Ya existían: tamaños pequeño/mediano, funcionalidades y prototipo (D-053), contratos con tarifa, plazo y penalización (LS.8), eventos de clientes (D-055), deuda (D-057) y fama (D-059). No se crean modos: el tipo de proyecto sale del plan y los encargos reutilizan los contratos.

### Resumen
- **Indie / ambicioso / encargos** (D-060): etiqueta en el plan; chispa indie solo con una idea redonda; expectativas, fenómeno o decepción y coordinación para los ambiciosos; relación con cada cliente (habituales que pagan más, clientes defraudados que tardan en volver), visible en las ofertas.
- **Conexiones** (D-061): la experiencia reduce el riesgo oculto (y la etiqueta de riesgo del plan); un prototipo validado aumenta el interés; documentadas las conexiones existentes sin dobles castigos.

### Pruebas y validación
- `npx vitest run`: **230 pruebas** (nuevas: `tests/sim/ambition.test.ts` 6, una de riesgo por experiencia en `features.test.ts`).
- Simulaciones comparativas (en D-060): indie en solitario, con equipo, mediano, ambicioso bien y mal planeado, con plazo justo; año completo de juegos, encargos y mixto.
- E2E en serie sobre el build publicado: **profiles 4/4** (nueva) y las otras 20 suites en verde.
- Galería 49 (nueva g48 plan ambicioso). Actualización real 0.14.0 → 0.15.0 sin errores.

### Problemas encontrados
- La chispa indie se daba sola a cualquier juego pequeño bien enfocado: los juegos pequeños pasaban a dominar (1,59×). Ahora exige elegir una funcionalidad que encante a los jugadores del tema.
- El proyecto ambicioso dominaba porque su riesgo nunca aparecía: subido el listón (decepción < 7, fenómeno ≥ 8) y medido un caso mal planeado (−24 %).
- Pruebas e2e que daban por hecho el orden de las tarjetas: `play` (una decisión en vez del resultado), `story` (el resultado se abre 1,8 s después del lanzamiento) y la galería (la cuadrícula de funcionalidades se redibuja tras cada clic). Corregidas las pruebas; el juego se comportaba bien.

---

## 2026-11-23 — Décima sesión: Reputation & Identity — pausa corregida de raíz y F3.8 reputación (0.14.0)

### Estado verificado al empezar
Coincide con lo comunicado: `production-web` = 0.13.0 (`877f6ff`), desarrollo `db81e25`, 210 pruebas, sin trabajo a medias.

### Prioridad 0 — la pausa
- **Reproducido** el fallo intermitente (1 de 6 en la e2e) y **capturado** con instrumentación opcional (`EMPIRES_DIAG=1`): el fundador caminaba de vuelta a su silla con un tramo pendiente; en el último fotograma antes de pausar alcanzó un punto intermedio, y en el primer fotograma pausado (tiempo del mundo 0) su orientación objetivo saltó de −1,287 a −2,521 hacia el siguiente tramo. La rotación visible no cambió (−1,2735), porque se interpola con el tiempo; la prueba detectaba el cambio interno.
- **Corrección de raíz:** sin tiempo del mundo, `step()` no toca ruta ni orientación; al alcanzar un punto ya se orienta hacia el siguiente tramo en ese mismo fotograma; la postura tampoco cambia en pausa (salvo la vista previa del editor). La foto de la prueba registra ahora también la rotación visible y la postura.
- **Prueba de regresión** `tests/render/pause.test.ts`: falla con el código anterior (comprobado) y pasa con la corrección. E2E de pausa ampliada a 1x/2x/4x/8x: 16 ejecuciones seguidas a 19/19.
- **Dos falsos fallos de la prueba**, demostrados con datos y no con la corrección del juego: (1) el renderizador por software a veces no dibuja ningún fotograma en 400 ms (el tiempo del mundo y la simulación no avanzan), y (2) a 8x una decisión aparece a veces entre contestar y pulsar pausa (el modal intercepta el clic, comportamiento correcto). La prueba espera a que avance el tiempo del mundo y reintenta tras contestar.

### Bloque 1 — F3.8 reputación con memoria (D-059)
- Trayectoria del estudio en tres aspectos (calidad, cumplimiento, innovación) a partir de hechos reales; recuperable, con tope y olvido semanal; contada con palabras en la Historia y en el plan del siguiente juego; efectos moderados en la paciencia de la crítica con los fallos, el interés inicial y los clientes.
- Fallo de diseño detectado por las pruebas: con una media móvil simple, un pequeño hecho malo "mejoraba" una fama muy mala. Ahora cada hecho solo mueve la fama en su dirección.

### Pruebas ejecutadas
- `npx vitest run`: **223 pruebas** (nuevas: `tests/render/pause.test.ts` 3, `tests/sim/reputation.test.ts` 10).
- E2E en serie sobre el build publicado: **fame 7/7** (nueva), **pause 19/19** (ampliada), scope 5/5, debt 9/9, relations 7/7, tutorial 20/20, roles 10/10, events 9/9, features 7/7, expansion 8/8, style 7/7, identity 13/13, decor 10/10, routines 8/8, play 21/21, persistence 10/10, desktop 15/15, team 13/13, story 10/10, contracts 10/10.
- Galería 48 (nueva g47 fama). Actualización real 0.13.0 → 0.14.0 sin errores.

---

## 2026-11-23 — Novena sesión (3.ª parte): idea de alcance y tester revisado (0.13.0)

### Resumen
- **Idea de alcance** (D-058): a mitad de producción, si quedan huecos, la persona más creativa propone añadir la funcionalidad que mejor encaja (o la que llega a más gente si el tema está de moda): añadirla, añadirla con 7 días más o seguir con lo planeado. Queda en la Historia.
- **Ritmo:** una sola propuesta de equipo por proyecto (atajo de código o idea de alcance), para no interrumpir más.
- **Tester revisado** (corrige D-054): con un plan de pulido equilibrado el tester nunca compensaba; ahora construye la mitad del tiempo, reduce más los bugs de los demás y, al revisar el código, reduce a la mitad la deuda técnica del equipo. Gana en medianos ajustados, empata en holgados, pierde en pequeños.

### Pruebas ejecutadas
- `npx vitest run`: **210 pruebas** (nuevas: `tests/sim/scope.test.ts` 4; `roles.test.ts` medido con plan equilibrado; guardado < 5 KB por producto).
- E2E en serie sobre el build publicado: **scope 5/5** (nueva), debt 9/9, relations 7/7, tutorial 20/20, roles 10/10, events 9/9, features 7/7, expansion 8/8, style 7/7, identity 13/13, decor 10/10, routines 8/8, pause 16/16, play 21/21, persistence 10/10, desktop 15/15, team 13/13, story 10/10, contracts 10/10.
- Galería 47 (g46 ahora es "propuesta del equipo"). Actualización real 0.12.0 → 0.13.0 sin errores.

### Problemas encontrados
- La medida de D-054 era engañosa (dependía de una política extrema del simulador). Corregido el tester y la prueba.
- `pause` falló 1 de 3 veces (un giro del fundador durante la pausa a 4x) y pasó en las dos repeticiones; no se encontró la causa (las tarjetas de decisión no mueven la cámara ni a nadie). Se deja anotado como intermitente.
- `persistence` fallaba a veces: al importar, la página se recarga y la prueba miraba la interfaz a los 2,5 s. La partida se restauraba bien; ahora la prueba espera a que vuelva el HUD (3 de 3).
- `pause` y `debt` se adaptaron: ahora contestan las decisiones que aparecen (nuevas ideas en solitario) y eligen el proyecto que recibe el atajo.

---

## 2026-11-23 — Novena sesión (2.ª parte): F3.4 deuda técnica (0.12.0)

### Revisión previa (para no duplicar)
Ya existían: momentos contextuales (F3.1: agotamiento, retraso, plan de pulido), funcionalidades y prototipo con problemas ocultos (D-053), eventos de historia con portavoz (D-055), ritmo de trabajo y plan de pruebas, herencia de ideas entre proyectos y relaciones (D-056). Faltaba F3.4 (consecuencias diferidas en el código), que es lo implementado, reutilizando el motor de momentos, el registro causal y la Historia.

### Resumen
- **Deuda técnica** (D-057, `src/sim/systems/debt.ts`): se acumula al programar (crunch ×2, tranquilo ×0,5; experiencia, perfeccionistas y buenas relaciones la reducen), frena la programación, añade bugs y baja un poco la nota (todo con tope); el 40 % pasa al siguiente juego.
- **Decisiones nuevas** (momentos con portavoz: quien mejor programa): *atajo / hacerlo bien / base sólida* (solo con equipo) y *revisión del código* (reescribir / arreglar lo urgente / seguir así) cuando hay mucha deuda. Quedan en la Historia con quien lo propuso; la deuda aparece en el "¿Por qué?".
- **Interfaz:** "Código: sólido / con parches / frágil" en la tarjeta del proyecto; aviso de código heredado o base sólida al planear el siguiente juego; tema de Ayuda.
- Corregido de paso: la experiencia de gestión de un momento planteado por un empleado iba al empleado (ahora al fundador).

### Pruebas ejecutadas
- `npx vitest run`: **206 pruebas** (nuevas: `tests/sim/debt.test.ts` 9, con no-dominancia del atajo y de la base sólida).
- E2E en serie sobre el build publicado: **debt 9/9** (nueva), relations 7/7, tutorial 20/20, roles 10/10, events 9/9, features 7/7, expansion 8/8, style 7/7, identity 13/13, decor 10/10, routines 8/8, pause 16/16, play 21/21, persistence 10/10, desktop 15/15, team 13/13, story 10/10, contracts 10/10.
- Simulaciones comparativas (6–8 semillas, en D-057). Galería: 47 capturas (nueva g46). Actualización real 0.11.0 → 0.12.0 sin errores.

### Problemas encontrados
- Los momentos nuevos, al ir primeros, desplazaban a "vas con retraso" (máx. 3 por proyecto): ahora van al final y el atajo solo se plantea con equipo.
- Primer equilibrio: el atajo y la base sólida nunca compensaban, y el crunch quedaba un 24 % peor. Ajustado y medido (D-057).
- Una comparación salía engañosa porque el simulador contestaba "plan de pulido" con todo pulido y nada de pruebas; se usa el plan equilibrado.
- La prueba e2e de equipo se quedaba esperando la nueva pregunta del atajo (comportamiento correcto del juego): ahora la contesta.

---

## 2026-11-22 — Novena sesión: People & Possibilities — E.3 relaciones en el equipo (0.11.0)

### Estado verificado al empezar
Coincide con lo comunicado: `production-web` = 0.10.0 (`ff906b1`), desarrollo en `10b0826`, 187 pruebas, sin trabajo a medias. Diferencia de entorno: este contenedor tiene npm 10.9.9 (D-028 pide ≥ 11); `npm ci` y el build funcionan igual.

### Resumen
- **Relaciones profesionales** (D-056, `src/sim/systems/relations.ts`): vínculo por pareja que solo cambia por hechos (charlas, días trabajando juntos con tope, lanzamientos y éxitos compartidos, discusiones y acuerdos, crunch). Surgen amistad, buen equipo, respeto, mentoría, tensión y rivalidad.
- **Consecuencias moderadas:** coordinación ±5 %, ánimo ±0,3/día, mentoría (el aprendiz aprende más rápido), los amigos charlan más, la tensión evita charlas y las discusiones surgen donde la relación es peor. La tensión se suaviza con el tiempo.
- **En la oficina:** corazones, nube de tormenta o libro sobre los dos cuando cambia una relación; sesiones de mentoría cara a cara cada dos días. **Ficha:** sección "Con el equipo" (≤ 3 líneas con su significado). **Historia:** recuerdos con ambos. Ayuda: tema "Relaciones".

### Pruebas ejecutadas
- `npx vitest run`: **197 pruebas** (nuevas: `tests/sim/relations.test.ts` 10).
- E2E en serie sobre el build publicado: **relations 7/7** (nueva), tutorial 20/20, roles 10/10, events 9/9, features 7/7, expansion 8/8, style 7/7, identity 13/13, decor 10/10, routines 8/8, pause 16/16, play 21/21, persistence 10/10, desktop 15/15, team 13/13, story 10/10, contracts 10/10.
- Galería: 46 capturas (nuevas g44 amistad, g45 ficha con relaciones). Actualización real 0.10.0 → 0.11.0 sin errores.

### Problemas encontrados
- Primera versión: todos acababan siendo amigos (trabajar juntos sumaba sin límite todo el año). Ahora trabajar juntos solo lleva hasta "buen equipo"; la amistad requiere charlas o éxitos.
- "Respeto" y "buen equipo" nunca se anunciaban (se medía el estado anterior después de contar el lanzamiento): corregido.
- Los corazones quedaban tapados por la burbuja de charla del mismo instante o expulsados por burbujas de trabajo en lotes de muchos ticks: ahora se dibujan más arriba y se procesan al final del lote.
- La clave `rel.` ya se usaba para "publicar": las nuevas usan `bond.`.

---

## 2026-11-17 — Octava sesión (2.ª parte): reparto de tareas y primeros eventos de historia (0.10.0)

### Estado verificado al empezar
`production-web` = 0.9.0 (`3a3c40c`); desarrollo en `2a6fb75` con el reparto de tareas a medias (sin confirmar); guardado v10.

### Resumen
- **E.2 — Reparto de tareas** (D-054): en Equipo → Reparto de tareas, cada persona en Auto, Diseño, Código o Pruebas, con botón de reparto automático y la mezcla actual explicada. Especialistas +12 % pero el juego exige su mezcla; el de Pruebas encuentra bugs mientras se construye y reduce los de los demás. La ficha muestra el papel.
- **Primeros eventos de historia** (D-055): idea de un empleado, el cliente pide cambios, feria, crítica influyente, discusión en el equipo y petición de formación. Pregunta la persona implicada; queda en la Historia y en su ficha.
- El "¿Por qué esta nota?" ya no culpa de los bugs a eventos que no los causaron (una mesa en una feria aparecía como causa); sí cita la discusión que aceleró a costa de bugs.

### Pruebas ejecutadas
- `npx vitest run`: **187 pruebas**, todas pasan (nuevas: `tests/sim/roles.test.ts` 7, `tests/sim/storyEvents.test.ts` 11; `economy.test.ts` pasa a 12 semillas).
- E2E en el build publicado (`index-cCI8BzHV.js`), en serie: **roles 10/10**, **events 9/9**, tutorial 20/20, features 7/7, expansion 8/8, style 7/7, identity 13/13, decor 10/10, routines 8/8, pause 16/16, play 21/21, persistence 10/10, desktop 15/15, team 13/13, story 10/10, contracts 10/10.
- Galería: 44 capturas (nuevas g42 reparto, g43 evento de historia).
- Actualización real 0.9.0 → 0.10.0 con la partida en el almacenamiento: misma partida, esquema 10, sin errores, sin tutorial forzado.

### Problemas encontrados
- **Tester inútil** en la primera versión (la mitad de velocidad a cambio de casi ningún bug menos): ahora construye el 35 % del tiempo y los demás cometen un 40 % menos de bugs; compensa en juegos medianos o ajustados (medido).
- **Todos de Pruebas = juego bloqueado**: si nadie construye, construyen igualmente.
- **El tutorial no avanzaba** si la primera decisión era un evento dinámico (solo contaban los momentos del proyecto): ya cuentan los eventos. Fallo latente desde 0.7.0 que salió al cambiar el orden de las tiradas.
- **La experiencia de gestión de una decisión iba a quien preguntaba** (un empleado) en vez de al fundador: corregido.
- Las pruebas e2e `play`, `story` y `contracts` y la galería avanzaban el tiempo sin contestar preguntas; con los eventos nuevos se quedaban esperando una decisión (comportamiento correcto del juego). Nueva ayuda de depuración `__empires.play(n)` que contesta con la primera opción.
- Con 6 semillas, la prueba de economía "encargos tras un fracaso ≥ 0,95× juegos" fallaba por suerte (0,90×); con 52 semillas es 0,94–1,0×. Se documenta en D-055 y la prueba usa 12 semillas y ≥ 0,92×.
- La captura g13 (críticas) aparece semitransparente sobre la oficina; ya ocurría en 0.9.0 (no es una regresión), pendiente de revisar.

---

## 2026-11-17 — Octava sesión: The Next Chapter — Bloque C (identidad), E.1 (estudio más grande) y D.1/D.2 (funcionalidades y prototipos) (0.9.0)

### Estado verificado al empezar
`production-web` = 0.8.0 (`1fdc373`); desarrollo en `95eb89c` sin trabajo posterior; guardado v10.

### Resumen
- **Editor de Empirians** (fundador y empleados): nombre, apodo, peinado, colores, ropa y accesorios; solo cambia el aspecto y los nombres. El personaje se ve de frente y solo mientras se edita.
- **Ficha del personaje** al lado de la oficina: retrato, apodo, personalidad, energía, ánimo, tarea actual, antigüedad, habilidades, especialidades, recuerdos y una biografía construida con hechos reales.
- **Oficina**: 5 colores de pared y 4 suelos con vista previa antes de pagar; puf, alfombra redonda y mesita; rincón acogedor (+1 descanso, sin acumular). La pestaña "Paredes y suelo" va la primera.
- Ayuda actualizada (editar personajes, paredes y suelo, rincón acogedor, mudanza). Actividades de pausa con texto en la ficha (antes mostraban la clave).
- **E.1 — estudio más grande** (adelantado porque la habitación solo admitía un empleado): 14×10 casillas, 25 000 € + 60 €/día, hasta 6 empleados; todo se conserva; celebración y recuerdo. Accesos: barra de Decorar y tarjeta de Equipo.
- **D.1/D.2 — funcionalidades y prototipos** (sobre F3.2 y el motor de momentos de F3.1): 7 funcionalidades con trabajo, riesgo oculto, atractivo según el tema o alcance; huecos por tamaño y desbloqueos; prototipo opcional. Primer reequilibrio medido (D-053): las primeras cifras hacían que las funcionalidades nunca compensaran y que el prototipo no valiera nunca la pena.

### Pruebas ejecutadas
- `npx vitest run`: **169 pruebas**, todas pasan (nuevas: `tests/sim/biography.test.ts` 3, `tests/sim/officeStyle.test.ts` 4, `tests/sim/expansion.test.ts` 5, `tests/sim/features.test.ts` 7, límites de aspecto contra la paleta).
- E2E: **identity 13/13**, **style 7/7**, **expansion 8/8**, **features 7/7**, decor 10/10, routines 8/8, pause 16/16, tutorial 20/20, play 21/21, persistence 10/10, desktop 15/15, team 13/13, story 10/10, contracts 10/10.

### Problemas encontrados
- En el editor el personaje quedaba detrás de un escritorio y de espaldas (mundo en pausa): ahora se coloca en la casilla libre más cercana a la cámara y se gira al instante.
- Al aplicar un acabado había un parpadeo del anterior hasta el siguiente fotograma: se aplica directamente.
- La oficina no crecía en pantalla: la vista solo se sincronizaba cuando cambiaban los muebles; ahora también cuando cambia el tamaño.
- La prueba de pausa falla si se ejecuta a la vez que otras pruebas de navegador (sin fotogramas por el renderizado por software); en solitario, estable (3 de 3).

---

## 2026-11-17 — Séptima sesión (2.ª parte): A World Alive — Bloque B, oficina viva (0.8.0)

### Resumen
Los Empirians hacen pausas con propósito (beber, descansar, charlar), cada una en su sitio y visible unos segundos; tienen hábitos según su personalidad y estado (estirarse, bostezar, el curioso que mira lo nuevo, el sociable que busca compañía, el noctámbulo en crunch, el perfeccionista y los bugs); el equipo reacciona a éxitos, fracasos, logros, contrataciones y despedidas; el tiempo libre ya no es un paseo al azar. Nueva fuente de agua. Todo determinista en la simulación y congelado en pausa en la vista.

### Correcciones de base
- Si un destino no era alcanzable, el Empirian **atravesaba los muebles** en línea recta: ahora se queda donde está y lo reintenta (prueba en `tests/render/render.test.ts`).
- Una pausa de 1 hora dura 0,4 s reales a 1x: la vista la mantiene visible 4,5 s del reloj del mundo (sin tocar la simulación), para que dé tiempo a levantarse y volver.

### Equilibrio
Las pausas evitaban el agotamiento en los encargos (sin control de ritmo) y los hacían casi tan rentables como los juegos (≈ 235 000 € frente a 242 000 €/año). Reajuste documentado en D-050: tarifa 62 → 40, estimación 0,85 → 0,95, margen 20–60 % → 5–50 % → encargos ≈ 142 000 € (58 %). Juegos: +1 %.

### Pruebas ejecutadas
- `npx vitest run`: 23 archivos, **149 pruebas**, todas pasan (nuevas: `tests/sim/routines.test.ts` 6, ruta inalcanzable; prueba de progresión ahora promedia 3 semillas).
- E2E: **routines 8/8** (pausa en su sitio, pareja cara a cara, nadie atraviesa muebles, pausa congelada, reacción a un fracaso), tutorial 20/20, play 21/21, decor 10/10, contracts 10/10, persistence 10/10, desktop 15/15, team 13/13, pause 16/16, story 10/10.

### Problemas encontrados
- Las bebidas consumían la única pausa diaria y nunca había charlas: un día de cada dos, con alguien sociable, la pausa es una charla.
- Un fallo aislado de la prueba de pausa se debía a una decisión abierta al pulsar pausa: la prueba responde antes y verifica la velocidad.

---

## 2026-11-17 — Séptima sesión: A World Alive — Bloque A, tutorial integrado (0.7.0)

### Estado verificado al empezar
`production-web` = 0.6.0 (`ac31f27`); desarrollo limpio en `3be726b`; guardado v9.

### Resumen
Tutorial de 11 pasos, contextual y visual: tarjeta guía que no bloquea (dentro de la ventana cuando hay una abierta), resaltado del botón y flecha sobre el fundador o la estantería; cada paso se completa con hechos reales; nunca durante una decisión; se puede omitir desde la primera pantalla y repetir desde la nueva Ayuda (Menú o tecla ?). Textos para ratón (con atajos) y para dedo, en español e inglés. Guardado v10.

### Pruebas ejecutadas
- `npx vitest run`: 21 archivos, **142 pruebas**, todas pasan (nuevas: `tests/sim/tutorial.test.ts`, 6: sesión completa, progreso por cuenta propia, omitir, reiniciar sin tocar la partida, guardar/cargar a mitad, migración de partidas anteriores).
- E2E: **tutorial 20/20** (dos ejecuciones seguidas) y sin regresiones: play 21/21, decor 10/10, contracts 10/10, persistence 10/10, desktop 15/15, team 13/13, pause 16/16, story 10/10. Galería: 36 capturas.

### Problemas encontrados
- El bocadillo del fundador ("toca el ordenador") contradecía la guía: calla mientras el tutorial guía.
- La tarjeta tapaba el selector de tamaño del nuevo proyecto: con una ventana abierta, la guía se integra dentro.
- El paso de críticas se completaba al abrir los resultados y su explicación no llegaba a verse: ahora cuenta al cerrarlos.
- La galería se atascaba con el tutorial activo: las capturas generales lo omiten y hay capturas propias del tutorial.

### Siguiente
Bloque B — oficina viva (rutinas con propósito, zona de descanso, reacciones), congelado en pausa.

---

## 2026-11-16 — Sexta sesión: More Life, More Fun (ML.1–ML.3) → 0.5.1 y 0.6.0

### Resumen
- **ML.1 (0.5.1):** la pausa congela el mundo. Causa raíz: la escena animaba con tiempo real; ahora hay un reloj del mundo que solo avanza con la simulación. Publicada enseguida en `production-web` por ser una corrección pedida.
- **ML.2/ML.3 (0.6.0):** el estudio recuerda (álbum desde la estantería y los trofeos, historia de cada producto desde su caja) y 6 logros desbloquean 6 decoraciones nuevas (pestaña Trofeos).

### Pruebas ejecutadas
- `npx vitest run`: 20 archivos, **136 pruebas**, todas pasan (nuevas: `tests/render/worldClock.test.ts`, `tests/sim/story.test.ts`).
- E2E: play 21/21, decor 10/10, contracts 10/10, persistence 10/10, desktop 15/15, team 13/13, **pause 16/16**, **story 10/10**. Galería: 34 capturas.

### Problemas encontrados
- La prueba de i18n tomaba el campo `key` de los recuerdos por una clave de texto: renombrado a `fact`.
- Una compra en el tick 0 quedaba fuera del escaneo del registro causal (`<=`): se reescanea el mismo tick (los recuerdos se deduplican).
- La galería falló una vez por un tiempo de espera; a la segunda, correcta.

### Pendiente (ML)
ML.4 colores de paredes/suelo y nuevos objetos con zona de descanso; ML.5 editar aspecto/nombre/apodo; ML.6 personalidad visible; ML.7 eventos nuevos.

---

## 2026-11-16 — Quinta sesión (2.ª parte): Growing Together GT.1 — contratar al primer Empirian (0.5.0)

### Resumen
El estudio puede crecer: llegan candidatos con habilidades, personalidad y sueldo; hace falta comprar un puesto; el contratado se sienta en su escritorio, trabaja en proyectos y encargos, aprende, se cansa y cobra cada semana. Base de GT.2 (rasgos, energía y ánimo propios) y GT.3 (coordinación).

### Cambios
- Simulación: `systems/team.ts`; trabajo por persona en `project.ts` (`contribute`) y `contracts.ts`; energía, ánimo y café por persona en `step.ts`; sueldos semanales; estimaciones con todo el equipo (`teamSpeedFactor`); el escritorio en uso no se vende; guardado **v8** con migración.
- Interfaz: botón de equipo con contador (tecla T), tarjeta de candidatos (desactivado y con atajo a decorar si no hay puesto), ficha del empleado con rasgo, sueldo y despedir, avisos; icono nuevo.
- Escena: cada empleado va a su propio escritorio; quien se marcha desaparece.
- Versión **0.5.0**.

### Pruebas ejecutadas
- `npx vitest run`: 18 archivos, **128 pruebas**, todas pasan (nuevas: `tests/sim/team.test.ts`, 6). Las pruebas anteriores no cambian: con el fundador solo, la simulación da exactamente los mismos resultados.
- E2E: play 21/21, decor 10/10, contracts 10/10, persistence 10/10, desktop 15/15, **team 13/13**.
- `economy.report.ts` con estrategias de contratación (ver D-046). Galería: 32 capturas.

### Problemas encontrados
- El bucle de contratación del simulador de carreras se quedaba sin avanzar cuando no cabía un escritorio (ahora reintenta una vez por semana).
- La prueba de rasgos mezclaba los bugs del fundador con los del empleado: ahora se mide por persona con los eventos de la simulación.
- En la habitación actual solo cabe un escritorio más: la segunda contratación espera a GT.4 (oficina más grande).

### Pendiente
- GT.2: reacciones visibles por rasgo y por cansancio/sueldo; GT.3: asignar tareas; GT.4: ampliar la oficina; GT.7: reequilibrio (el dinero sigue acumulándose, aunque contratar ya es una inversión clara).
- Entrada del candidato por la puerta (`[FUTURO]`). Móviles reales.

---

## 2026-11-16 — Quinta sesión (1.ª parte): versión web estable 0.4.0

### Resumen
LS.9 cerrada (sesión anterior) y verificada; preparación de una versión web estable para que el propietario la despliegue desde Hostinger: guardado blindado, versión visible, experiencia de ordenador, guía de despliegue y rama `production-web`. Nueva etapa "Growing Together" documentada.

### Estado real verificado
- **Hechas:** LS.1, LS.2, LS.3, LS.4, LS.5, LS.7, LS.8, LS.9, F3.1, WEB.1–WEB.6.
- **Parcial:** LS.6 (cola de ventas y resurgimientos hechos; falta la historia del producto al tocar su caja → GT.6/F3.9).
- **Pendientes:** F3.2–F3.10; F1.11/WEB.7 (móviles reales, del propietario); GT.1–GT.7.

### Cambios
- **Guardado a salvo (D-045):** `?debug` usa ranuras propias; `?fresh`/`?seed`/`?stress` solo con `?debug`. Antes, abrir `?fresh` sobrescribía la partida real al autoguardar: **riesgo de pérdida eliminado**.
- **Versión 0.4.0** y commit en el menú (inyectados por Vite).
- **`public/.htaccess`** opcional (caché correcta tras actualizar).
- **Ordenador (D-043):** atajos de teclado, fantasma que sigue al ratón y clic para colocar, diálogos laterales en pantallas grandes, pistas de teclado solo con ratón. Corregido: Espacio no reanudaba tras pausar.
- **Estimación de proyecto** con la velocidad de la oficina (de LS.9).
- **Docs:** `DEPLOY_WEB.md`, `WEB_RELEASES.md`, D-043–D-045, Q-011 respondida, ROADMAP (WEB, GT), GAME_DESIGN §18 y §24, README.

### Pruebas ejecutadas (realmente)
- `npx vitest run`: 17 archivos, 122 pruebas, todas pasan. `tsc` y `npm run build` sin errores.
- `npm ci` limpio desde el lockfile con npm 10.9.9 y con npm 11.21.1, seguido de compilación: correcto.
- `dist/` servido con un servidor estático simple (Python) en una subcarpeta: carga sin errores ni peticiones fallidas; el bundle no hace peticiones a otros dominios.
- E2E (Chromium): `play` 21/21, `decor` (táctil) 10/10, `contracts` 10/10, `persistence` 10/10 (partida v1 tras actualizar, guardado al ocultar, `?fresh` inofensivo, sandbox, exportar/importar, versión en el menú), `desktop` 15/15 (teclado, ratón, 1280×720 a 2560×1440).
- Galería regenerada (30 capturas).
- **No** probado en móviles reales.

### Problemas encontrados
- `?fresh` podía borrar la partida real (corregido, ver arriba).
- Espacio pausaba pero no reanudaba (la pausa manual se recordaba a propósito para los menús): velocidad de juego separada para el atajo.
- El panel de proyecto (dos columnas) no cabía como diálogo lateral en 1366×768: se queda centrado.
- La galería esperaba la "gran idea" como primera decisión y colocaba muebles con clics que ahora confirman: actualizada.

### Pendiente
- Validación en móviles reales; inglés en borrador; GT.1 (contratar) es lo siguiente.

---

## 2026-11-16 — Cuarta sesión: "A Living Studio"

### Resumen
El estudio pasa de encadenar juegos a ser un pequeño mundo vivo: el fundador aprende haciendo, la oficina se compra, coloca y mueve con efectos reales, el mundo publica su periódico (Empires Daily) con tendencias, competidores y economía, aparecen eventos dinámicos con consecuencias diferidas y la primera actividad alternativa (encargos de clientes). Cierra con una revisión económica de un año con 9 estrategias. Sin cambios de motor, arquitectura ni identidad visual; guardado v1→v7 con migraciones.

### Commits
| Commit | Contenido |
|---|---|
| `60ad307` | Respuestas del propietario (D-032–D-036) y plan "A Living Studio" |
| `829a215` | LS.1 Experiencia y habilidades del fundador (D-037) |
| `302360e` | LS.2–LS.4 (simulación): catálogo, reglas de colocación, efectos, guardado v4 (D-038) |
| `aecdf0d` | LS.2–LS.4 (vista): oficina dinámica, modo decoración táctil, modelos voxel |
| `9c33358` | LS.5–LS.6 Empires Daily, tendencias, competidores, cola de ventas, resurgimientos (D-039) |
| `e097045` | LS.7 Eventos dinámicos con efectos diferidos (D-040) |
| `081dde9` | LS.8 Encargos externos (D-041) |
| (este) | LS.9 Revisión económica (D-042, Q-011), galería ampliada, avisos en móvil, documentación |

### Pruebas ejecutadas (realmente, en este entorno)
- `npx vitest run`: **17 archivos, 122 pruebas, todas pasan** (nuevas: progresión, oficina, mundo, eventos, encargos, economía; actualizadas: guardado, i18n, arquitectura).
- `npx tsc --noEmit` y `npm run build`: sin errores.
- E2E en Chromium (SwiftShader, escritorio 1280×720): `play.cjs` 21/21, `decor.cjs` 10/10 (con toques), `contracts.cjs` 10/10.
- `npm run gallery`: 30 capturas (8 nuevas, g22–g29).
- **No** hay pruebas en dispositivos móviles reales (F1.11 sigue pendiente).

### Mediciones de balance (detalle en `GAMEPLAY_REVIEW.md` §9 y D-037–D-042)
- Aprendizaje: ≈ +1,3 de nota media tras 10 juegos; programación ≈ 6,8 tras un año.
- Oficina: sensata +9 % al año, cara solo +2 % más; imprescindible para proyectos largos (energía).
- Tendencias: perseguir cualquiera −37 %; anticiparse −10 % con más riesgo.
- Eventos: ninguna opción domina en todos los contextos.
- Encargos: ≈ 57 % de los ingresos de "solo juegos", menos riesgo, ≈ 10 % de entregas tarde.
- **Excedente de dinero**: 137 000–310 000 € al año en todas las estrategias → Q-011.

### Problemas encontrados y cómo se resolvieron
- El aprendizaje hacía las especializaciones demasiado rápidas y la velocidad se acumulaba → xp en horas y velocidad suavizada (D-037).
- Las tendencias no premiaban a nadie → los rivales reaccionan en el pico y las tendencias son más fuertes (D-039).
- Eventos demasiado frecuentes y opciones dominantes; el rival dependía de la nueva fecha del jugador → ritmo limitado y fecha propia del rival (D-040).
- Encargos poco rentables y tardíos → tarifa, margen de plazo y estimación honesta (D-041).
- En la revisión: "crecer a mediano" parecía malo porque el plan automático usaba 70 días y nunca descansaba; con 98 días y descanso humano rinde +26 %/día.
- La estimación de un proyecto ignoraba el ordenador comprado → corregido.
- En móvil horizontal los avisos de noticias se apilaban y tapaban la oficina → uno a la vez y más compactos en pantallas bajas.
- La galería esperaba la "gran idea" como primera decisión; ahora responde antes a los eventos dinámicos.

### Limitaciones y deuda técnica conocidas
- Validación en móviles reales pendiente (F1.11). Las capturas de móvil son de Chromium de escritorio.
- En móvil horizontal el catálogo de decoración ocupa la mitad inferior de la pantalla; se podría plegar.
- Se puede colocar un mueble donde está el Empirian en ese momento (se aparta al moverse); solo visual.
- El inglés de los textos nuevos es borrador.
- La historia de cada producto al tocar su caja sigue pendiente (F3.9/F5).
- Los encargos no tienen todavía pantalla de "cliente" propia en el ordenador (usa las animaciones de programar/diseñar).

### Decisiones pendientes del propietario
- **Q-011**: cómo dar uso al dinero acumulado (recomendado: adelantar contratación y ampliación de F4, reequilibrar después).
- Validar en juego el ritmo de eventos, noticias y encargos (provisionales D-039–D-041).

### Próxima tarea recomendada
Probar la versión en el móvil (F1.11) y responder Q-011. Si se aprueba la opción recomendada: primer empleado con salario (F4 adelantado) y, a continuación, F3.2 (funcionalidades y alcance).

---

## 2026-11-15 — Tercera sesión: consolidación de la v0.1 y arranque de F3

### Resumen
Consolidación técnica completa (instalación, idiomas, historial, guardado, móvil horizontal), galería de revisión visual, revisión del gameplay con simulaciones y corrección de tres estrategias dominantes, desglose de F3 y primera tarea de F3 (momentos decisivos contextuales).

### Commits
| Commit | Contenido |
|---|---|
| `d364c77` | npm ≥ 11 sin `--legacy-peer-deps`, versiones exactas, decisiones aprobadas (D-028) |
| `ebf36bf` | Internacionalización: español base, inglés en borrador, guardado v2 (D-031) |
| `44872b9` | Compactación del historial, SaveManager con copias y cuarentena (D-029) |
| `3e3f836` | Galería de revisión con índice; ventanas en dos columnas en móvil horizontal |
| `d4bac26` | Revisión del gameplay y ajustes de balance (D-030) |
| `bec5774` | F3.1: momentos decisivos contextuales |
| (este) | Documentación: roadmap F3, decisiones, registro, arquitectura |

### Estado real del roadmap
- **F1.11, F1.12, F2.12: siguen pendientes** (dispositivos reales y revisión/juego del propietario). No se han marcado como hechas.
- **F3:** desglosada en 10 tareas; **F3.1 hecha**. Siguiente: F3.2 (funcionalidades y alcance).

### Pruebas ejecutadas
| Prueba | Resultado |
|---|---|
| `npm test` | ✅ 73/73 (antes 40): + idiomas (8), partidas largas (6), gestor de guardado (7), migración 1→2 con partidas reales (2), no-dominancia (6), momentos contextuales (4) |
| `npm run typecheck`, `npm run build` | ✅ |
| `npm audit` (npm 11) | ✅ 0 vulnerabilidades |
| Instalación desde cero sin indicadores (npm 11.21.1 y 12.2.1) | ✅ |
| e2e en Chromium contra la build de producción | ✅ 21/21 (añadidas: recuperación de autoguardado dañado, cuarentena, momento contextual) |
| Simulación de estrategias (648 planes × 30 semillas) | ✅ ejecutada antes y después de D-030 |
| **Rendimiento en móviles reales** | ⏸ **No probado**. Chromium de escritorio no lo valida. |
| Diversión / claridad | ⏸ **No evaluable automáticamente** (F2.12) |

### Problemas encontrados
- **`--legacy-peer-deps`:** fallo interno de npm 10.9.x al instalar Vitest (reproducido de forma aislada). Solución: npm ≥ 11.
- **Errores introducidos y detectados por las pruebas e2e durante la sesión:** el guardado al ocultar la página sobrescribía una partida recién importada (corregido con una marca de recarga).
- **El worker de la sesión se reinició** a mitad de la galería; no se perdió trabajo (se rehízo el paso y se reverificó todo).
- **Momento "bugs acumulados"** retirado por no tener consecuencias apreciables.
- **La imagen de referencia sigue sin recibirse.** No se ha usado ningún recurso externo ni se ha cambiado la estética.

### Capturas
`docs/screenshots/README.md` — 22 capturas con índice (JPEG, 2 MB), regenerables con `npm run gallery`.

### Balance: antes y después de D-030 (plan por defecto de 42 días, 30–40 semillas)
| | Antes | Después (con F3.1) |
|---|---|---|
| Gran idea: aprobar / sencilla / mantener | 37 701 / 30 532 / 24 298 € | 32 529 / 29 148 / 23 202 € (y la aprobación es una apuesta) |
| Ritmo a 28 días: tranquilo / normal / crunch | 5 509 / 14 831 / 8 917 € | 5 325 / 14 645 / 17 178 € (crunch con descanso; ignorando el agotamiento: ~10 700 €) |
| Tamaño: pequeño / mediano | 26 658 / 20 704 € | 26 350 / 55 671 € (mediano en ~3× el tiempo) |
| Planes a menos del 5 % del mejor | 2 de 648 | 7 de 648 |
| Decisiones por proyecto | 2 | 3–4 |
| Variación de la nota con el mismo plan | ± 0,23 | ± 0,25 |

### Limitaciones y deuda conocidas
- La traducción inglesa es un borrador sin revisar.
- Escala económica sin presión (sobra dinero): pendiente de decisión tras F2.12.
- Los mejores planes siguen usando presupuesto alto: el presupuesto aún no es una decisión interesante (F3.6).
- Resultados previsibles (± 0,25) hasta que lleguen los riesgos (F3.3).
- El guardado sigue en localStorage (D-023): revisar antes de versiones comerciales.
- En móviles pequeños (667×375) la tarjeta de nuevo proyecto aún pide un pequeño desplazamiento.

### Decisiones pendientes del propietario
1. **F1.12** — revisión visual con la galería (identidad, cámara D-009a, escala D-022).
2. **F2.12** — jugar la v0.1 y valorar diversión, ritmo y claridad.
3. **Escala económica** (GAMEPLAY_REVIEW §2): ¿reducir ingresos para que el dinero importe?
4. **Experiencia del fundador en F3.8** (adelanta una parte pequeña de F4): ¿aprobada?
5. **Dispositivos** para F1.11.
6. Revisión de la traducción inglesa cuando se quiera activar.

### Próxima tarea
F3.2 — Funcionalidades y alcance personalizables.

---

## 2026-11-14 — Bloque 3: pulido visual

- Planta rediseñada con hojas anchas (antes se leía como un cactus).
- El puf (se veía como una caja o un pastel escalonado) se sustituye por un **sillón** acogedor; el Empirian se sienta mirando al jugador.
- Peinados con las esquinas superiores recortadas (silueta menos "caja").
- La burbuja de diálogo se ancla sobre el pelo, no en el cuello.
- Comprobado: `npm test` 40/40, build ✅, e2e 18/18, estrés 91 draw calls. Capturas regeneradas.

---

## 2026-11-14 — Bloque 2 de la sesión autónoma: estrés, exportar/importar, pausa manual

- **F1.10 escena de estrés** (`?stress=10`, `tools/e2e/stress.cjs`): 11 Empirians → 91 draw calls, 81 k triángulos (antes de fusionar cabeza+pelo: 102). Captura `13-stress-10.png`. Los Empirians extra son solo visuales y se solapan entre sí: la evitación entre personajes se hará con la contratación (F4).
- **Exportar/importar** probados de extremo a extremo (descarga real del archivo `.empires` y selector de archivos): e2e ahora **18/18**.
- **Bug corregido:** si el jugador pausaba y abría el menú, al cerrarlo el juego se reanudaba. Ahora la pausa manual se respeta; tras un Momento Decisivo el juego sí continúa.
- **Tarjetas compactas** en pantallas bajas (móvil horizontal): captura `12-phone-new-project.png`.
- Pruebas: `npm test` 40/40, `npm run build` ✅, e2e 18/18.

---

## 2026-11-14 — Sesión autónoma F1–F2 (Claude Code)

### Resumen

EMPIRES se puede jugar de principio a fin en el navegador: crear al Empirian fundador, ver la habitación voxel, crear un videojuego (tema, tamaño, enfoque, presupuesto, plazo, precio), ver al Empirian trabajar con burbujas ligadas a la simulación, tomar un Momento Decisivo, publicar, recibir críticas con explicación causal, ver las ventas semana a semana, guardar la caja en la estantería, guardar y recuperar la partida.

### Commits

| Commit | Contenido |
|---|---|
| `adbd3a5` | F1.1–F1.3, F2.1–F2.3: proyecto TS, simulación determinista, guardado versionado, balance headless |
| `67cfef1` | F1.4–F1.10, F2.4–F2.11: oficina voxel, Empirian modular animado, UI táctil y ciclo jugable |
| `75d62cb` | Vite 8 / Vitest 5 (0 vulnerabilidades), configuración de Capacitor, calzado, capturas |
| (este) | Documentación: roadmap, decisiones, registro, dirección artística, arquitectura |

### Estado real del roadmap

- **F0:** hecho (la imagen de referencia no llegó; ver Problemas).
- **F1:** hecho salvo **F1.11** (bloqueada: no hay SDK de Android/Xcode ni dispositivos) y **F1.12** (revisión del propietario). La escena de estrés con 10 Empirians (parte de F1.10) queda pendiente.
- **F2:** F2.1–F2.11 hechas; **F2.12** (prueba de juego del propietario) pendiente.

### Pruebas ejecutadas (todas realmente ejecutadas en este entorno)

| Prueba | Resultado |
|---|---|
| `npm test` — 40 pruebas Vitest (simulación, reloj, determinismo, replay, consecuencias, estimaciones, guardado y migración, límites de arquitectura, modelos voxel, Empirian, rutas) | ✅ 40/40 |
| `npm run typecheck` | ✅ |
| `npm run build` | ✅ (570 kB JS / 151 kB gzip) |
| `npm audit` | ✅ 0 vulnerabilidades (tras actualizar Vite/Vitest) |
| `npm run sim` — balance con 30–40 semillas | ✅ ver tabla abajo |
| `tools/e2e/play.cjs` contra la build de producción (Chromium headless) | ✅ 16/16 |

Comprobaciones e2e (16 en este bloque; 18 tras el bloque 2): creación del fundador, personalización aplicada por comando, inicio de proyecto, **la pausa detiene el tiempo**, 4x avanza el tiempo, burbujas generadas por eventos, decisión tomada desde la UI y registrada en el registro causal, publicación con 4 críticas, tarjeta de resultados con explicación, ventas que generan dinero, caja en la estantería, **guardar + recargar restaura el estado exacto** (comparación JSON completa), la caja persiste tras recargar, sin errores de página.

Requisitos específicos pedidos por el propietario:

| Requisito | Cómo se comprueba | Estado |
|---|---|---|
| La simulación funciona sin Three.js | Todas las pruebas de `tests/sim` se ejecutan en Node sin render; `architecture.test.ts` prohíbe importar Three.js/DOM en `src/sim` | ✅ |
| Misma semilla + mismas decisiones = mismos resultados | `determinism.test.ts` (+ replay del registro de comandos) | ✅ |
| FPS distintos no cambian resultados | `clock.test.ts`: partida completa con decisiones a 120, 60, 30, 10 y 4 FPS → estado idéntico | ✅ |
| La pausa detiene el tiempo | `clock.test.ts` + e2e | ✅ |
| Guardar y recuperar conserva el estado | `save.test.ts` (incluido continuar la partida tras cargar) + e2e | ✅ |
| Presupuesto y cronograma tienen consecuencias reales | `consequences.test.ts` (rendimientos decrecientes, óptimo interior, presupuesto que deja de compensar, pruebas, crunch, decisiones) | ✅ |
| Los Empirians se representan correctamente | `render.test.ts` (todas las combinaciones de peinado × accesorio × prenda, esqueleto, poses) + revisión visual de capturas | ✅ (revisión del propietario pendiente) |
| La compilación funciona | `npm run build` | ✅ |
| La interfaz permite completar el ciclo | e2e 16/16 | ✅ |
| **Rendimiento en móviles reales** | — | ⏸ **No probado** (sin dispositivos) |
| Exportar/importar partida desde la UI | e2e (bloque 2) | ✅ |

### Balance (npm run sim, 40 semillas, juego pequeño, enfoque ideal)

| Plan | Nota | Bugs publicados | Beneficio |
|---|---|---|---|
| 14 días | 2.0 | 6.8 | −3 641 € |
| 28 días | 5.5 | 4.4 | 15 347 € |
| 42 días | 6.5 | 0.2 | 25 419 € |
| **56 días** | 6.6 | 0.0 | **26 388 €** (óptimo) |
| 84 días | 6.8 | 0.0 | 25 802 € |
| 112 días | 6.9 | 0.0 | 24 449 € |
| Presupuesto 4 000 € vs 7 500 € | 6.53 vs 6.59 | — | 27 457 € vs 27 278 € |
| Precio 4,99 / 9,99 / 14,99 / 19,99 € | — | — | 19 169 / 25 676 / 23 805 / 18 892 € |

Más tiempo mejora la nota cada vez menos y, pasado el óptimo, reduce el beneficio: **dedicar más tiempo no garantiza mejores resultados**.

### Capturas disponibles (`docs/screenshots/`)

`01-founder-creation`, `02-room`, `03-new-project`, `04-working`, `05-decision`, `06-release-party`, `07-results`, `08-shelf-box`, `09-after-reload`, `10-phone-landscape` (844×390), `11-phone-portrait` (390×844), `cam-dimetric`, `cam-isometric`.

### Problemas encontrados y cómo se resolvieron

- **La imagen de referencia no llegó** (ni en esta sesión ni en la anterior). Se siguió con la descripción textual, como indicó el propietario.
- **Deriva de coma flotante en el reloj** (299 vs 300 ticks con fotogramas de 1000/120 ms): corregido con un épsilon en el acumulador; prueba añadida.
- **Botones del HUD reemplazados en cada cambio de estado** (el botón "¡Publicar!" se desprendía del DOM durante el toque): el HUD ahora solo se reconstruye cuando cambia su estructura y los valores se actualizan en el sitio.
- **Empirian demasiado grande** respecto al mobiliario: escala 0,78 (D-022).
- **Pelo como "caja hueca"**, **zapatos que parecían separados**, **Empirian hundido en silla, puf y alfombra**: corregidos.
- **Marketing con retorno lineal** (más presupuesto siempre ganaba) y **precio bajo siempre mejor**: rebalanceado con saturación y precio esperado según la nota (D-024).
- **Vulnerabilidades en Vite 5 / Vitest 2** (solo servidor de desarrollo): actualizado a Vite 8.3.5 / Vitest 5.0.5. npm falla al resolver *peer dependencies* opcionales; se instala con `--legacy-peer-deps` (D-025).

### Limitaciones y deuda técnica conocidas

- Rendimiento móvil sin medir (R-001 sigue abierto). Las cifras de FPS de este entorno (render por software) no son representativas.
- Textos de la UI en español incrustados en el código (sin sistema de localización todavía).
- La tarjeta de "Nuevo videojuego" es larga en móvil horizontal (hay que desplazarse).
- El registro causal no se compacta todavía (R-004); en partidas largas crecerá.
- La bancarrota no existe todavía (el dinero puede ser negativo; hay aviso de dinero bajo).
- Solo hay un tipo de producto (videojuego) y un Empirian.
- Al importar una partida o empezar una nueva, la página se recarga (forma simple y robusta de reconstruir la escena).

### Decisiones pendientes del propietario

- **F1.12:** aprobar o corregir la identidad visual (capturas), la cámara dimétrica (D-009a) y la escala del Empirian (D-022).
- **D-026:** identificador de la app `top.expires.empires` (no se puede cambiar tras publicar).
- **D-020:** ubicación de los documentos (sigue sin aprobar; no bloquea nada).
- Dispositivos físicos de prueba para F1.11.

### Próxima tarea recomendada

1. **F2.12** — Que el propietario juegue la v0.1 (`npm run dev`) y comente diversión, ritmo y claridad.
2. **F1.11** — Build Capacitor en un equipo con Android Studio/Xcode y medición en 1–2 móviles.
3. Después, **F3** (consecuencias y personalización ampliadas).
