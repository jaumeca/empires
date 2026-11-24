# EMPIRES — Productos persistentes (GT.6) · `[IMPLEMENTADO]` 0.17.0 (provisional, D-064)

> Un juego publicado no desaparece: tiene una vida comercial, una comunidad y una historia.
> Diseño para D-064 (provisional hasta que el propietario juegue).

## Principios

1. **Nada borra un lanzamiento.** La nota y las críticas se quedan. Un parche arregla bugs y los jugadores lo notan (un poco de fama de calidad, algo de ventas), pero no reescribe la crítica.
2. **Coste de oportunidad real.** Parchear o actualizar es un **trabajo de mantenimiento**, la tercera actividad junto a «tu juego» y «un encargo»: mientras se hace, no se avanza en otra cosa. Sin dinero mágico: se cobra lo que vende el producto.
3. **Sin estrategia dominante.** Las actualizaciones tienen rendimientos decrecientes (cada una empuja menos y cuesta más), un máximo de dos por producto y solo para juegos con público (nota ≥ 6,5) y no demasiado viejos. Un juego nuevo bueno debe rendir más que exprimir uno viejo; se comprueba con el simulador.
4. **Sin doble castigo.** Un juego con bugs ya se castigó en las críticas y en la fama de calidad. No parchear solo tiene consecuencia si el producto se nota abandonado (muchos bugs, meses sin parche, sin que el evento «bug crítico» lo haya tratado ya).
5. **Historias, no paneles.** La vida posterior se cuenta con notas tranquilas y recuerdos: nunca una ventana que interrumpe.

## Acciones

| Acción | Requisitos | Trabajo | Efecto |
|---|---|---|---|
| **Parche** | quedan bugs en el juego publicado; el estudio está libre | 20 + 3 puntos por bug restante (~1 semana con el fundador solo) | bugs a 0 (cuentan como arreglados), +1 reputación, fama de calidad +, ventas ×1,15 durante 4 semanas si sigue a la venta |
| **Actualización de contenido** | nota ≥ 6,5, ≤ 2 por juego, ≤ 300 días desde el lanzamiento; estudio libre | 30 % del tamaño original, +50 % por cada anterior | vuelve a la venta si había parado, rebobina 8 semanas de cola y abre una ola de ventas: cada semana 25 % de las de la primera semana del juego, decayendo ×0,75 durante 8 semanas (la siguiente actualización, ×0,6); fama de innovación + |

## Vida después del lanzamiento (notas y recuerdos, máximo una por producto y una cada ~3 semanas en el estudio)

- **Crítica tardía** (nota 6–7,5, ya retirado): un medio lo redescubre → vuelve a venderse un poco.
- **Pocos pero fieles** (nota < 5): un pequeño grupo lo defiende → ventas modestas que duran.
- **Comunidad** (nota ≥ 7): los jugadores crean mods y guías → +1 reputación.
- **Despedida** (retirado con buenas ventas): el producto se despide de las tiendas (nota neutra).
- **Abandonado** (≥ N bugs, meses sin parche): los jugadores lo notan → fama de cumplimiento −.

## Interfaz

- **Catálogo** (desde la Historia y la estantería): nombre, fecha, tema, nota, unidades, ingresos, estado (lanzamiento / cola / retirado), parches y actualizaciones, y los recuerdos del producto. Botones «Parche» y «Actualización» con su coste en días estimado; si no se puede, la razón en una frase.
- Mientras dura el trabajo, la píldora del proyecto muestra «Parche de *X*» o «Actualización de *X*» con su progreso.

## Progresión (D-062)

Nuevo desbloqueo **productos**: dos juegos publicados y uno de ellos con su campaña de lanzamiento completa. Las partidas antiguas lo reciben al cargar (aviso «¡Nuevo!» normal: es una función nueva).
