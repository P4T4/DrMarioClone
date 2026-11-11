---
type: progress
title: Decision queue — Duelo privado online
description: Supuestos de juego que deben revisarse después de la primera prueba funcional.
tags: [sdd, progress, decision-queue]
timestamp: 2026-11-11T05:42:00Z
topic: sdd
slug: duelo-privado-online
status: active
---

# Decision queue — Duelo privado online

## Review after first playable duel

- **review-after — ritmo y control de cápsulas:** revisar con una partida jugable si la caída automática de una fila por segundo, el descenso por entrada con límite de 100 ms, el hard drop y el giro sobre el segmento izquierdo sin wall-kick resultan legibles y justos. Los valores actuales son supuestos de especificación para que las transiciones tengan un resultado comprobable; cualquier ajuste debe actualizar la spec, sus pruebas y el plan antes de integrarse.

## Decision queue

### Review-after — límites de alias y código
- kind: review-after
- task: T007
- tier: 1
- question: ¿Los límites de alias de 1–20 puntos de código y el código Crockford de ocho caracteres son fáciles de usar?
- options: mantener los límites; ajustar el máximo del alias; cambiar longitud o alfabeto del código.
- recommendation: probar primero el flujo con dos personas y revisar accesibilidad antes de cambiar el protocolo.
- evidence: `02-DOCS/wiki/sdd/specs/duelo-privado-online.md`, Acceptance criterion 11.

### Review-after — forma y patrón de las piezas
- kind: review-after
- task: T012
- tier: 1
- question: ¿La silueta y trama del obstáculo se distinguen con rapidez de virus y cápsulas?
- options: mantener las formas actuales; ajustar patrón o silueta tras la prueba visual.
- recommendation: verificar con capturas en escritorio y móvil antes de cerrar accesibilidad.
- evidence: `02-DOCS/wiki/sdd/specs/duelo-privado-online.md`, Acceptance criterion 6.

### Review-after — duración de juego
- kind: review-after
- task: T005
- tier: 1
- question: ¿La duración que excluye cuenta regresiva y pausas refleja lo que los jugadores esperan ver?
- options: mantener tiempo de juego activo; cambiar a tiempo de pared después de la prueba con usuarios.
- recommendation: conservar tiempo activo porque corresponde al reloj del tablero y no penaliza desconexiones.
- evidence: `02-DOCS/wiki/sdd/specs/duelo-privado-online.md`, Acceptance criterion 9.

### Review-after — colocación y eliminación de obstáculos
- kind: review-after
- task: T004
- tier: 1
- question: ¿Es adecuada la entrega en la primera celda libre desde abajo y la eliminación de obstáculos ortogonalmente adyacentes a una coincidencia?
- options: mantener la regla determinista actual; elegir una columna de llegada; cambiar el criterio de eliminación.
- recommendation: probar el ritmo con una partida jugable antes de ajustar colocación o eliminación.
- evidence: `02-DOCS/wiki/sdd/specs/duelo-privado-online.md`, Behaviour/Acceptance 6; `tests/game/core/attacks.test.ts`.

## T001 — 2026-11-11
- status: complete
- red: el primer `pnpm verify` encontró archivos de harness ajenos al scaffold al recorrer el workspace; se limitaron Prettier y ESLint a archivos del producto. No había comportamiento de juego que probar en esta tarea.
- green: `pnpm install --frozen-lockfile` y `pnpm verify` terminaron con código 0.
- triangulation: Playwright abrió la ruta inicial y verificó el encabezado accesible; 1 prueba e2e pasó.
- suites: Vitest unitario e integración ejecutaron sin pruebas, previsto hasta T002/T006 y T007/T010. Playwright no permite una suite e2e vacía.
- files: `.gitignore`, `.nvmrc`, configs Astro/TypeScript/ESLint/Prettier/Vitest/Playwright, `package.json`, `pnpm-lock.yaml`, `src/pages/index.astro`, `tests/e2e/scaffold.spec.ts`, config SDD, plan, decisiones e índice.
- risk: tier 1 (`default`, `docs`); un revisor.
- review: ronda 1: 0 hallazgos; ronda 2: 0 reportados → 0 únicos → 0 confirmados; veredicto pass.
- controls: formato ✅ lint ✅ tipos ✅ unitarias ✅ (0 pruebas aún) integración ✅ (0 pruebas aún) e2e ✅ (1 pasada) build ✅ auditoría ✅ (sin vulnerabilidades conocidas) trazabilidad ✅ (solo scaffold).
- decision: rama local `feat/duelo-privado-online` sobre `master`; no hay remoto. Astro 7.4.10, Phaser 3.90.0 y TypeScript 6.0.2 quedan fijados; Node mínimo 22.23.4. `pnpm audit` justificó overrides para `esbuild` y `minimatch`.
- Selected skills: `implement`, `astro`, `typescript`, `typescript-setup`, `e2e-testing`.
- Compact rules: versiones exactas; separar formato/lint del harness existente; no atribuir comportamiento de juego al shell inicial.
- Skill resolution: `used` — skills seleccionadas; `missing` — `testing-web` no está instalada; `fallback` — configuración Vitest directa, verificada con los runners; no se añadieron pruebas unitarias ficticias.
- next: T002, generador determinista de tablero y pruebas de inicialización.

