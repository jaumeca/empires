# EMPIRES — Revisión del gameplay de la v0.1 (2026-11-15)

> **Qué es esto:** una revisión basada en **simulaciones automáticas** (648 planes × 30 semillas, sin gráficos). Mide dominancia, sensibilidad, variabilidad y ritmo.
> **Qué no es:** una valoración de la diversión. Ninguna simulación sustituye a una persona jugando: eso es **F2.12** y sigue pendiente del propietario. Cada apartado separa lo *medido* de lo que *necesita valoración humana*.
>
> Reproducir: `EMPIRES_REPORT=1 npx vitest run tools/sim-runner/review.report.ts --silent=false`

## Resumen

| Pregunta | Resultado medido | Acción |
|---|---|---|
| ¿Hay una estrategia dominante? | **Sí, había tres** (ver §1). | Corregidas con D-030; protegidas con pruebas. |
| ¿Presupuesto y cronograma generan decisiones interesantes? | Cronograma: sí (óptimo interior). Presupuesto: a medias — con el dinero actual, 4 000 € casi siempre compensa. | Pendiente: escala económica (§2), a decidir tras F2.12. |
| ¿El jugador recibe información suficiente? | Explicación causal tras el lanzamiento: sí. Durante el desarrollo: parcial. | Propuestas para F3 (§3). |
| ¿Resultados demasiado predecibles? | Sí: misma decisión ⇒ nota ± 0,24. | F3: riesgos ocultos (§4). |
| ¿Períodos largos sin interacción? | Sí: ~54 s a 1x sin nada que decidir durante el pulido; solo 2 decisiones por proyecto. | F3: más Momentos Decisivos contextuales (§5). |
| ¿Proyectos demasiado parecidos? | Sí: los 6 temas dan la misma nota (6,3) con su enfoque ideal. | F3: funcionalidades y alcance (§6). |
| ¿Sensación de progresión? | Débil: el dinero se acumula sin destino y el fundador no mejora. | F3/F4 (§7). |

## 1. Estrategias dominantes — corregido (D-030)

**Antes** (v0.1 original, plan por defecto de 42 días):

| Palanca | Resultado (beneficio / nota) | Problema |
|---|---|---|
| Gran idea | aprobar 37 701 € / 7,41 · sencilla 30 532 € / 6,84 · mantener 24 298 € / 6,38 | Aprobar gana siempre (+55 %): no es una decisión. |
| Ritmo | tranquilo 20 053 € · **normal 24 298 €** · crunch 20 787 € (y a 28 días: 5 509 / **14 831** / 8 917) | Normal gana siempre: crunch y tranquilo son trampas. La energía nunca bajaba a ritmo normal. |
| Tamaño | pequeño 26 658 € · mediano 20 704 € | El mediano nunca compensa (2,4× el trabajo, mismo mercado). |

**Cambios y motivo:**

1. **Gran idea como apuesta.** Aprobar pide más trabajo (+35 % en lugar de +25 %), añade complejidad (bugs ×1,2) y puede no cuajar: 65 % de probabilidad de un gran salto (+1,1 de techo de calidad) y 35 % de uno pequeño (+0,2). La tirada usa la semilla de la partida. El texto ya decía "Calidad ↑↑ (probable)"; ahora es verdad.
2. **Energía relevante.** El ritmo normal cansa un poco más (0,85 en vez de 0,7 por hora), de modo que en proyectos largos el cansancio aparece y descansar importa. El crunch rinde algo más (×1,45) y agota algo menos (1,5), para que sirva como *sprint* final.
3. **Juegos medianos con más mercado.** Audiencia ×1,9 y precio aceptado +3 €: un juego mayor llega a más gente y se vende más caro, pero necesita su tiempo.

**Después:**

| Palanca | Resultado | Lectura |
|---|---|---|
| Gran idea (42 d) | aprobar 31 929 € en 53 d (602 €/día) · sencilla 29 706 € en 46 d (646 €/día) · mantener 23 775 € en 43 d (553 €/día) | Ninguna gana por más del 17 % en beneficio por día; aprobar es la de mayor varianza. |
| Gran idea (28 d, plazo corto) | aprobar 19 553 € · sencilla 20 348 € · mantener 14 628 € (pero 10 días antes) | Con poco margen, la versión sencilla iguala a la ambiciosa. |
| Crunch (28 d) | todo el proyecto 12 060 € · normal 14 628 € · **solo los últimos 7 días 15 505 €** · últimos 14 días 14 476 € | El crunch funciona como sprint corto; mantenerlo sale caro. |
| Descanso (mediano, 119 d) | sin descansar 51 486 € · **descansando al cansarse 57 181 €** (+11 %) | Cuidar la energía compensa en proyectos largos. |
| Tamaño | pequeño 42 d: 551 €/día · mediano 119 d: 430–480 €/día · mediano apresurado (84 d): 20 714 € y nota 4,7 | Ambos viables; el mediano exige más plazo y dinero, y castiga las prisas. |

Planes dentro del 5 % del mejor beneficio: de 2 (todos "normal") a 8, repartidos entre tranquilo, normal y crunch.

**Sigue pendiente:** en la tabla completa, los mejores planes siguen usando presupuesto alto y plazos largos (ver §2). **Necesita valoración humana:** si la apuesta de la gran idea se *siente* justa cuando sale mal.

## 2. Presupuesto, cronograma y escala económica

