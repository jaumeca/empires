# EMPIRES — Dirección artística

> Estilo provisional: **Cozy Voxel Tech Tycoon** · Lema: **Little People. Big Ideas.**
> Versión 0.1 · 2026-11-14 · Todo lo marcado `[PROPUESTA]` requiere aprobación del propietario.

---

## 1. Imagen de referencia

**Estado:** la imagen de referencia **no llegó** ni en la sesión de la Fase 0 ni en la sesión autónoma F1–F2 (2026-11-14): no se recibió ningún adjunto y no está en el repositorio. Siguiendo la instrucción del propietario, se ha continuado con la descripción textual (personajes voxel pequeños, adorables y expresivos; cabezas cuadradas, peinados geométricos y cuerpos compactos; oficinas como maquetas isométricas; mobiliario detallado; colores cálidos y pastel; burbujas sobre los personajes; sensación de juego de gestión con muñequitos, no de dashboard). Esta limitación queda registrada también en `DEVELOPMENT_LOG.md`. Este documento se basa en su descripción textual:

> Pequeña oficina con personajes voxel, escritorios, ordenadores, plantas, libros y burbujas visuales sobre los empleados.

**Lectura de la descripción** (qué tomamos como dirección, no como modelo a copiar):

- **Escala de maqueta**: una oficina entera cabe en pantalla; se percibe como un diorama sobre una mesa.
- **Densidad de detalle**: muchos objetos pequeños (libros, plantas) dan sensación de vida y de hogar.
- **Burbujas sobre los personajes** como lenguaje principal para comunicar estado.
- **Voxel visible**: bloques claramente perceptibles, no suavizados.

**Acción pendiente:** cuando el propietario añada la imagen, guardarla en `docs/references/` (fuera del pipeline de recursos del juego), anotar su origen en `ASSET_REGISTRY.md` como *referencia no utilizable* y completar esta sección con un análisis de composición, paleta, iluminación y proporciones, señalando explícitamente qué rasgos **no** debemos reproducir.

---

## 2. Principios visuales `[PROPUESTA]`

1. **Diorama acogedor.** Cada habitación es una maqueta con suelo y paredes recortadas, iluminada como si estuviera junto a una ventana por la tarde.
2. **Legible en pequeño.** Si un Empirian mide 60 px en un móvil, debe seguir siendo reconocible y su estado debe leerse.
3. **El estado es visible.** Postura, animación, burbujas y objetos comunican lo que pasa en la simulación.
4. **Voxel honesto.** Bloques visibles, sin texturas fotográficas, sin biseles; el encanto viene de la forma, el color y la luz.
5. **Calidez antes que frialdad tecnológica.** La tecnología se representa con colores amables: pantallas que brillan en tonos menta y ámbar, no neón agresivo.
6. **Colección.** Todo objeto debería parecer algo que te gustaría tener en una estantería.

---

## 3. Los Empirians

### 3.1 Anatomía y proporciones `[PROPUESTA]`

Unidad: **1 vóxel (v)**. Medidas en anchura × altura × profundidad.

| Parte | Tamaño | Notas |
|---|---|---|
| Cabeza | 10 × 10 × 9 v | Cubo casi perfecto, ligeramente menos profundo. **≈ 45 % de la altura total.** |
| Torso | 8 × 6 × 5 v | Compacto, más estrecho que la cabeza. |
| Brazos | 2 × 5 × 2 v | Cuelgan desde el borde del torso; "mano" = último vóxel en color de piel. |
| Piernas | 3 × 4 × 3 v | Cortas, separadas por 2 v. |
| Calzado | 3 × 2 × 4 v | Oscuro, con suela y raya lateral; sobresale un vóxel hacia delante (con 1 vóxel de alto se leía como "pies separados"). |
| **Total** | **≈ 10 × 21 × 9 v** | Peinado añade 1–4 v de altura. Se dibuja a escala 0,78 respecto al vóxel del escenario (D-022). |

**Por qué estas proporciones:**