### T002 — Evidencia TDD
- red: antes del generador, `pnpm test:unit -- tests/game/core/board-initialization.test.ts` ejecutó 4 pruebas: 3 fallaron por aserción (tablero esperado de 128 celdas, spawn central y variación por semilla) y 1 pasó.
- green: después del generador, el mismo comando pasó: 1 suite, 4 pruebas.

## T002 — 2026-11-11
- status: complete
- red/green: evidencia guardada en `### T002 — Evidencia TDD`; la prueba de inicialización pasó después del generador.
- triangulation: una semilla repetida reproduce el tablero completo; otra semilla cambia la distribución. Los dos spawn centrales permanecen libres.
- files: `.prettierrc.json`, `src/game/core/game-core.ts`, `src/game/core/types.ts`, `tests/game/core/board-initialization.test.ts`, decisiones y progreso SDD.
- risk: tier 1 (`default`, `docs`); un revisor por ronda.
- review: ronda 1: 1 reportado → 1 único → 1 confirmado; cerrado como fixed en ronda 2 al registrar la evidencia red/green. La herramienta `finding-verifier` no estuvo disponible; `rubber-duck` verificó el hallazgo contra el estado exacto. Rondas 2 y 3: 0 hallazgos. En ronda 3, el revisor informó que no podía abrir el paquete temporal y revisó el rango de commits indicado.
- controls: formato ✅ lint ✅ tipos ✅ unitarias ✅ (4 pasadas) integración ✅ (0; suite aún no creada) e2e ✅ (1 pasada) build ✅ auditoría ✅ (sin vulnerabilidades conocidas) trazabilidad ✅ (AC3 y parte de AC4).
- decision: semilla textual y dificultad numérica; PRNG determinista local; celdas en orden por filas. La escala de dificultad queda sin efecto en la distribución hasta que la spec la defina. `endOfLine: auto` evita que la conversión LF/CRLF del checkout rompa el gate de formato en Windows.
- Selected skills: `implement`, `typescript`, `debug`, `review`.
- Compact rules: mantener el Game Core independiente del render; semillas del lado servidor; conservar tipos de celda discriminados y resultados repetibles; tratar los finales de línea de forma portable.
- Skill resolution: `used` — skills seleccionadas; `missing` — `testing-web` no está instalada; `fallback` — Vitest directamente con el comando/config existentes.
- next: T003, controles de cápsula, coincidencias y gravedad.

## T003 — 2026-11-11
- status: complete
- red: antes de implementar los controles, el runner encontró 13 fallos de comportamiento en las pruebas T003; tras la revisión tier 1, una prueba nueva reprodujo que un segmento conectado caía separado de su pareja.
- green: después del motor y de la corrección de vínculo entre segmentos, las pruebas unitarias terminaron con 20 pasadas en total; las 16 pruebas T003 afectadas pasan.
- triangulation: movimiento, giros CW/CCW, límites y celdas ocupadas, rate limit de caída rápida, reloj de gravedad, hard drop, bloqueo de spawn, coincidencias horizontales/verticales, caída independiente tras desconexión y cadenas; una cápsula conectada cae como unidad hasta que uno de sus lados queda apoyado.
- files: `src/game/core/game-core.ts`, `src/game/core/types.ts`, `tests/game/core/game-fixtures.ts`, `tests/game/core/capsule-controls.test.ts`, `tests/game/core/matches-and-gravity.test.ts`, decisiones.
- risk: tier 1 (`default`, `docs`); un revisor por ronda.
- review: ronda 1: 1 reportado → 1 único; la prueba de regresión reprodujo el hallazgo de gravedad conectada y se corrigió. `finding-verifier` no pudo arrancar porque el modelo fijado por el registro del agente no está disponible en este runtime. Ronda 2: 0 hallazgos; veredicto pass.
- controls: formato ✅ lint ✅ tipos ✅ unitarias ✅ (20 pasadas) integración ✅ (0; suite planificada para T007/T008) e2e ✅ (1 pasada) build ✅ auditoría ✅ (sin vulnerabilidades conocidas) trazabilidad ✅ (AC4, AC9 y AC10).
- decision: `GameCore.start(board, logicalTime)` crea una cápsula reproducible desde la semilla; cada tick aceptado baja una fila y reinicia el reloj; segmentos fijados comparten `capsuleId`, y solo los segmentos ya desconectados caen por separado.
- commits: `db973a5` implementación T003; `35ef55c` corrección de revisión.
- Selected skills: `implement`, `typescript`, `review`.
- Compact rules: transiciones deterministas y sin mutar el estado de entrada; el reloj limita los controles; los segmentos conectados se mueven como unidad; las pruebas cubren la regla antes y después de corregirla.
- Skill resolution: `used` — skills seleccionadas; `missing` — no hay `.rsc/skill-registry.json`; `fallback` — selección manual según la config SDD y los skills disponibles.
- next: T004, puntuación y ataques.