- **Cronograma (medido):** hay un óptimo interior claro (≈ 56 días para un juego pequeño); 28 días rinde un 40 % menos y 112 días, un 7 % menos. Es una decisión real.
- **Presupuesto (medido):** tiene rendimientos decrecientes (4 000 → 7 500 € ya no compensa), pero **4 000 € gana a 1 500 € y a 0 € en casi todos los planes**. La decisión es poco interesante porque el dinero sobra.
- **Escala económica (medido):** se empieza con 8 000 €; el primer juego deja ~15 000 € de beneficio y tras 8 juegos hay más de 300 000 € sin nada en qué gastarlos. No hay presión ni riesgo de quiebra.

**Propuesta (no aplicada):** reducir la audiencia base para que el primer juego deje ~3 000–6 000 € y un mal lanzamiento duela, y dar destino al dinero (F3: funcionalidades y pruebas externas; F4: contratación y oficinas). **No lo he cambiado** porque altera cómo se siente toda la partida y conviene decidirlo después de que el propietario juegue (F2.12).

## 3. Información para comprender las consecuencias

- **Medido / comprobado por pruebas:** cada lanzamiento explica su nota con 2–3 causas enlazadas a decisiones reales; las estimaciones del panel (calidad, bugs ocultos) son rangos derivados del valor real.
- **Carencias detectadas al revisar las pantallas:**
  - El encaje tema ↔ enfoque solo se descubre al publicar; no queda apuntado en ningún sitio para el siguiente proyecto.
  - El panel no avisa de que el plan va tarde ("a este ritmo no terminas") hasta que llega la fecha.
  - El interés del público aparece como un número sin referencia.
- **Propuesta F3:** cuaderno de aprendizajes del estudio (lo descubierto se recuerda), aviso de previsión de plazo dicho por el Empirian, e interés como icono de tendencia.
- **Necesita valoración humana:** si un jugador nuevo entiende por qué obtuvo su nota sin leer documentación.

## 4. Previsibilidad

- **Medido:** con el mismo plan, la nota varía ± 0,24 (5,8–6,8) y el beneficio ± 16 %. Con plazo corto sube a ± 0,39. La varianza viene casi solo del ruido de las críticas y de los bugs.
- **Lectura:** una vez conocido el plan bueno, el resultado es casi seguro. Falta incertidumbre *con causa* (no ruido).
- **Propuesta F3:** riesgos conocidos y ocultos por proyecto (técnicos, de alcance, de mercado) que pueden materializarse y que el jugador puede mitigar pagando tiempo o dinero.

## 5. Ritmo e interacción

- **Medido (plan por defecto, 42 días = 126 s a 1x):** inicio → gran idea: 30 s; gran idea → fin de producción: 42 s; fin de producción → fecha: **54 s sin ninguna decisión obligatoria**. Total: 2 Momentos Decisivos por proyecto, siempre los mismos.
- **Lectura:** a 4x un proyecto dura ~30 s y casi todo es mirar. El segundo proyecto repite exactamente las mismas dos preguntas.
- **Propuesta F3:** 6–8 Momentos Decisivos contextuales (se disparan por el estado real: cansancio, bugs acumulados, deuda técnica, retraso, dinero bajo, fin de producción), con un máximo por proyecto para no interrumpir en exceso.
- **Necesita valoración humana:** si observar al Empirian entretiene durante las esperas, y qué velocidad usa el jugador de forma natural.

## 6. Parecido entre proyectos

- **Medido:** con su enfoque ideal, los seis temas obtienen la misma nota (6,26–6,34); solo cambia el tamaño del mercado (17 000–25 000 €). Con enfoque equivocado la nota baja 0,1–0,6.
- **Lectura:** el tema es casi un cambio de nombre. No hay nada que construir de forma distinta.
- **Propuesta F3:** funcionalidades elegibles por proyecto (cada una con coste, riesgo y atractivo según el tema) y estrategias de calidad distintas.

## 7. Progresión

- **Medido (8 juegos seguidos):** la nota pasa de 7,06 a 7,51 solo por la reputación, que llega a ~100 hacia el sexto juego; las habilidades del fundador no cambian (5/5); el dinero crece sin tope.
- **Lectura:** falta crecimiento del personaje y metas en las que invertir.
- **Propuesta:** experiencia del fundador por proyecto y lecciones aprendidas (F3, pequeña parte adelantada de F4, a aprobar); gasto en mejoras y contratación (F4).
- **Necesita valoración humana:** si publicar el segundo y tercer juego sigue apeteciendo.

## 8. Después de F3.1 (momentos contextuales)

- **Medido:** el plan por defecto pasa de 2 a 3–4 decisiones por proyecto (gran idea, plan de pulido, fecha y, en proyectos largos o con crunch, agotamiento). El hueco de 54 s sin decisiones empieza ahora con una elección (plan de pulido).
- **La mejor respuesta depende del contexto (prueba automática):** con 28 días conviene "probar a fondo"; con 84, "mejorar el juego". Agotado, seguir empujando publica más bugs que descansar. Con retraso previsto, recortar alcance o retrasar la fecha superan a no hacer nada, con resultados distintos entre sí.
- **Efecto lateral medido:** el crunch con descanso al agotarse supera al ritmo normal con plazo corto (17 178 € frente a 14 645 € a 28 días) y es casi igual con plazo cómodo (84 días). El crunch ignorando el agotamiento sigue siendo peor que el ritmo normal.
- **Descartado:** un momento "bugs acumulados" se retiró porque casi nunca se disparaba y ninguna de sus opciones mejoraba el resultado frente a no hacer nada: se retomará con la deuda técnica (F3.4).

## Datos completos

- Antes de D-030: sección "2026-11-15" de `DEVELOPMENT_LOG.md` y tabla de arriba.
- Después: salida de `review.report.ts` en la misma entrada del registro.
