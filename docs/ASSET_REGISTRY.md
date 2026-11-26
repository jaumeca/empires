# EMPIRES — Registro de recursos y licencias

Todo recurso que entre en el repositorio (modelos, texturas, animaciones, fuentes tipográficas, sonidos, música, iconos) debe registrarse aquí **antes** de usarse. Ver `ART_DIRECTION.md` §7 (originalidad) y §9 (flujo de trabajo).

## Recursos del juego

| ID | Tipo | Archivo fuente | Autor | Herramienta | Licencia | Origen / notas | Fecha |
|---|---|---|---|---|---|---|---|
| A-001 | Paleta maestra y catálogos de color | `src/render/palette.ts` | Claude Code para el propietario | Código | Todos los derechos reservados (D-016) | Original | 2026-11-14 |
| A-002 | Habitación inicial (suelo, paredes, ventana) | `src/render/models/furniture.ts` | Claude Code | Código (definición voxel) | Todos los derechos reservados | Original | 2026-11-14 |
| A-003 | Mobiliario: escritorio, monitor, teclado, taza, lámpara, silla, planta, estantería, corcho, alfombra, sillón | `src/render/models/furniture.ts` | Claude Code | Código | Todos los derechos reservados | Original | 2026-11-14 |
| A-004 | Póster "cohete y planeta" (pixel art 10×13) | `src/render/models/furniture.ts` | Claude Code | Código | Todos los derechos reservados | Original | 2026-11-14 |
| A-005 | Caja coleccionable de producto | `src/render/models/furniture.ts` | Claude Code | Código | Todos los derechos reservados | Original | 2026-11-14 |
| A-006 | Empirian modular (cabeza, torso, brazos, piernas, 8 peinados, 5 prendas, 6 accesorios) | `src/render/models/empirian.ts` | Claude Code | Código | Todos los derechos reservados | Original; proporciones propias (ART_DIRECTION §3.1) | 2026-11-14 |
| A-007 | Caras: 9 expresiones 10×10 | `src/render/face.ts` | Claude Code | Código | Todos los derechos reservados | Original | 2026-11-14 |
| A-008 | Iconos pixel-art 8×8 (19) y burbuja voxel | `src/render/icons.ts`, `bubbles.ts` | Claude Code | Código | Todos los derechos reservados | Original | 2026-11-14 |
| A-009 | Animaciones procedurales del Empirian | `src/render/empirianView.ts` | Claude Code | Código | Todos los derechos reservados | Original | 2026-11-14 |
| A-010 | Temas de juego ficticios y nombres de medios ficticios (PixelPost, Tecla Crítica, Bitácora Lúdica, Modo Arcade) | `src/content/topics.ts`, `systems/market.ts` | Claude Code | Código | Todos los derechos reservados | Ficticios (D-021); comprobar antes del lanzamiento que no coinciden con medios reales | 2026-11-14 |
| A-011 | Textos del juego en español e inglés (borrador) | `src/i18n/es.ts`, `en.ts` | Claude Code | Código | Todos los derechos reservados | Originales | 2026-11-15 |
| A-012 | Modelos voxel del catálogo de oficina (escritorio amplio, 4 ordenadores, silla ergonómica, sofá, cafetera, pizarra, planta alta, lámpara de pie, alfombra, recreativa, armario de servidores) | `src/render/models/catalogModels.ts` | Claude Code | Código (definición voxel) | Todos los derechos reservados | Original; la recreativa es genérica, sin marca ni juego reconocible | 2026-11-16 |
| A-013 | Iconos pixel-art: decoración, girar, periódico | `src/render/icons.ts` | Claude Code | Código | Todos los derechos reservados | Original | 2026-11-16 |
| A-019 | Iconos pixel-art de nube de tormenta (tensión) y libro (mentoría) | `src/render/icons.ts` | Claude Code | Código (matriz 8×8) | Todos los derechos reservados | Originales, sin referencias externas |
| A-018 | Modelos voxel de puf, alfombra redonda y mesita; acabados de pared (5) y suelo (4) | `src/render/models/catalogModels.ts`, `src/render/palette.ts`, `src/render/models/furniture.ts` | Claude Code | Código | Todos los derechos reservados | Original | 2026-11-17 |
| A-017 | Modelo voxel de fuente de agua; iconos pixel-art de taza y bocadillo de charla | `src/render/models/catalogModels.ts`, `src/render/icons.ts` | Claude Code | Código | Todos los derechos reservados | Original | 2026-11-17 |
| A-016 | Modelos voxel de trofeos: trofeo de oro, placa, foto del equipo, bonsái, cartel luminoso, cactus de la suerte | `src/render/models/catalogModels.ts` | Claude Code | Código (definición voxel) | Todos los derechos reservados | Original | 2026-11-16 |
| A-015 | Nombres de pila para Empirians generados (40) e icono pixel-art de equipo | `src/content/names.ts`, `src/render/icons.ts` | Claude Code | Código | Todos los derechos reservados | Nombres comunes; personas ficticias | 2026-11-16 |
| A-014 | Nombres ficticios: competidores (PixelForge, ByteBakery, Nimbus Games, LoopLab), periódico "Empires Daily", clientes (Panadería, Gimnasio, Museo, Startup, Escuela, Floristería Pétalo) | `src/sim/systems/world.ts`, `contracts.ts`, `src/i18n/*` | Claude Code | Código | Todos los derechos reservados | Ficticios (D-021); comprobar antes del lanzamiento que no coinciden con marcas reales | 2026-11-16 |
| A-020 | Objetos personales de escritorio (papeles, globo, foto, lata, cactus) | `src/render/models/personal.ts` | Claude Code | Código (definición voxel) | Todos los derechos reservados | Original (0.18.0) | 2026-11-26 |
| A-021 | Vapor de taza y luz del ordenador | `src/render/officeScene.ts` (`deskLife`) | Claude Code | Código | Todos los derechos reservados | Original (0.18.0) | 2026-11-26 |
| A-022 | Identidad sonora: clics, confirmaciones, compras, colocar, desbloqueo, publicación, celebración, avisos, teclados, ambiente | `src/audio/sound.ts` | Claude Code | Código (síntesis Web Audio en tiempo real; sin archivos de audio) | Todos los derechos reservados | Original por construcción: notas y ruido generados por código (0.18.0) | 2026-11-26 |
| A-023 | Gestos de los Empirians (estirarse, bostezar, inspiración, saludo…) | `src/render/gestures.ts` | Claude Code | Código (animación procedural) | Todos los derechos reservados | Original (0.18.0) | 2026-11-26 |