## T004 — 2026-11-11
- status: complete
- red: cinco pruebas de `attacks.test.ts` fallaron por aserciones antes de implementar puntuación, generación, entrega y eliminación; después, la revisión tier 1 encontró un caso de suma insegura que una prueba nueva reprodujo en rojo.
- green: las 10 pruebas de ataques pasan después de implementar y corregir los acumulados; `pnpm verify` terminó con código 0.
- triangulation: puntos por virus y cadenas posteriores; umbral 4; máximo 3 obstáculos por resolución con sobrantes conservados; transferencia saliente explícita; llegada de uno por cápsula fijada; eliminación por adyacencia ortogonal; rechazos por conteos inválidos y desbordamiento.
- files: `src/game/core/game-core.ts`, `src/game/core/types.ts`, `tests/game/core/attacks.test.ts`, `tests/game/core/game-fixtures.ts`, decisiones.
- risk: tier 1 (`default`, `docs`); un revisor por ronda.
- review: ronda 1: 1 reportado → 1 único (should-fix); el overflow acumulado se reprodujo con una prueba y se corrigió. `finding-verifier` no pudo arrancar porque su modelo predeterminado no está disponible en este runtime. Ronda 2: 0 hallazgos; veredicto pass.
- controls: formato ✅ lint ✅ tipos ✅ unitarias ✅ (30 pasadas) integración ✅ (0; suite planificada para T007/T008) e2e ✅ (1 pasada) build ✅ auditoría ✅ (sin vulnerabilidades conocidas) trazabilidad ✅ (AC6).
- decision: `score` acumula puntos de ataque; los contadores de puntos, estadísticas y obstáculos rechazan desbordamientos. La entrega y eliminación provisionales quedan en `Review-after — colocación y eliminación de obstáculos`.
- commits: `10ccf18` implementación T004; `b6b3344` corrección de revisión.
- Selected skills: `implement`, `typescript`, `review`.
- Compact rules: puntuar eventos estabilizados del Game Core; limitar generación por resolución y conservar excedentes; separar ataques entrantes de salientes; validar acumulados antes de devolver estado.
- Skill resolution: `used` — skills seleccionadas; `missing` — no hay `.rsc/skill-registry.json`; `fallback` — selección manual según la config SDD y los skills disponibles.
- next: T005, resolución de resultados terminales.

## T005 — 2026-11-11
- status: complete
- red: `pnpm vitest run tests/game/core/match-result.test.ts` ejecutó 6 pruebas; 5 fallaron por aserciones al devolver el stub fijo y aceptar entradas inválidas.
- green: después de implementar la resolución, `pnpm verify` terminó con código 0; la suite unitaria ejecutó 37 pruebas.
- triangulation: victoria por eliminación de virus para ambos índices; victoria rival por bloqueo y desconexión para ambos índices; empate con dos resultados terminales; rechazo de ambos jugadores activos, duración negativa/no finita y contador inválido; estadísticas ordenadas y duración exactas.
- files: `src/game/core/game-core.ts`, `src/game/core/types.ts`, `tests/game/core/match-result.test.ts`, `02-DOCS/wiki/sdd/decisions.md`.
- risk: tier 1 (`default`, `docs`); un revisor según el cálculo de riesgo.
- review: revisión directa del diff: 0 hallazgos; no se delegó una revisión independiente porque el alcance cabe en una lectura directa. Ronda 1 registrada.
- controls: formato ✅ lint ✅ tipos ✅ unitarias ✅ (37 pasadas) integración ✅ (0; suite planificada para T007/T008) e2e ✅ (1 pasada) build ✅ auditoría ✅ (sin vulnerabilidades conocidas) trazabilidad ✅ (AC9).
- decision: `MatchResult` no se produce si ambos resultados siguen `Active`; se rechazan duración y contadores inválidos, y se devuelve una copia de las estadísticas en el orden recibido.
- Selected skills: `implement`, `typescript`.
- Compact rules: resultado terminal explícito; `AllVirusesCleared` favorece a quien lo alcanza; bloqueo/desconexión favorecen al rival; dos terminales simultáneos empatan; conservar el orden de estadísticas y propagar duración activa.
- Skill resolution: `used` — `implement`, `typescript`; `missing` — no hay `.rsc/skill-registry.json`; `fallback` — selección manual según la config SDD y skills disponibles.
- next: T006, estructura accesible de interfaz.