- La cabeza muy grande respecto al cuerpo (≈ 1 : 1,2) da el aspecto de figura coleccionable y es lo más diferenciador frente a Minecraft (cabeza ≈ 25 % de la altura, cuerpo alto y extremidades largas) y frente a figuras de juguete conocidas (cabeza cilíndrica, manos en pinza, torso trapezoidal). **Nunca** usaremos manos en pinza, cabezas cilíndricas ni pivotes en la cabeza.
- El torso más estrecho que la cabeza crea una silueta en "T invertida suave" muy reconocible a 60 px.

### 3.2 Cara `[PROPUESTA]`

- La cara es una **calcomanía** (decal) de 10 × 10 "píxeles" pintada sobre la cara frontal de la cabeza, no geometría. Ventaja: expresiones intercambiables sin remodelar y animables (parpadeo, sorpresa, frustración) a coste casi nulo.
- Ojos: bloques de 1 × 2 o 2 × 2 en tono oscuro con un píxel de brillo opcional. Sin nariz en la mayoría de caras (opcional como rasgo). Boca de 2–4 píxeles. Mejillas opcionales en tono rosado.
- Conjunto inicial de expresiones: neutral, concentrado, contento, eufórico, cansado, frustrado, sorprendido, pensativo, dormido (ojos cerrados).
- Las cejas (1 fila de píxeles sobre los ojos) son la herramienta expresiva principal.

### 3.3 Rasgos distintivos de marca `[PROPUESTA]`

Para que un Empirian sea reconocible como "de EMPIRES":

- **Cabeza cúbica grande con cara-calcomanía y cejas expresivas.**
- **Burbuja de estado** voxel (cubo con una esquina en punta) que flota sobre la cabeza: es parte de la identidad, no solo de la UI.
- **Pequeño "bote" al andar** (squash vertical de 1 v en la cabeza al apoyar cada pie).
- **Insignia/acreditación** voxel (un píxel de color en el pecho) que indica el rol o departamento — útil para leer equipos a distancia.

### 3.4 Diversidad y personalización

- **Tonos de piel:** mínimo 8, desde muy claro a muy oscuro, con tono de sombra propio (no oscurecer con gris).
- **Peinados:** 10–12 iniciales (rapado, corto, flequillo, rizos en bloque, moño, coleta, afro voxel, melena, cresta suave, calvo, trenzas, pelo largo recogido). Ningún peinado copiado de un personaje conocido.
- **Colores de pelo:** naturales (8) + fantasía (4: rosa, azul, verde menta, violeta).
- **Vello facial:** barba completa, perilla, bigote, barba de tres días (calcomanía).
- **Gafas:** redondas (en voxel = cuadradas con esquinas vacías), cuadradas, gafas de pasta gruesa, gafas de sol.
- **Accesorios:** auriculares, gorra, gorro de lana, pendiente, bufanda, lápiz en la oreja, taza de café en mano.
- **Ropa por categorías:** informal (camiseta, sudadera con capucha), profesional (camisa, americana), creativa (peto, jersey de rayas), tecnológica (chaleco con bolsillos, camiseta de evento).
- **Edad perceptible:** canas, arrugas como calcomanía, postura ligeramente distinta.

### 3.5 Animaciones

Animación **rígida por segmentos** (cada parte es un bloque que rota sobre su pivote), sin deformación de malla. Es coherente con el voxel, barata en móvil y fácil de producir.

| Animación | Fase | Descripción |
|---|---|---|
| Reposo (idle) | F1 | Respiración (torso sube 0,5 v), parpadeo cada 3–6 s, pequeños giros de cabeza. |
| Caminar | F1 | Ciclo de 4 poses, brazos contrapuestos, "bote" de cabeza. |
| Trabajar en ordenador | F1 | Sentado; manos alternas tecleando; cabeza inclinada; variantes "concentrado" y "atascado". |
| Celebrar | F1 | Salto con brazos arriba; expresión eufórica; partículas de confeti voxel. |
| Pensar | F2 | Mano en barbilla, burbuja de idea. |
| Frustrarse | F2 | Brazos caídos o manos en la cabeza; nubecilla gris. |
| Beber café | F4 | En la cafetera; vapor voxel. |
| Hablar | F4 | Gestos de brazo alternos, burbuja de diálogo. |
| Dormir/descansar | F4 | En sofá; "Zzz" en vóxeles. |
| Levantar la mano | F2 | Para pedir una decisión al jugador ("¡Jefe!"). |