Tipografía: la interfaz usa la fuente del sistema (`system-ui`/`ui-rounded`); no se incluye ningún archivo de fuente. Sin sonidos ni música todavía.

## Referencias (NO utilizables en el juego)

| ID | Descripción | Archivo | Origen | Derechos | Notas |
|---|---|---|---|---|---|
| REF-001 | Imagen de referencia del documento fundador: pequeña oficina voxel con personajes, escritorios, ordenadores, plantas, libros y burbujas | Pendiente (`docs/references/`) | Aportada por el propietario | Desconocidos — solo inspiración | No llegó en ninguna de las sesiones del 2026-11-14 |

## Herramientas y dependencias de terceros

| Nombre | Uso | Licencia | Verificado |
|---|---|---|---|
| three 0.170 | Render 3D | MIT | ✅ |
| @capacitor/core, @capacitor/cli 8.5.3 | Empaquetado móvil (D-007) | MIT | ✅ |
| vite 8.3.5, vitest 5.0.5, typescript 5.9.3, @types/* | Desarrollo y pruebas (no se distribuyen) | MIT / Apache-2.0 | ✅ |
| Dependencias transitivas | — | MIT, ISC, BlueOak-1.0.0, BSD-3-Clause, Apache-2.0, 0BSD, Unlicense (comprobado en `package-lock.json`) | ✅ |
| Playwright + Chromium | Pruebas e2e y capturas (preinstalado en el entorno, no es dependencia del proyecto) | Apache-2.0 | ✅ |