## T006 — 2026-11-11
- status: complete
- red: `pnpm test:unit -- tests/ui/controls-and-accessibility.test.ts` ejecutó 13 pruebas nuevas; 12 fallaron por aserciones contra los stubs de mapeo, errores y presentación de piezas.
- green: después de implementar controles y la estructura de página, `pnpm verify` terminó con código 0; 50 pruebas unitarias y 2 pruebas e2e pasaron.
- triangulation: teclas previstas y teclas no asignadas; todas las acciones táctiles admitidas; mensajes distintos y acciones de recuperación para seis fallos; formas/patrones de virus, cápsula y obstáculo; foco del enlace para saltar contenido y axe sin violaciones WCAG 2.2 AA.
- files: `src/ui/controls.ts`, `src/ui/piece-presentations.ts`, `src/pages/index.astro`, `tests/ui/controls-and-accessibility.test.ts`, `tests/e2e/scaffold.spec.ts`, `package.json`, `pnpm-lock.yaml`, `02-DOCS/wiki/sdd/decisions.md`.
- risk: tier 1 (`default`); un revisor según el cálculo de riesgo.
- review: revisión directa del diff: 0 hallazgos; no se delegó una revisión independiente porque el alcance cabe en una lectura directa. Ronda 1 registrada.
- controls: formato ✅ lint ✅ tipos ✅ unitarias ✅ (50 pasadas) integración ✅ (0; suite planificada para T007/T008) e2e ✅ (2 pasadas, incluida axe WCAG 2.2 AA) build ✅ auditoría ✅ (sin vulnerabilidades conocidas) trazabilidad ✅ (AC10, AC12).
- decision: las piezas muestran forma y patrón junto a iconos SVG decorativos; Playwright ejecuta axe con etiquetas WCAG y comprueba el foco del enlace de salto.
- Selected skills: `implement`, `accessibility`, `typescript`.
- Compact rules: HTML semántico nativo; foco visible y enlace de salto; no depender solo del color; textos claros y acciones de recuperación; automatizar WCAG y probar teclado.
- Skill resolution: `used` — `implement`, `accessibility`, `typescript`; `missing` — no hay `.rsc/skill-registry.json`; `fallback` — selección manual según la config SDD y skills disponibles.
- next: T007, ciclo de sala e inicio sincronizado.

## T007 — 2026-11-11
- status: complete
- red: las siete pruebas iniciales de ciclo de sala fallaron por aserción contra el stub; una prueba de borde posterior reprodujo que `trim()` aceptaba tabulaciones y saltos de línea al inicio/final del alias.
- green: después de completar `RoomService` y rechazar controles antes de normalizar, `pnpm test:integration -- tests/server/rooms/room-lifecycle.test.ts` pasó con 8 pruebas.
- triangulation: alias Unicode de 20 puntos de código, alias inválidos al crear y unirse, código Crockford y normalización ASCII, expiración exacta y unión un milisegundo antes, capacidad, dos asientos y transición countdown → playing.
- files: `src/server/rooms/room-service.ts`, `src/rooms/types.ts`, `src/ui/controls.ts`, `tests/server/rooms/room-lifecycle.test.ts`, `02-DOCS/wiki/sdd/plans/duelo-privado-online.md`, `02-DOCS/wiki/sdd/decisions.md`.
- risk: tier 1 (`default`, `docs`); un revisor según `rsc risk`.
- review: ronda 2: 1 reportado → 1 único → 1 confirmado; fallo reproducido y corregido. Ronda 3: 0 nuevos hallazgos; ledger `L3` cerrado como fixed.
- controls: formato ✅ lint ✅ tipos ✅ unitarias ✅ (50 pasadas) integración ✅ (8 pasadas) e2e ✅ (2 pasadas, incluida axe WCAG 2.2 AA) build ✅ auditoría ✅ (sin vulnerabilidades conocidas) trazabilidad ✅ (AC1, AC2, AC3, AC11, AC12).
- decision: los caracteres de control se rechazan antes de recortar el alias; la cuenta de puntos de código se realiza sobre el alias ya recortado. `join` informa `InvalidAlias` igual que `create`.
- Selected skills: `implement`, `typescript`.
- Compact rules: validar alias en servidor; rechazar controles antes de normalizar; preservar transiciones de sala con reloj inyectable; códigos aleatorios y únicos; devolver snapshots sin exponer arrays mutables.
- Skill resolution: `used` — `implement`, `typescript`; `missing` — no hay `.rsc/skill-registry.json` ni `02-DOCS/wiki/harness/user-profile.md`; `fallback` — config SDD, inspección manual y voz con analogías.
- next: T008, entradas autoritativas y sincronización del estado oficial.