---

## 4. Escenarios y oficinas

### 4.1 Perspectiva y cámara `[PROPUESTA]`

- **Cámara ortográfica fija** con vista isométrica. Dos candidatas a validar en F1:
  - *Isométrica verdadera* (inclinación ≈ 35,26°, giro 45°): aspecto técnico, muy "maqueta".
  - *Dimétrica* (inclinación ≈ 30°, giro 45°): ve un poco más el suelo; suele resultar más acogedora.
- Rotación en pasos de 90° y zoom limitado: **[FUTURO]**, la arquitectura lo permite desde el inicio.
- Paredes: las dos traseras visibles; las delanteras ocultas o en corte bajo (zócalo de 2 v) para mantener el efecto diorama.

### 4.2 Escala del mundo `[PROPUESTA]`

- **Celda de suelo = 12 × 12 v.** Un escritorio ocupa 2 × 1 celdas; un Empirian ocupa 1 celda.
- **Altura de pared = 36 v** (≈ 1,7 Empirians).
- **Habitación inicial = 5 × 4 celdas** (60 × 48 v).
- Los muebles se diseñan a la escala del Empirian, con proporciones "de juguete" (un poco más gruesos y simples que en la realidad).

### 4.3 Paleta `[PROPUESTA]` (provisional, a validar en F1)

| Uso | Color | Hex |
|---|---|---|
| Madera clara (suelo, escritorios) | Roble miel | `#D9A86C` |
| Madera oscura (detalles) | Nogal | `#8C5A3C` |
| Pared | Crema cálido | `#F3E6D3` |
| Pared alternativa | Melocotón suave | `#F6C9A8` |
| Acento tecnológico | Menta | `#7FD1B9` |
| Acento | Azul cielo | `#8EC5FF` |
| Acento | Lavanda | `#B9A6E8` |
| Acento | Coral | `#FF8A7A` |
| Plantas | Verde hoja / sombra | `#6DBE6A` / `#3E8E4E` |
| Metal / tecnología | Gris cálido | `#9A9590` |
| Pantalla encendida | Menta brillante / ámbar | `#B8FFE6` / `#FFD27A` |
| Contornos y ojos | Marrón casi negro | `#2E2420` |

Reglas: evitar el negro puro y el blanco puro; las sombras tiran a violeta/azul cálido, las luces a amarillo. Un acento dominante por habitación.

### 4.4 Iluminación `[PROPUESTA]`

- Luz direccional cálida (sol de tarde por la ventana) + luz ambiental azulada suave.
- **Oclusión ambiental por vértice** horneada en los modelos voxel (gran parte del encanto voxel viene de ahí y es gratis en tiempo de ejecución).
- Sombras en tiempo real solo para personajes (o sombra circular falsa en móviles de gama baja).
- Pequeñas fuentes emisivas: pantallas, lámparas. Ciclo día/noche: `[FUTURO]`.

### 4.5 Catálogo de muebles y objetos

Cada objeto tiene: identificador, huella en celdas, puntos de interacción (dónde se sienta/está de pie el Empirian), efecto jugable (o "decorativo"), variantes de color y nivel de calidad.

Catálogo inicial (F1): suelo de tarima, 2 paredes con ventana, escritorio, ordenador (monitor + teclado), silla, planta en maceta, lámpara de escritorio, estantería con libros, póster/pizarra de corcho, alfombra, taza.

