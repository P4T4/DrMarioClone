---
type: plan
title: Plan — Duelo privado online
description: Diseño estructural del duelo privado: componentes, contratos, flujo y pruebas.
tags: [sdd, plan, game, multiplayer]
timestamp: 2026-11-11T05:06:39Z
topic: sdd
slug: duelo-privado-online
status: approved
---

# Plan — Duelo privado online

> Spec: [../specs/duelo-privado-online.md](../specs/duelo-privado-online.md) · Constitución: [../constitution.md](../constitution.md) · Estado: aprobado para desglosar tareas
> Última actualización: 2026-11-11 · Actualización: criterios de entrada, representación visual, errores, reconexión y gates para resolver F-02–F-08.

## 0. Restricciones globales

- **Stack:** «El cliente usará TypeScript, Astro como aplicación web, Phaser 3 para el juego y GSAP para animaciones de interfaz. El servidor usará Node.js LTS y Colyseus; PostgreSQL guardará los datos persistentes. Las versiones se fijarán en los manifiestos y el lockfile.»
- **Gestor de paquetes:** «pnpm será el gestor de paquetes para mantener un único lockfile en el workspace. Redis no se añadirá hasta que una necesidad de escalado lo justifique.»
- **Reglas:** «Las reglas del juego se mantendrán separadas del renderizado y podrán probarse de forma determinista.»
- **Calidad:** «Antes de integrar cambios deben pasar formato, lint, comprobación de tipos, pruebas afectadas y build. Las reglas de juego nuevas seguirán TDD: prueba fallida, implementación mínima y refactor con pruebas verdes.»
- **Autoridad:** «El servidor será la autoridad para validar acciones, estado, puntuación, ataques y resultados. El cliente enviará intenciones de entrada, no cambios de estado confiables.»
- **Mensajes:** «Los límites entre módulos y mensajes de red serán tipados y validados. Los mensajes inválidos o excesivos se rechazarán sin alterar la partida.»
- **Alias y código de sala:** alias de 1–20 puntos de código Unicode, recortado y sin caracteres de control; código de ocho caracteres Crockford Base32, recortado y normalizado a mayúsculas al unirse.
- **Privacidad y secretos:** «No se incluirán secretos en el repositorio. Los datos personales se limitarán a lo necesario para las funciones aprobadas.»
- **Accesibilidad:** «La interfaz será usable con teclado y controles táctiles; los elementos de interfaz cumplirán WCAG 2.2 AA. La jugabilidad no dependerá solo del color.»
- **Rendimiento:** «Las pruebas de rendimiento definirán dispositivo de referencia, escena y duración. El objetivo es sostener al menos 60 FPS en escritorio y 30 FPS en móvil en esos dispositivos.»
- **Originalidad:** «No se usarán personajes, marcas, arte, música ni sonidos protegidos de Dr. Mario o Nintendo. Los recursos del juego serán originales o tendrán licencia compatible documentada.»
- **Tablero:** «La partida usa un tablero de 8×16, cápsulas de dos segmentos en rojo, azul y amarillo».
- **Inicio:** «Cada tablero empieza con 15 virus, cinco de cada color y la misma dificultad».
- **Coincidencias:** se eliminan grupos de cuatro o más elementos iguales en horizontal o vertical; la gravedad y las cadenas se resuelven antes de continuar.
- **Control de cápsulas:** aparecen horizontalmente en las dos celdas superiores centrales, reservadas libres; gravedad de una fila por segundo; cada entrada de caída rápida baja una fila y se limita a una cada 100 ms; hard drop fija en la posición más baja. El segmento inicialmente izquierdo es el pivote fijo de giro; sin wall-kick; movimientos/giros inválidos se rechazan sin mutación.
- **Ataques:** un virus eliminado da un punto; cada cadena posterior a la primera añade uno; cuatro puntos generan un obstáculo, con máximo de tres por resolución y puntos sobrantes conservados. Llegan de uno en uno al fijarse la siguiente cápsula.
- **Sala y comienzo:** código válido por cinco minutos mientras espera al segundo jugador; máximo dos jugadores; cuenta regresiva sincronizada de tres segundos.
- **Chat:** hasta 200 caracteres por mensaje y máximo uno por jugador por segundo; solo se transmite en la sala activa y se puede silenciar al rival.
- **Reconexión:** la partida se pausa y se conserva durante 30 segundos; al expirar, gana el rival por desconexión.
- **Estado de pausa:** ambos asientos reciben el estado pausado y el reloj lógico/tableros no avanzan hasta reanudar o terminar.
- **Duración:** `MatchResult.durationMs` cuenta desde el fin de la cuenta regresiva hasta el resultado, excluyendo pausas por desconexión.
- **Controles:** escritorio: flechas izquierda/derecha/abajo, flecha arriba o X para rotar, Z para rotar en sentido contrario, espacio para caída instantánea. Móvil: controles táctiles.
- **Distinción visual:** obstáculo cuadrado con trama cruzada; virus redondo con marcas faciales; cápsula como par de segmentos alargados. La forma y el patrón complementan el color.
- **Ramas:** los cambios se integrarán mediante pull request; no se harán pushes directos al branch por defecto. El workspace actual no tiene un repositorio Git detectado; resolverlo antes de implementar.
- **Alcance:** no añadir matchmaking público, cuentas, perfiles, rankings, torneos, otros modos, espectadores, voz, archivos, moderación avanzada ni persistencia del chat.