## T008 — 2026-11-11
- status: complete
- red: cuatro pruebas de integración fallaron por aserción contra los stubs: inicio de partida, entrada aceptada, transferencia de ataques y pausa/reanudación.
- green: después de conectar `RoomService` con Game Core y el reloj oficial, la suite de integración pasó con 13 pruebas.
- triangulation: countdown antes de crear tableros; asientos/secuencias/acciones inválidas sin mutación; tick interno sincronizado en ambos tableros; GravityTick no aceptado desde el cliente; transferencia de ataques; pausa que congela entradas y excluye 5 s del resultado; eventos falsos de bloqueo no finalizan estado activo; semillas ausentes de snapshots.
- files: `src/server/rooms/room-service.ts`, `tests/server/rooms/authoritative-game.test.ts`, `02-DOCS/wiki/sdd/plans/duelo-privado-online.md`, `02-DOCS/wiki/sdd/decisions.md`.
- risk: tier 1 (`default`, `docs`); un revisor según el cálculo real.
- review: rondas 1–3; ronda final: 0 reportados → 0 únicos → 0 confirmados; ledger sin hallazgos.
- controls: formato ✅ lint ✅ tipos ✅ unitarias ✅ (50 pasadas) integración ✅ (13 pasadas) e2e ✅ (2 pasadas, incluida axe WCAG 2.2 AA) build ✅ auditoría ✅ (sin vulnerabilidades conocidas) trazabilidad ✅ (AC4, AC5, AC6, AC9).
- decision: las secuencias por asiento son estrictamente crecientes pero pueden tener saltos; el reloj y los ticks de gravedad son del servidor; los snapshots no revelan semillas; `pause`/`resume` acumulan tiempo detenido para T010.
- Selected skills: `implement`, `typescript`.
- Compact rules: no confiar en estado/tiempo del cliente; validar entradas en runtime; calcular transiciones con Game Core; transferir ataques después de resolver el tablero; devolver snapshots copiados y sin semillas; compartir un resultado terminal por sala.
- Skill resolution: `used` — `implement`, `typescript`; `missing` — no hay `.rsc/skill-registry.json` ni `02-DOCS/wiki/harness/user-profile.md`; `fallback` — config SDD y revisión directa del contrato/código.
- next: T009, chat efímero con límites y entrega solo a ambos asientos.

## T009 — 2026-11-11
- status: complete
- red: tres pruebas fallaron por aserción contra el stub: texto inválido, entrega/rate limit y reloj lógico inválido.
- green: después de implementar `ChatService`, la suite de integración pasó; 17 pruebas de integración pasaron en total.
- triangulation: 200 emojis (puntos de código) admitidos; 201, vacío, controles y tipo inválido rechazados; límites independientes por asiento y frontera exacta de 1.000 ms; reloj retrocedido explícitamente rechazado; historial en memoria borrado al terminar y envíos posteriores rechazados.
- files: `src/server/chat/chat-service.ts`, `tests/server/chat/chat.test.ts`, `02-DOCS/wiki/sdd/plans/duelo-privado-online.md`, `02-DOCS/wiki/sdd/decisions.md`.
- risk: tier 1 (`default`, `docs`); un revisor según el cálculo real.
- review: rondas 1–3; ronda final: 0 reportados → 0 únicos → 0 confirmados; ledger sin hallazgos.
- controls: formato ✅ lint ✅ tipos ✅ unitarias ✅ (50 pasadas) integración ✅ (17 pasadas) e2e ✅ (2 pasadas, incluida axe WCAG 2.2 AA) build ✅ auditoría ✅ (sin vulnerabilidades conocidas) trazabilidad ✅ (AC7).
- decision: una instancia efímera por sala conserva mensajes solo en memoria; longitud de 1–200 puntos de código, sin controles; un mensaje por asiento cada segundo del reloj de sala; termina y limpia historial al finalizar. El silencio se aplica localmente en la interfaz.
- Selected skills: `implement`, `typescript`.
- Compact rules: validar texto antes de almacenar; contar puntos de código; medir frecuencia con reloj monotónico del servidor; entregar solo a los dos asientos; limpiar memoria al terminar; no implementar silencio como filtro del servidor.
- Skill resolution: `used` — `implement`, `typescript`; `missing` — no hay `.rsc/skill-registry.json` ni `02-DOCS/wiki/harness/user-profile.md`; `fallback` — config SDD y revisión directa.
- next: T010, pausa, conservación de estado y reconexión de 30 segundos.