Catálogo posterior: sillas de oficina, monitores dobles, servidores, cafetera, sofá, consola, pizarra blanca, mesa de reuniones, trofeos, cajas de producto, vitrina de museo, plantas grandes, máquinas expendedoras, laboratorio.

### 4.6 Evolución de instalaciones (identidad de cada etapa)

| Etapa | Ambiente |
|---|---|
| Habitación | Cama al fondo, póster, desorden simpático, un solo escritorio. |
| Garaje | Hormigón, herramientas, luces colgantes, muebles reciclados. |
| Estudio independiente | Ladrillo visto, plantas, pizarras llenas de ideas. |
| Oficina profesional | Moqueta, mamparas de cristal, sala de reuniones. |
| Edificio tecnológico | Varias plantas, recepción, laboratorios, sala de servidores. |
| Campus | Edificios, jardín, cafetería, museo de la empresa. |

---

## 5. Burbujas, iconos y partículas

Lenguaje visual ligado al estado real de la simulación (ver `ARCHITECTURE.md` §6).

| Icono | Significado | Disparador en simulación |
|---|---|---|
| `</>` cubo menta | Código | Actividad = programar; un pulso por cada bloque de puntos de código generados |
| Pincel/paleta | Diseño | Actividad = diseñar |
| Bombilla | Idea | Evento de idea/descubrimiento; decisión disponible |
| Lupa | Investigación | Actividad = investigar |
| Bicho voxel rojo | Bug | Bug generado (sube y "se escapa") o descubierto (aparece y se marca) |
| Check verde | Prueba superada / bug corregido | Evento de corrección |
| Estrella | Calidad | Salto de calidad significativo |
| Rayo | Motivación alta | Motivación > umbral |
| Gota / nubecilla gris | Cansancio | Energía < umbral |
| Signo de exclamación | Problema | Riesgo/evento importante |
| Barra pequeña | Progreso | Fase en curso |

Reglas: máximo 1 burbuja persistente + 1 efímera por Empirian; prioridad a lo importante; tamaño mínimo en pantalla de 24 px; forma + color (nunca solo color) por accesibilidad.

---

## 6. Interfaz de usuario `[PROPUESTA]`

- Interfaz superpuesta a la escena con estética de **tarjetas de papel/cartón** con esquinas redondeadas pequeñas, sombras suaves y tipografía amable y muy legible.
- Iconografía coherente con las burbujas (mismo dibujo, versión plana).
- Tipografía: fuente con licencia OFL (p. ej. familias de Google Fonts revisadas); decisión pendiente.
- Objetivos táctiles ≥ 44 × 44 pt.
- Retratos de Empirians en la UI generados a partir del mismo modelo 3D (renderizado a textura), nunca dibujados a mano por separado.

---

## 7. Restricciones de originalidad

Lista de comprobación para cada recurso nuevo:

- [ ] No reproduce proporciones, siluetas o rasgos característicos de Minecraft (cabeza 8×8×8 sobre cuerpo alto y extremidades largas, texturas pixeladas sobre cubos), LEGO/Playmobil (cabeza cilíndrica, manos en pinza, pivote superior, cara de sonrisa estándar) ni de Game Dev Tycoon u otros tycoons.
- [ ] No usa logotipos, marcas, nombres comerciales ni productos reconocibles (los ordenadores, consolas y teléfonos son genéricos o ficticios).
- [ ] No parte de un recurso de terceros sin licencia compatible con uso comercial registrada en `ASSET_REGISTRY.md`.
- [ ] No se ha generado con IA generativa sin que el propietario haya aprobado esa vía y su licencia (ver D-017).
- [ ] Está registrado en `ASSET_REGISTRY.md`.

---

## 8. Estrategia de producción de recursos `[PROPUESTA]`

### 8.1 Personajes modulares

Un Empirian = **esqueleto rígido + piezas intercambiables + paleta**.