## 1. Contexto y restricciones

- Los criterios 1–3 fijan sala privada, inicio sincronizado y estado inicial equivalente ([spec §Acceptance #1–3](../specs/duelo-privado-online.md)).
- Los criterios 4–6 fijan reglas deterministas, autoridad del servidor, puntuación y ataques ([spec §Acceptance #4–6](../specs/duelo-privado-online.md)).
- Los criterios 7–9 fijan chat efímero, reconexión y resolución inequívoca ([spec §Acceptance #7–9](../specs/duelo-privado-online.md)).
- El criterio 10 fija teclado, táctil, comunicación no basada solo en color y WCAG 2.2 AA ([spec §Acceptance #10](../specs/duelo-privado-online.md)).
- Los criterios 11–12 fijan los límites de alias/código y la recuperación observable de errores y desconexiones ([spec §Acceptance #11–12](../specs/duelo-privado-online.md)).
- Se conserva el stack ratificado y la prohibición de secretos y recursos protegidos ([constitución §§1, 3, 5](../constitution.md)).
- No hay comportamiento existente que preservar, ni manifiesto, código, runner o comandos de prueba registrados ([spec §What it must respect; config `testing`](../specs/duelo-privado-online.md)).
- Cola pública, cuentas, perfiles, persistencia del chat y despliegue público son fuera de alcance ([spec §Non-goals](../specs/duelo-privado-online.md)).

## 2. Arquitectura

```text
[Navegador: Astro + UI accesible] --intenciones / estado de sala--> [Servidor Node.js + Colyseus]
             |                                                       |         |
             v                                                       v         v
       [Phaser renderer] <------ estado visualizable -------- [Game Core] [Room State]
                                                                   |
                                                                   v
                                                        [Clock + RNG del servidor]

[PostgreSQL] — sin uso en este corte: no hay requisito de datos duraderos aprobado.
```

- **Interfaz Astro** (interno) — administra alias, creación/unión de sala, estados de espera/desconexión/resultado y controles accesibles.
- **Renderizador Phaser** (interno) — presenta los tableros y anima cambios recibidos; no decide reglas ni resultados.
- **Representación de piezas** (interno) — distingue obstáculos cuadrados con trama cruzada, virus redondos con marcas faciales y cápsulas como pares alargados; la forma/patrón complementa el color.
- **Game Core** (interno) — transforma estado y entradas válidas en estado y eventos de juego de forma pura y determinista; no depende del navegador ni de la red.
- **Servidor Node.js/Colyseus** (interno) — controla salas, conexiones, temporizadores, validación de entradas, reglas, puntuaciones, ataques y resultado oficial.
- **Room State** (interno) — mantiene el estado sincronizado y efímero de ambos jugadores, sus tableros, estadísticas, conexiones, cuenta regresiva y resultado.
- **PostgreSQL** (externo) — no participa en este corte porque la spec no pide historial durable ni cuentas; no crear tablas preventivamente. La decisión de retención del resultado queda abierta en §7.
- **Navegadores de ambos jugadores** (externo) — envían intenciones; consumen el mismo estado oficial filtrado para la sala.

**Decisión arquitectónica principal:** toda simulación que pueda cambiar el resultado corre en el servidor; el cliente solo envía entradas y representa el estado. Se elige frente a una simulación confiable en cliente porque la constitución exige autoridad del servidor y validación de mensajes, y el duelo debe ser justo. El núcleo de reglas será independiente del transporte para mantener pruebas deterministas.

## 3. Interfaces y contratos

```text
RoomService.create(alias: GuestAlias) -> WaitingRoom | InvalidAlias | CapacityUnavailable
  - crea una sala privada de dos plazas con expiración de espera de cinco minutos
  - devuelve el código solo a la persona creadora; no admite una tercera conexión
  - GuestAlias tiene 1–20 puntos de código Unicode tras recortar espacios externos y rechaza caracteres de control
  - RoomCode usa ocho caracteres de `0123456789ABCDEFGHJKMNPQRSTVWXYZ`; join recorta espacios externos y normaliza letras ASCII a mayúsculas

RoomService.join(code: RoomCode, alias: GuestAlias) -> JoinedRoom | InvalidCode | Expired | Full
  - valida el formato del código y el alias; no modifica ninguna sala si la validación falla
  - distingue código inválido, expirado y sala llena para que la interfaz dé una salida accionable
  - al entrar la segunda persona, fija ambas plazas e inicia la cuenta regresiva sincronizada

RoomService.reconnect(roomId: RoomId, seatToken: SeatToken) -> Reconnected | Expired | InvalidToken
  - reanuda el mismo estado antes de 30 segundos; después, el rival gana por desconexión
  - token de asiento opaco, temporal y validado en servidor

GameCore.resolve(state: GameState, input: GameInput, logicalTime: LogicalTime)
  -> GameTransition | RejectedInput
  - GameInput = MoveLeft | MoveRight | SoftDrop | HardDrop | RotateClockwise |
    RotateCounterclockwise | GravityTick
  - función determinista; una entrada rechazada no produce mutaciones ni eventos
  - mueve una columna por entrada; SoftDrop baja una fila, con máximo una aceptada cada 100 ms
  - HardDrop baja hasta la posición válida más baja y fija la cápsula
  - GravityTick baja una fila cada segundo; si el descenso está bloqueado, fija la cápsula
  - el pivote es el segmento inicialmente izquierdo; una rotación solo se acepta si la nueva celda cabe
  - no hay wall-kick; movimiento/rotación fuera del tablero o hacia una celda ocupada se rechaza
  - al fijar, resuelve coincidencias, eliminación, caída de segmentos separados y cadenas hasta estabilizar
  - puntúa y calcula obstáculos según los valores fijados en la spec

GameCore.initialize(seed: ServerSeed, difficulty: Difficulty)
  -> BoardState
  - genera quince virus, cinco por color; los dos tableros usan la misma dificultad
  - conserva libres las dos celdas superiores centrales para la cápsula inicial
  - la semilla y el tablero oficial no se aceptan desde el cliente

RoomService.submitInput(seat: SeatId, sequence: InputSequence, input: GameInput)
  -> AcceptedState | RejectedInput
  - valida sala, turno/estado, secuencia y dominio; solo el servidor aplica la entrada
  - publica el estado oficial y los eventos relevantes a ambos clientes

ChatService.send(seat: SeatId, text: ChatText, logicalTime: LogicalTime)
  -> Delivered | InvalidText | RateLimited | NotInRoom
  - máximo 200 caracteres y un mensaje por jugador por segundo
  - mensajes solo a los dos asientos de la sala; no se guardan tras finalizarla

RoomService.finish(roomId: RoomId, terminalEvents: GameEvents)
  -> MatchResult
  - resuelve victoria, derrota, bloqueo, desconexión o empate simultáneo en el servidor
  - resultado contiene las estadísticas presentadas en pantalla y no permite edición del cliente

GameCore.resolveResult(outcomes: [TerminalOutcome, TerminalOutcome], stats: [PlayerStats, PlayerStats], durationMs: number)
  -> MatchResult
  - TerminalOutcome = Active | AllVirusesCleared | BoardBlocked | Disconnected
  - PlayerStats = { score: number, virusesCleared: number, chains: number }
  - MatchResult = { winnerIndex: 0 | 1 | null, reason: AllVirusesCleared | BoardBlocked | Disconnected | SimultaneousTerminal, stats: [PlayerStats, PlayerStats], durationMs: number }
  - dos resultados terminales en la misma resolución producen `winnerIndex: null` y `reason: SimultaneousTerminal`
  - `durationMs` usa el reloj oficial desde que termina la cuenta regresiva y excluye pausas por desconexión
```

Los contratos de red usan mensajes tipados y validación en los límites. Los rechazos incluyen un motivo estable para que la interfaz pueda mostrar un error y ofrecer reintento o salida; nunca degradan a una respuesta exitosa ni dejan el estado parcialmente modificado.

## 4. Modelo y flujo de datos

**Entidades**

- **Room** — identificador interno, código, estado del ciclo de vida, plazas ocupadas, expiración de espera, cuenta regresiva y hora de inicio.
- **Seat** — identificador de plaza, alias temporal, token opaco de reconexión, conexión actual y plazo de reconexión.
- **PlayerGameState** — tablero 8×16, cápsula activa/siguiente, segmento pivote estable, instante del último descenso rápido, nivel de dificultad, puntuación, virus restantes, ataques acumulados y número de cadenas.
- **BoardCell** — vacía, virus, obstáculo o segmento de cápsula; incluye color y vínculo/orientación cuando corresponda.
- **GameEvent** — eliminación, caída, cadena, obstáculo enviado/recibido, bloqueo o condición terminal; se deriva solo de la transición oficial.
- **ChatMessage** — texto y asiento emisor, efímero y disponible solo durante la vida de la sala.
- **MatchResult** — ganador/empate/desconexión, puntuaciones, virus eliminados, cadenas y duración; visible al finalizar mientras la sala conserve el resultado.

**Flujo principal** (crear sala, jugar y terminar)

1. La interfaz valida presencia de alias y envía la intención de crear una sala.
2. El servidor reserva una plaza, genera código y token de asiento y devuelve el estado de espera con la expiración.
3. El segundo navegador envía código y alias; el servidor valida vigencia y capacidad y reserva la segunda plaza.
4. El servidor inicializa dos tableros con igual dificultad y composición, genera estado inicial autoritativo y emite la cuenta regresiva de tres segundos.
5. Cada cliente envía entradas de control; el servidor valida y aplica cada una mediante Game Core y difunde el estado oficial y los eventos a ambos.
6. El servidor calcula puntuación y ataques, agrega obstáculos al tablero contrario conforme a la regla de la spec y determina condiciones terminales.
7. El servidor acepta chat dentro de sus límites, y la interfaz de cada persona puede ocultar localmente los mensajes del rival.
8. Ante desconexión, el servidor conserva la sala y pausa el juego; una reconexión válida antes del plazo reanuda el estado. Al expirar el plazo, el servidor finaliza la partida.
9. Al terminar, el servidor fija MatchResult; ambos clientes muestran el resultado y estadísticas y pueden volver a la sala.

- **Consistencia:** cambios de tablero, estadísticas, ataques y detección de victoria se resuelven como una sola transición serializada por sala. La cuenta regresiva y el reloj de reconexión usan tiempo del servidor. La animación puede retrasarse en el cliente, pero nunca retrasa ni altera la regla oficial.
- **Persistencia y migraciones:** no se propone esquema ni migración PostgreSQL en este corte. Estado de partida y chat son efímeros; cualquier necesidad de historial durable requiere aclarar retención, datos guardados y criterio de acceso antes de añadir almacenamiento.

## 5. Estrategia de pruebas

| Criterio de aceptación | Nivel | Afirmaciones | Fakes / dobles |
| --- | --- | --- | --- |
| #1: crear/unirse con código, límite de dos plazas | integración de sala | unión dentro de cinco minutos ocupa la segunda plaza; alias y códigos válidos/inválidos respetan los límites fijados; códigos inválidos/expirados y tercer jugador no modifican la sala | reloj controlable; transporte WebSocket local |
| #2: inicio sincronizado | integración de sala | ambos reciben los mismos hitos de cuenta regresiva y la partida no inicia antes de tres segundos | reloj de servidor controlable |
| #3: tableros iniciales | unitario | 15 virus por tablero, cinco por color y mismo nivel de dificultad; semillas hacen reproducible cada caso | semilla fija |
| #4: controles de cápsula, coincidencias y gravedad | unitario | movimiento de una columna; caída cronometrada de 1 s; caída rápida de una fila con límite de 100 ms; hard drop y fijación; rotación CW/CCW alrededor del pivote fijo sin wall-kick; colisiones/límites rechazan sin mutación; coincidencias, caída independiente de segmentos separados y cadenas | estado de tablero construido y reloj lógico controlado; ningún Phaser, navegador ni red |
| #5: autoridad y entradas inválidas | contrato + integración | snapshots coinciden con el estado calculado por servidor; entradas inválidas no cambian tablero, puntuación, ataque ni resultado | cliente hostil simulado; estado de sala real |
| #6: puntos y obstáculos | unitario + integración + revisión visual | puntos por virus/cadena, umbral de cuatro, máximo de tres por resolución, sobrantes, entrega al fijar cápsula y eliminación normal; obstáculo cuadrado con trama cruzada distinto de virus/cápsula sin depender del color | estado inicial controlado; captura del tablero con cada tipo de pieza |
| #7: chat | contrato + integración | mensaje de hasta 200 caracteres llega a ambos; exceso de longitud/frecuencia se rechaza; silenciar oculta localmente; historial no aparece al terminar | reloj de servidor controlable; dos clientes locales |
| #8: reconexión | integración + e2e | ambos clientes muestran pausa y el estado/reloj lógico se congelan; reanuda el mismo estado antes de 30 segundos; al vencer, rival gana por desconexión y no se acepta reconexión tardía | reloj de servidor controlable; desconexión de transporte simulada |
| #9: resultado | unitario + integración | eliminar virus, bloquear rival, desconexión y final simultáneo producen el resultado especificado; ambos clientes ven las mismas estadísticas | estados terminales construidos; dos clientes locales |
| #10: controles, accesibilidad y rendimiento | unitario + e2e + revisión manual | mapeo exacto de teclado/táctil; estado no depende solo del color; auditoría WCAG 2.2 AA; formas/patrones de piezas distinguibles; objetivo de 60 FPS escritorio/30 FPS móvil en dispositivos documentados | navegador real para e2e; dispositivo táctil real para checklist y medición |

- La frontera e2e cubre el flujo de dos navegadores desde crear sala hasta resultado, errores de código/sala con acción de recuperación, pausa visible por desconexión y controles básicos. Las combinaciones exhaustivas de reglas permanecen como pruebas unitarias deterministas.
- Deben ser reales en las pruebas que los usan: Room/estado de servidor, transporte de dos sesiones en las pruebas de integración, navegador en e2e y dispositivo de referencia en rendimiento. El reloj y el generador aleatorio se controlan para que las pruebas no dependan del tiempo o azar del host.
- La planificación elige Vitest para unitarias/integración y Playwright para e2e; la stack skill define fixtures, configuración y mecánicas de uso durante el scaffold. `pnpm verify` ejecutará, en orden, `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test:unit`, `pnpm test:integration`, `pnpm test:e2e` y `pnpm build`.
- Guardar como evidencia los resultados automatizados, el checklist manual y las capturas requeridas por la spec. Los comandos quedan descritos aquí y en la config SDD; T001 los materializa como scripts del scaffold.

## 6. Secuencia y dependencias

1. **Preparar la base ejecutable** — identificar o crear el repositorio Git correcto; acordar rama/worktree; establecer el paquete pnpm, límites cliente/servidor/núcleo, runner y comandos de formato, lint, tipos, pruebas y build. — depende de: ninguna — serial.
2. **Definir contratos compartidos y Game Core** — modelar tablero, entradas tipadas de cápsula, eventos, generador reproducible, resolución, gravedad, cadenas, puntuación, ataques y resultados; aplicar TDD, incluyendo colisiones y reloj lógico. — depende de: #1 — serial.
3. **Construir estructura de interfaz y renderizado** — sala, estados de conexión, tablero propio/rival, controles de teclado/táctiles y presentación accesible con datos de fixture, sin lógica autoritativa. — depende de: #1 — paralelizable con #2 una vez fijados tipos de intercambio mínimos.
4. **Implementar salas y autoridad de servidor** — crear/unirse, códigos, límites, countdown, reloj, entradas validadas, sincronización, chat, reconexión y ciclo de resultado. — depende de: #2 — serial.
5. **Conectar interfaz al protocolo real** — reemplazar fixtures por sesiones de sala, renderizar estado/eventos y presentar errores, desconexiones y resultados. — depende de: #3 y #4 — serial.
6. **Probar el flujo integrado y accesibilidad** — pruebas de dos sesiones, WCAG, teclado/táctil y medidas de rendimiento con dispositivos/escena/duración documentados. — depende de: #5 — serial.
7. **Cerrar evidencia y gates** — ejecutar formato, lint, tipos, pruebas afectadas y build; adjuntar capturas/checklist; revisar seguridad y originalidad antes del PR. — depende de: #6 — serial.

- **Candidatos paralelos:** #2 Game Core y #3 estructura de interfaz, después de que #1 fije los tipos compartidos mínimos; no comparten archivos de implementación.
- **Orden estricto:** #4 depende del contrato determinista de #2; #5 integra los extremos #3 y #4; #6 y #7 requieren el flujo integrado.
- **Rollback:** el trabajo permanece aislado en rama/worktree y entra por PR. Sin migraciones de datos en este corte, revertir el PR retira la función sin restauración de datos. No implementar directamente sobre el branch por defecto.

## 7. Riesgos y decisiones abiertas

**Riesgos** (priorizados)

| Riesgo | Disparador | Impacto | Mitigación / prueba |
| --- | --- | --- | --- |
| El workspace no es un repositorio Git | Inicio de tareas de código | No se puede cumplir rama/worktree ni PR; alto riesgo de mezclar cambios | Identificar el repositorio correcto o inicializar uno con autorización antes de escribir código; no simular aislamiento |
| No hay runner ni comandos | Primer cambio de código | No se puede demostrar TDD ni Definition of Done | Resolver en el scaffold; comando `verify` y gates deben existir antes de la primera regla de juego |
| Diferencia de latencia o relojes cliente | Partidas reales | Desincronización visual o ventaja por orden/timing | Servidor como única autoridad; clientes interpolan/renderizan; integración de dos sesiones y pruebas con reloj controlado |
| Generación aleatoria de tableros desigual | Inicio de partidas | Ventaja percibida pese a igual dificultad declarada | Usar mismo perfil de dificultad y cantidad/color; conservar semilla del servidor para reproducir fallos; revisar variedad con pruebas de distribución antes de balancear |
| Acciones o chat malformados/excesivos | Cliente alterado o envío rápido | Estado corrupto, spam o consumo de recursos | Validación tipada y límites en servidor; pruebas de contrato con entradas inválidas y límites |
| Reglas de obstáculos y cadenas producen ritmo desbalanceado | Pruebas de juego | Partidas injustas o demasiado cortas/largas | Mantener valores fijados por spec como constantes testeadas; registrar métricas de partida y no ajustar cifras sin una nueva decisión de producto |
| Diseño móvil no cabe con dos tableros, controles y chat | Validación en teléfono | Juego ilegible o controles inaccesibles | Validar la composición móvil aprobada en dispositivo real antes del gate final; mantener el tablero propio como foco |

**Decisiones abiertas**

- **Retención de resultados:** la visión original menciona registro del resultado, pero la spec exige mostrarlo y no define historial durable. Este plan conserva el resultado solo mientras exista la sala y no escribe en PostgreSQL. Antes de implementar persistencia, decidir si se requiere historial, por cuánto tiempo y qué campos puede guardar.
- **Formato/validación de alias y código:** resuelto provisionalmente en la spec; alias de 1–20 puntos de código Unicode sin controles y código de ocho caracteres Crockford Base32 con recorte/normalización al unir. Revisar la usabilidad tras la primera partida.
- **Ritmo y rotación de cápsulas:** la spec fija valores iniciales de una fila por segundo y una repetición de caída rápida cada 100 ms, con pivote estable y sin wall-kick. Son supuestos de balance y deben revisarse tras la primera partida jugable; cambiarlos requiere actualizar spec y pruebas.
- **Dispositivo de referencia de rendimiento:** debe elegirse y registrarse antes de la medición del criterio #10, incluyendo navegador, escena, resolución y duración.

## Tasks
<!-- generated by tasks on 2026-11-11; IDs are stable, do not renumber -->

La planificación elige Vitest para pruebas unitarias/de integración y Playwright para e2e; la stack skill define fixtures, configuración y mecánicas de uso durante el scaffold. T001 fija versiones y scripts: `format:check`, `lint`, `typecheck`, `test:unit`, `test:integration`, `test:e2e`, `build` y `verify`. `pnpm verify` ejecuta esos siete checks, en ese orden, antes de terminar. Cada regla nueva se implementa en TDD: registrar la prueba fallida antes del cambio y dejar evidencia de que pasa después.

| ID | [P] | Tarea | Done-check | Depends-on | Trace | Risk |
| --- | --- | --- | --- | --- | --- | --- |
| T001 |  | Preparar el scaffold aislado | Observación: `git rev-parse --show-toplevel` apunta al repositorio correcto y `git status --short --branch` confirma una rama/worktree de trabajo. `pnpm install --frozen-lockfile`, `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test:unit`, `pnpm test:integration`, `pnpm test:e2e` y `pnpm build` terminan con código 0. `pnpm verify` ejecuta esos siete checks en ese orden y termina con código 0. | — | AC1–AC12 | 1 |
| T002 |  | Crear tipos y generador inicial del tablero | La prueba `pnpm test:unit -- tests/game/core/board-initialization.test.ts` verifica 15 virus, cinco por color, dificultad común, repetibilidad con semilla fija y spawn central libre; registrar el fallo previo a implementación y resultado verde. | T001 | AC3, AC4 | 1 |
| T003 |  | Implementar entradas de cápsula, coincidencias y gravedad | `pnpm test:unit -- tests/game/core/capsule-controls.test.ts tests/game/core/matches-and-gravity.test.ts` pasa movimiento, giro CW/CCW alrededor del pivote, caída automática con reloj lógico, caída rápida y rate limit, hard drop, fijación, colisiones en bordes/celdas ocupadas y spawn bloqueado; además pasa coincidencias, caída independiente y cadenas. Rechazos mantienen el estado idéntico. Registrar prueba roja antes de implementar y resultado verde. | T002 | AC4, AC9, AC10 | 1 |
| T004 |  | Calcular puntuación y ataques | `pnpm test:unit -- tests/game/core/attacks.test.ts` pasa los valores fijados: virus, cadenas, umbral, límite por resolución, sobrantes, entrega y eliminación de obstáculos; registrar red → green. | T003 | AC6 | 1 |
| T005 |  | Resolver resultados terminales | `pnpm test:unit -- tests/game/core/match-result.test.ts` pasa `GameCore.resolveResult` para victoria por virus, bloqueo, desconexión, empate simultáneo, `winnerIndex` correcto y estadísticas exactas (puntuación, virus eliminados, cadenas y duración recibida); registrar red → green. | T003, T004 | AC9 | 1 |
| T006 |  | Construir la estructura accesible de interfaz | `pnpm test:unit -- tests/ui/controls-and-accessibility.test.ts` pasa mapeo izquierda/derecha/abajo/arriba-X/Z/espacio a `GameInput`, otras teclas a `null` y acciones táctiles equivalentes; prueba errores de sala con mensaje y acción de corregir/reintentar o salir; comprueba estado no dependiente solo del color y distintivos semánticos de tipos de pieza. | T001, T002, T003 | AC1, AC2, AC10, AC12 | 1 |
| T007 |  | Implementar ciclo de sala e inicio sincronizado | `pnpm test:integration -- tests/server/rooms/room-lifecycle.test.ts` pasa alias vacío, >20 puntos de código y caracteres de control rechazados; alias válido tras recortar espacios; código de ocho caracteres Crockford Base32 acepta minúsculas/espacios externos tras normalizar y rechaza longitud/alfabeto inválidos; además creación/unión, expiración, sala llena, tercer jugador y cuenta regresiva de tres segundos con reloj controlado. | T001, T002 | AC1, AC2, AC3, AC11, AC12 | 1 |
| T008 |  | Validar entradas y sincronizar estado oficial | `pnpm test:integration -- tests/server/rooms/authoritative-game.test.ts` prueba entradas válidas, entradas inválidas sin mutación, estado visible compartido, aplicación del Game Core, ataques y publicación de `MatchResult` idéntico para ambos asientos; el reloj oficial excluye countdown y pausas del `durationMs`; registrar red → green para las nuevas reglas integradas. | T003, T004, T005, T007 | AC4, AC5, AC6, AC9 | 1 |
| T009 |  | Implementar chat efímero | `pnpm test:integration -- tests/server/chat/chat.test.ts` pasa longitud y frecuencia límite, entrega solo a ambos asientos, silencio local y ausencia de historial al finalizar. | T007 | AC7 | 1 |
| T010 |  | Implementar reconexión de partida | `pnpm test:integration -- tests/server/reconnect/reconnect.test.ts` pasa pausa visible para ambos asientos, reloj lógico y tablero congelados durante la ventana, reanudación del mismo estado antes de 30 segundos, derrota al expirar y rechazo de reconexión tardía, usando reloj controlado. | T007, T008 | AC8 | 1 |
| T011 |  | Conectar interfaz al protocolo de sala | `pnpm test:e2e -- tests/e2e/private-duel.spec.ts` completa con dos sesiones el flujo crear/unir, errores de código inválido/caducado/sala llena con acción de recuperación, inicio, controles, actualización rival, chat, estado pausado visible con cuenta regresiva y acción de reconectar/salir, reanudación y resultado; no usa fixtures para estado autoritativo. | T006, T007, T008, T009, T010 | AC1–AC12 | 1 |
| T012 |  | Validar accesibilidad y rendimiento en dispositivos | Observación: checklist WCAG 2.2 AA y teclado/táctil completado; comprobar en capturas que obstáculos (cuadrado/trama), virus (redondo/marcas faciales) y cápsulas (segmentos alargados) se distinguen sin depender del color; guardar capturas de sala, partida y resultado en escritorio/móvil y registrar dispositivo, navegador, resolución, escena, duración y FPS frente a 60/30 FPS. | T011 | AC6, AC10 | 1 |
| T013 |  | Cerrar gates y evidencia de entrega | `pnpm verify` termina con código 0 después de ejecutar formato, lint, tipos, pruebas unitarias, integración, e2e y build; existen resultados de pruebas, checklist manual y capturas; el diff está listo para revisión en PR y no contiene secretos ni recursos sin licencia documentada. | T012 | AC1–AC12 | 1 |

### Interfaces por tarea

**T002 — Interfaces**
- Produce: `GameCore.initialize(seed: ServerSeed, difficulty: Difficulty) -> BoardState`.
- `BoardState` expone las 128 celdas, 15 virus (cinco por color), dificultad y estado reproducible; el cliente no aporta semilla.

**T003 — Interfaces**
- Consume: `BoardState` de T002.
- Produce: `GameCore.resolve(state: GameState, input: GameInput, logicalTime: LogicalTime) -> GameTransition | RejectedInput`.
- `GameInput = MoveLeft | MoveRight | SoftDrop | HardDrop | RotateClockwise | RotateCounterclockwise | GravityTick`.
- `GameTransition` entrega el nuevo estado y eventos de cápsula movida, rotada, fijada o bloqueada; una entrada inválida conserva el estado exacto. Al fijar, resuelve coincidencias, eliminación, caída independiente y cadenas.

**T004 — Interfaces**
- Consume: resultado estabilizado y eventos de T003.
- Produce: puntuación, contador de ataques y obstáculos pendientes; cuatro puntos generan un obstáculo, máximo tres por resolución y sobrantes conservados.

**T005 — Interfaces**
- Consume: `TerminalOutcome = Active | AllVirusesCleared | BoardBlocked | Disconnected` para cada jugador y `PlayerStats = { score: number, virusesCleared: number, chains: number }` de T003/T004.
- Consume: `outcomes` y `stats` usan el mismo orden estable para los dos jugadores; `durationMs` viene del reloj oficial de sala.
- Produce: `GameCore.resolveResult(outcomes: [TerminalOutcome, TerminalOutcome], stats: [PlayerStats, PlayerStats], durationMs: number) -> MatchResult`.
- `MatchResult = { winnerIndex: 0 | 1 | null, reason: AllVirusesCleared | BoardBlocked | Disconnected | SimultaneousTerminal, stats: [PlayerStats, PlayerStats], durationMs: number }`; dos estados terminales simultáneos producen empate (`winnerIndex: null`, `reason: SimultaneousTerminal`). `durationMs` excluye cuenta regresiva y pausas.

**T006 — Interfaces**
- Consume: `GameInput = MoveLeft | MoveRight | SoftDrop | HardDrop | RotateClockwise | RotateCounterclockwise | GravityTick` de T003.
- `NoInput = null`.
- `TouchAction = MoveLeft | MoveRight | SoftDrop | HardDrop | RotateClockwise | RotateCounterclockwise`.
- Produce: `mapKeyboard(key: string) -> GameInput | null` y `mapTouch(action: TouchAction) -> GameInput`; flechas izquierda/derecha/abajo, arriba o X, Z y espacio conservan el mapeo exacto de la spec y otras teclas producen `null`.
- `RoomFailure = InvalidAlias | InvalidCode | Expired | Full | CapacityUnavailable | Disconnected`; `RecoveryAction = CorrectInput | Retry | Reconnect | Leave`.
- Produce: `presentRoomFailure(reason: RoomFailure) -> { message: string, actions: RecoveryAction[] }`; la UI presenta formas/patrones de pieza previstos sin depender solo del color.

**T007 / T008 — Interfaces**
- Consume: `GameCore.initialize(seed, difficulty)` y `GameCore.resolve(state, input, logicalTime)` con los contratos de movimiento y resolución de T003.
- T008 consume además `GameCore.resolveResult(outcomes, stats, durationMs) -> MatchResult` de T005; mapea `winnerIndex` al asiento de sala correspondiente.
- Produce: `RoomService.create(alias) -> WaitingRoom | InvalidAlias | CapacityUnavailable`; `RoomService.join(code, alias) -> JoinedRoom | InvalidCode | Expired | Full`; `RoomService.submitInput(seat, sequence, input) -> AcceptedState | RejectedInput`.
- T008 produce: `RoomService.finish(roomId: RoomId, terminalEvents: GameEvents) -> MatchResult`; convierte eventos de sala a resultados terminales, calcula el tiempo de juego activo y publica la misma salida oficial a ambos asientos.
- Alias: 1–20 puntos de código Unicode después de recortar espacios externos; rechaza vacío y caracteres de control. Código: ocho caracteres Crockford Base32; `join` recorta espacios externos y convierte letras ASCII a mayúsculas antes de validar.
- La sala tiene dos plazas, expira a cinco minutos mientras espera, inicia al segundo jugador con cuenta regresiva de tres segundos y el servidor es la única autoridad del estado.

**T009 — Interfaces**
- Produce: `ChatService.send(seat, text, logicalTime) -> Delivered | InvalidText | RateLimited | NotInRoom`.
- El mensaje se valida y entrega únicamente a los dos asientos de la sala; el silenciamiento solo cambia la presentación local.

**T010 — Interfaces**
- Produce: `RoomService.reconnect(roomId, seatToken) -> Reconnected | Expired | InvalidToken`.
- Produce: `ConnectionView = Connected | Paused | Reconnecting | Finished`.
- Conserva el mismo estado y congela reloj lógico/tableros durante 30 segundos; ambos asientos reciben `Paused`; una reconexión válida vuelve a `Connected` y reanuda el mismo estado.

**T011 — Interfaces**
- Consume: mensajes tipados de sala, estado oficial y eventos definidos por T007–T010.
- Produce: presentación sincronizada del estado, mensajes de error accionables y flujo e2e de dos sesiones hasta MatchResult.

## Review Workload Forecast

| Dimensión | Estimación | Motivo |
| --- | --- | --- |
| Líneas modificadas | 600–1.000 | scaffold, reglas puras, sala autoritativa, UI, pruebas unitarias/integración/e2e y evidencia |
| Archivos / áreas | 20–35 archivos; configuración, `src/game`, `src/server`, `src/pages`, `src/components`, `tests`, `docs/evidence` | cruza cliente, servidor, motor y pruebas |
| Riesgo | máximo tier 1; 0 tareas tier 2 según `npx @ericrisco/rsc@4.1.1 risk` sobre las rutas previstas | pronóstico inicial por rutas; `implement` recalcula sobre cada diff real |
| Entrega sugerida | `ask-on-risk`, en cambios revisables por límite de arquitectura | coincide con `delivery_strategy` del config y supera el presupuesto de 400 líneas/12 archivos si se entrega como un único diff |

La ejecución de código sigue bloqueada hasta confirmar el repositorio Git y aislar el trabajo en una rama/worktree. El historial durable de resultados y los parámetros de simulación siguen siendo decisiones que no deben ampliarse silenciosamente.