## T010 — 2026-11-11
- status: complete
- red: las pruebas iniciales de reconexión fallaron por aserción: faltaban tokens de asiento y `disconnect()`/`reconnect()` eran stubs.
- green: la suite de integración enfocada pasó con 13 pruebas; la suite completa pasó con 22 pruebas de integración.
- triangulation: token correcto recupera el mismo estado ya avanzado; token de otro asiento y token inventado se rechazan; reconectar a 29.999 ms funciona y a 30.000 ms expira; `advance()` también resuelve la expiración; la pausa de cinco segundos no suma a la duración final; tokens ausentes de snapshots.
- files: `src/server/rooms/room-service.ts`, `tests/server/reconnect/reconnect.test.ts`, `tests/server/rooms/room-lifecycle.test.ts`, `02-DOCS/wiki/sdd/decisions.md`.
- risk: tier 2 (`auth`, `default`); panel de tres lentes registrado; aprobación humana requerida antes de integrar.
- review: ronda 1: 4 reportados → 4 únicos → 4 confirmados (3 fixed, 1 irrelevant por pertenecer al transporte de T011); ronda 2: 2 → 2 únicos → 2 confirmados (ambos fixed); ronda 3: 0 → 0 únicos → 0 confirmados. Ledger: 9 hallazgos cerrados, sin pendientes.
- controls: formato ✅ lint ✅ tipos ✅ unitarias ✅ (50 pasadas) integración ✅ (22 pasadas) e2e ✅ (2 pasadas) build ✅ auditoría ✅ (sin vulnerabilidades conocidas) trazabilidad ✅ (AC8).
- decision: tokens opacos aleatorios de 256 bits; se almacena SHA-256 y se compara en tiempo constante; se excluyen tokens de snapshots. El transporte notificará ambas sesiones en T011.
- Selected skills: `implement`, `typescript`.
- Compact rules: validar token y asiento en servidor; pausar una sola vez; aceptar antes de 30.000 ms y expirar al llegar al límite; acumular toda pausa en el reloj lógico.
- Skill resolution: `used` — `implement`, `typescript`; `missing` — `.rsc/skill-registry.json`, perfil de usuario y agentes personalizados compatibles; `fallback` — configuración SDD, Vitest y agentes `general-purpose` en contextos separados para el panel y los verificadores.
- next: T011, conectar la interfaz y verificar el flujo de dos sesiones, incluida la pausa visible para ambas.

## T011 — 2026-11-11
- status: complete
- red: el e2e aislado inicial falló en 3/5 repeticiones; los snapshots mostraron una partida bloqueada al segundo 1. Pruebas con semillas `seed-5` y `seed-6` fallaron porque un virus podía impedir la primera caída central o lateral.
- green: después de reservar libre la fila inferior al spawn, las pruebas unitarias de tablero pasaron (52 pruebas) y el recorrido de dos sesiones pasó en 3/3 repeticiones aisladas.
- triangulation: el e2e verifica que el tablero del rival refleja una entrada aceptada, chat con silencio local, pausa visible, reconexión del mismo estado, estadísticas finales, acción de volver al inicio y recuperación por sala caducada en ambos navegadores.
- files: `src/server/main.ts`, `src/shared/room-protocol.ts`, `src/server/rooms/room-service.ts`, `src/components/PrivateDuel.astro`, `src/ui/private-duel.ts`, `src/pages/index.astro`, `src/game/core/game-core.ts`, `tests/e2e/private-duel.spec.ts`, `tests/game/core/board-initialization.test.ts`, `tests/server/rooms/room-lifecycle.test.ts`, `playwright.config.ts`, `package.json`, `pnpm-lock.yaml`, spec y decisiones.
- risk: tier 1 (`default`, `docs`); un revisor según `rsc risk` sobre `b2acab5`.
- review: ronda 1: 3 reportados → 3 únicos → 3 confirmados por inspección y pruebas (todos fixed: L10–L12); ronda 2: 0 hallazgos. El verificador delegado no pudo iniciar porque la preferencia del harness referencia un modelo no disponible; la verificación se hizo directamente y los tres comportamientos quedaron cubiertos por e2e.
- controls: `pnpm verify` ✅ formato ✅ lint ✅ tipos ✅ unitarias ✅ (52) integración ✅ (24) e2e ✅ (4) build ✅; `pnpm audit --prod` ✅ (sin vulnerabilidades conocidas); trazabilidad ✅ (AC1–AC12).
- decision: reservar toda la primera fila de caída para que un movimiento lateral válido no bloquee el siguiente spawn; mostrar estadísticas finales y acción de retorno; comprobar sincronización del tablero entre ambas sesiones.
- Selected skills: `implement`, `debug`, `review`, `security-audit`.
- Compact rules: el servidor conserva autoridad sobre la partida; las pruebas observan estados de dos clientes reales; las semillas iniciales no deben causar una derrota inmediata.
- Skill resolution: `used` — `implement`, `debug`, `review`, `security-audit`; `missing` — `.rsc/skill-registry.json`, perfil de usuario y agente `finding-verifier` compatible; `fallback` — configuración SDD, Vitest/Playwright y verificación directa de los hallazgos. `rsc risk`, `review ledger` y `pnpm audit` sí se ejecutaron.
- next: T012, validar accesibilidad visual y rendimiento en dispositivos de referencia.