```
root
└─ hips
   ├─ torso ──── [ranura: top] [ranura: badge]
   │  ├─ head ── [ranura: hair] [ranura: face(decal)] [ranura: glasses] [ranura: beard] [ranura: hat]
   │  ├─ arm_L ─ [ranura: hand_item]
   │  └─ arm_R ─ [ranura: hand_item]
   ├─ leg_L ──── [ranura: shoe]
   └─ leg_R ──── [ranura: shoe]
```

- **Piezas**: cada pieza (peinado, camiseta, pantalón, zapato, gafas, barba…) es un pequeño modelo voxel con un punto de anclaje en su ranura.
- **Colores por índices de paleta**: cada vóxel de una pieza pertenece a un *canal* (piel, pelo, ropa primaria, ropa secundaria, acento, fijo). En tiempo de ejecución se asigna un color a cada canal. Una sudadera modelada una vez → infinitas combinaciones de color.
- **Caras** como atlas de calcomanías (expresiones × rasgos), combinables con cejas y barba.
- **Combinatoria**: 12 peinados × 12 colores de pelo × 8 pieles × 10 prendas superiores × N colores × 6 pantalones × 4 calzados × 8 accesorios ⇒ cientos de miles de Empirians distintos con ~60 piezas.
- **Generador de Empirians**: función determinista (semilla → apariencia) con reglas de armonía de color, para crear empleados únicos sin diseño manual.
- **Animaciones compartidas**: como todos usan el mismo esqueleto, todas las animaciones sirven para todos los Empirians.

### 8.2 Muebles y escenarios modulares

- Cada mueble es un modelo voxel independiente con: huella en celdas, pivote en la esquina, puntos de interacción, canales de color y variantes.
- Habitaciones construidas a partir de piezas: suelo por celda, tramos de pared (liso, ventana, puerta, esquina), zócalos.
- Kits por etapa (habitación, garaje, estudio…) que reutilizan la misma escala.

### 8.3 Herramientas evaluadas (sin elección definitiva — D-014)

| Herramienta | Uso propuesto | Ventajas | Inconvenientes | Licencia (a verificar) |
|---|---|---|---|---|
| **MagicaVoxel** | Muebles, objetos, piezas de personaje | Muy rápida para voxel, paleta indexada nativa, formato `.vox` documentado | Sin esqueleto ni animación; solo Windows/macOS | Gratuita; las creaciones pertenecen al autor. Verificar términos actuales. |
| **Blockbench** | Personajes: piezas, esqueleto, animaciones | Pensado para modelos de bloques, jerarquía de huesos, animación por keyframes, exporta glTF, multiplataforma y web | Menos "voxel puro" (cubos de tamaño libre); disciplina necesaria para respetar la rejilla | Aplicación GPL-3.0; los modelos creados son del autor. |
| **Blender** | Renders de marketing, iluminación de referencia, retoques de glTF | Potente, estándar | Curva de aprendizaje; excesivo para el trabajo diario voxel | GPL; las creaciones son del autor. |

**Recomendación inicial:** MagicaVoxel para objetos y piezas (paleta indexada = canales de color), Blockbench para el esqueleto y las animaciones del Empirian, Blender solo cuando haga falta. Alternativa más simple: animaciones definidas en código/datos (ver `ARCHITECTURE.md` §7), viable porque la animación es rígida.

---

## 9. Flujo de trabajo para incorporar recursos `[PROPUESTA]`

1. **Concepto**: boceto o descripción en un issue/tarea, con medidas en vóxeles y celdas.
2. **Modelado** en la herramienta acordada respetando la escala (§3.1, §4.2) y los canales de color de la paleta maestra.
3. **Fuente** guardada en `assets/source/<tipo>/<id>.<vox|bbmodel>` (los archivos fuente se versionan).
4. **Metadatos** en `assets/source/<tipo>/<id>.json`: id, tipo, huella, pivote, ranuras/puntos de interacción, canales, efecto jugable, autor, licencia.
5. **Conversión** automática (`tools/asset-pipeline`): mallado optimizado (*greedy meshing*), oclusión ambiental por vértice, atributo de canal de color, exportación a `.glb` en `public/assets/`.
6. **Validación** automática: tamaño en la rejilla, número de triángulos dentro del presupuesto, metadatos completos, licencia registrada.
7. **Registro** en `ASSET_REGISTRY.md`.
8. **Revisión visual** en una escena de prueba ("galería de recursos") y lista de originalidad (§7).