## T012 — 2026-11-11
- status: blocked
- observation: `pnpm verify` pasó formato, lint, tipos, 52 pruebas unitarias, 24 de integración, 4 e2e y build; e2e incluye la auditoría axe WCAG 2.2 AA de la aplicación base. Se inspeccionaron capturas de sala en escritorio y resultado en escritorio/emulación móvil de 390×844; el glosario visual muestra formas distintas para virus, cápsula y obstáculo. Las capturas permanecen adjuntas a la sesión y no están guardadas como archivos del proyecto.
- performance: una muestra de `requestAnimationFrame` de 3 s en el navegador integrado, a 1006×666, contó 300 frames (100 FPS). Es una referencia de la página en reposo, no una medición de la partida ni de un dispositivo físico; la muestra móvil no terminó.
- controls: el recorrido e2e de dos sesiones verificó entradas de teclado; pruebas automatizadas de accesibilidad y de mapeo de controles pasaron. No se verificó entrada táctil en un dispositivo real.
- blocker: el plan exige un dispositivo táctil real para completar checklist y medir rendimiento móvil; este entorno solo permitió emulación. Falta también guardar capturas persistentes y registrar el dispositivo/navegador de referencia.
- files: `tests/server/reconnect/reconnect.test.ts`.
- decision: inspección y medición de escritorio se registran como evidencia parcial, no como sustituto del dispositivo real requerido por el plan.
- Selected skills: `implement`, Vitest/Playwright.
- Compact rules: no equiparar RAF en reposo con FPS de juego; no declarar validado el móvil por emulación; conservar únicamente resultados observados.
- Skill resolution: `used` — `implement`; `missing` — `.rsc/skill-registry.json` y dispositivo táctil de referencia; `fallback` — suites Vitest/Playwright y navegador integrado.
- next: completar checklist, medición y capturas persistentes en el dispositivo táctil real acordado.

## T013 — 2026-11-11
- status: blocked
- verification: `pnpm verify` terminó con código 0 tras estabilizar la prueba de reconexión; formato, lint, tipos, unitarias (52), integración (24), e2e (4) y build pasaron. `pnpm audit --prod` no encontró vulnerabilidades conocidas.
- red/green: la prueba de reconexión falló porque su semilla aleatoria podía colocar un virus en la celda de `MoveLeft`; el harness ahora usa `reconnect-test-seed`, cuya celda destino está libre. La suite enfocada pasó (5 pruebas) y la verificación completa pasó.
- files: `tests/server/reconnect/reconnect.test.ts`, `02-DOCS/wiki/sdd/progress/duelo-privado-online.md`.
- risk: tier 1 (`default`); `rsc risk --base HEAD --json`.
- review: ronda 1 abierta en ledger; revisión directa del cambio de una línea, sin cambios en lógica de producción.
- controls: unitarias ✅ integración ✅ e2e ✅ formato ✅ lint ✅ tipos ✅ build ✅ auditoría ✅ trazabilidad parcial; cierre pendiente de T012.
- blocker: no declarar el diff listo para PR mientras falte la verificación física de T012.
- Selected skills: `implement`, Vitest.
- Compact rules: las pruebas que dependen de la geometría inicial deben usar semillas reproducibles; el gate final no puede cerrar tareas previas incompletas.
- Skill resolution: `used` — `implement`; `missing` — `.rsc/skill-registry.json` y dispositivo táctil de referencia; `fallback` — configuración SDD, Vitest/Playwright y revisión directa.
- next: completar T012 en dispositivo real y volver a ejecutar `pnpm verify`.

## Marcador de partida — 2026-11-11
- status: complete
- red: la vista previa unitaria devolvía `null`; integración detectó que faltaban `elapsedMs` y datos por asiento; el e2e observó que el HUD solo mostraba puntuación, virus eliminados y cadenas.
- green: 54 pruebas unitarias, 24 de integración y 4 e2e pasan. El e2e verifica estadísticas en ambos asientos, la próxima cápsula, avance del reloj activo y congelación durante una pausa.
- files: `src/game/core/types.ts`, `src/game/core/game-core.ts`, `src/server/rooms/room-service.ts`, `src/server/main.ts`, `src/shared/room-protocol.ts`, `src/ui/private-duel.ts`, `src/components/PrivateDuel.astro`, pruebas de Game Core, sala, reconexión y e2e.
- risk: tier 1 (`default`, `docs`); `npx @ericrisco/rsc risk --base HEAD --json`.
- review: inspección directa del diff detectó que una versión inicial de la vista previa podía revelar la próxima cápsula rival en el snapshot compartido; se corrigió a un mensaje privado por asiento. La suite e2e y el chequeo de tipos pasaron después del cambio.
- controls: `pnpm verify` ✅ formato ✅ lint ✅ tipos ✅ unitarias ✅ (54) integración ✅ (24) e2e ✅ (4, incluida auditoría axe WCAG 2.2 AA) build ✅; `pnpm audit --prod` ✅ (sin vulnerabilidades conocidas); trazabilidad ✅ (AC5 y referencia de HUD).
- decision: el servidor calcula la vista previa a partir de la semilla privada y la entrega solo al asiento dueño; `elapsedMs` deriva del reloj lógico oficial y el cliente solo interpola la presentación, congelándola al pausar y usando la duración oficial al terminar.
- Next: T012 continúa pendiente por falta de un dispositivo físico; el usuario indicó «déjalo y continua con el proyecto». Esta mejora no se presenta como validación móvil.

## Integración con master — 2026-11-11
- status: blocked
- branch: `feat/duelo-privado-online`; `origin/master` apunta a `f8c08aa`.
- verification: `pnpm verify` pasó formato, lint, tipos, 54 unitarias, 24 integración, 4 e2e y build; `pnpm audit --prod` no encontró vulnerabilidades; `rsc risk` clasificó el cambio HUD como tier 1; revisión independiente sin hallazgos significativos.
- blocker: T012 sigue pendiente por falta de prueba táctil física. La constitución requiere integrar mediante pull request; no se hará merge directo a `master` ni se declarará T012 completa.
- correction: la nota de T001 sobre ausencia de remoto describe el estado inicial; ahora existe `origin` apuntando a `https://github.com/P4T4/DrMarioClone.git`.
- next: completar T012 y luego publicar la rama y abrir el pull request hacia `master`.

## Sincronización local con master — 2026-11-11
- status: branch-synced; integración de la funcionalidad a `master` bloqueada.
- merge: `origin/master` (`f8c08aa`) se integró en `feat/duelo-privado-online` (`314b387`); el único conflicto fue `.gitignore` y se conservó la lista completa de exclusiones de la rama.
- verification: después de sincronizar, `pnpm verify` pasó formato, lint, tipos, 54 unitarias, 24 integración, 4 e2e y build. Una primera ejecución tuvo un fallo e2e transitorio antes de la pausa; la prueba aislada y la ejecución completa siguiente pasaron.
- blocker: T012 continúa pendiente por falta de validación táctil física; no se abrió ni se fusionó un pull request.
- next: completar T012, publicar la rama y abrir el pull request requerido por la constitución.

## Alcance del pull request — 2026-11-11
- user decision: omitir T012 y abrir ahora un pull request para revisión.
- status: T012 sigue pendiente; no se realizaron pruebas táctiles físicas ni se guardaron capturas persistentes o mediciones móviles.
- scope: esta instrucción permite abrir el pull request sin cerrar T012; no cambia los criterios aprobados ni convierte la validación móvil en evidencia completada.
- review: el riesgo global es tier 2 (`auth`, `default`, `docs`); la integración requiere aprobación humana.
- next: publicar la rama limpia y abrir el pull request con las pruebas, el riesgo y la limitación de T012 descritos.

## Remediación de la revisión de cierre — 2026-11-11
- status: correcciones implementadas; revisión final pendiente. T012 permanece pendiente por decisión del usuario y T013 no se marca completa.
- findings: 5 reportados → 5 únicos → 4 confirmados corregidos; el hallazgo de recuperación tras recargar la página fue refutado porque no forma parte del contrato aprobado.
- red: el cierre detectó falta de tablero Phaser visible, conteo HTML de alias incompatible con emoji, ausencia de prueba táctil y posible reutilización de un servidor e2e ajeno. Las pruebas de canvas y alias fallaron antes de sus correcciones. El flujo largo también falló 1/5 veces con un tablero aleatorio que terminó por bloqueo antes del chat.
- green: `pnpm exec playwright test tests/e2e/private-duel.spec.ts --grep 'two sessions create a private room|alias input accepts' --workers=1 --repeat-each=5` pasó 10 pruebas.
- fixes: Phaser renderiza ambos tableros y se conserva la cuadrícula ARIA; alias cuenta puntos de código y valida 20/21 emoji; Playwright comprueba canvas y movimiento táctil; el servidor e2e requiere una ruta de salud aleatoria y una semilla reproducible de prueba. El estado de desconexión espera hasta 10 s para cubrir los pings/reintentos del transporte.
- controls: `pnpm verify` ✅ formato ✅ lint ✅ tipos ✅ unitarias ✅ (54) integración ✅ (24) e2e ✅ (5) build ✅; `pnpm audit --prod` ✅ (sin vulnerabilidades conocidas). El build informa que un chunk supera 500 kB.
- traceability: AC4 y AC10 cuentan con pruebas de entradas/sincronización, canvas, toque y cuadrícula accesible. La validación física móvil y las capturas de T012 no se ejecutaron.
- risk: el cierre anterior clasificó la rama completa como tier 2 (`auth`, `default`, `docs`); requiere aprobación humana.
- next: completar la revisión final del diff, registrar la verificación con T012 explícitamente pendiente y abrir el PR para revisión sin fusionarlo.