---

## 10. Primeros recursos que hay que crear (F1)

Por orden de prioridad:

1. **Paleta maestra** (archivo de paleta + canales) — base de todo.
2. **Empirian base**: cabeza, torso, brazos, piernas, zapatos; 1 peinado; 1 camiseta; atlas de caras con 4 expresiones (neutral, concentrado, contento, cansado).
3. **Habitación inicial**: suelo de tarima 5 × 4 celdas, 2 paredes (una con ventana), zócalo.
4. **Mobiliario mínimo**: escritorio, ordenador, silla, planta, lámpara, estantería con libros, un objeto decorativo (póster o corcho).
5. **Animaciones**: reposo, caminar, trabajar en el ordenador, celebrar.
6. **Burbujas**: código, bug, idea, cansancio, progreso.
7. Después (F2): 3–4 peinados más, 2–3 prendas, 2 accesorios (para la personalización mínima), caja de producto para la estantería, expresiones extra.

Todos los recursos de F1 pueden ser **originales creados por el equipo** (o generados por código como *placeholder* propio en la primera iteración técnica). No se usarán recursos de terceros.

---

## 11. Estado de implementación (2026-11-14)

Todo generado por código a partir de definiciones voxel originales (D-014, D-017). Registro en `ASSET_REGISTRY.md`.

| Recurso | Archivo | Estado |
|---|---|---|
| Paleta maestra + catálogos de piel (8), pelo (12), ropa (10), pantalón (6) | `src/render/palette.ts` | ✅ |
| Mallador voxel con oclusión ambiental por vértice y variación sutil de color | `src/render/voxel.ts` | ✅ |
| Habitación (suelo de tarima, 2 paredes con zócalo y remate, ventana con nubes) | `models/furniture.ts` | ✅ |
| Escritorio, monitor (pantalla animada), teclado, taza, lámpara, silla, planta de hojas anchas, estantería con libros, póster original (cohete), corcho, alfombra, sillón | `models/furniture.ts` | ✅ |
| Caja coleccionable de producto (color y "logo" derivados del nombre) | `models/furniture.ts` | ✅ |
| Empirian modular: 8 peinados, 5 prendas, 6 accesorios (gafas, auriculares, gorra, barba…) | `models/empirian.ts` | ✅ |
| Caras: 9 expresiones + parpadeo | `src/render/face.ts` | ✅ |
| Animaciones: reposo, caminar, sentado trabajando (teclear / diseñar / probar), pensar, levantar la mano, celebrar, descansar en el puf | `src/render/empirianView.ts` | ✅ |
| Iconos pixel-art 8×8 (código, diseño, bug, check, idea, estrella, sudor, lupa, alerta, moneda, corazón…) compartidos por burbujas e interfaz | `src/render/icons.ts` | ✅ |
| Confeti de lanzamiento | `officeScene.ts` | ✅ |

**Lista de originalidad (§7):** revisada para todos los recursos anteriores. Proporciones propias (cabeza ≈ 45 %), sin manos en pinza ni cabezas cilíndricas, sin texturas pixeladas sobre cubos al estilo Minecraft (los cubos son de color liso con AO), sin marcas ni productos reconocibles. **Pendiente:** revisión visual del propietario (F1.12).

**Mejoras artísticas identificadas:** (resuelto: el puf se sustituyó por un sillón, la planta ya no parece un cactus, el pelo tiene las esquinas recortadas) los peinados siguen siendo bastante cúbicos; las burbujas pueden solaparse con el texto anclado al Empirian; falta un retrato del Empirian renderizado desde el modelo 3D (hoy es la cara 2D).
