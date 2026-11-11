# Decisiones de desarrollo

## 2026-11-10 — Base propuesta para DrMario

Contexto — El proyecto parte de un documento de visión y no tiene código ni stack detectado.

Opciones — Usar el stack recomendado completo; empezar con cliente y sumar servidor por fases; elegir otro stack.

Decisión — Se seleccionó el stack recomendado: Astro, TypeScript, Phaser 3, GSAP, Node.js, Colyseus y PostgreSQL. Se aceptaron los mínimos propuestos de calidad y el modo interactivo.

Por qué — Conserva el multijugador autoritativo requerido y permite construir el producto por fases. La constitución quedó pendiente de ratificación; pnpm y los presupuestos medibles de rendimiento se presentaron en ella.

## 2026-11-10 — Ratificación de la constitución

Contexto — La constitución inicial definió el stack, los mínimos de calidad y las reglas de revisión.

Opciones — Ratificar la propuesta o mantenerla en borrador para ajustar sus principios.

Decisión — Ratificar como v1.0.0 la constitución y la guía de revisión.

Por qué — La propuesta coincide con el stack recomendado y con los criterios de calidad aceptados.

## 2026-11-10 — Aclaración del contexto de la constitución

Contexto — La primera versión ratificada describía el stack como aún no fijado, aunque ya había quedado aprobado.

Opciones — Mantener el texto como registro histórico ambiguo o explicitar que describe el estado inicial.

Decisión — Aclarar el contexto y registrar el ajuste como v1.0.1, sin cambiar los principios.

Por qué — La historia del proyecto se conserva y el estado vigente queda claro.

## 2026-11-10 — Primer alcance del producto

Contexto — La visión reúne nueve fases, por lo que implementarlas como una sola entrega dificultaría validar el resultado.

Opciones — Núcleo individual primero; duelo online primero; especificar todo el producto en una sola entrega; no construir todavía.

Decisión — Empezar por un duelo privado online 1v1, con acceso invitado, ventana de reconexión de 30 segundos y chat de texto.

Por qué — El usuario priorizó el multijugador, que la visión identifica como requisito central. La cola pública, cuentas persistentes y modos individuales quedan fuera de esta primera especificación.

## 2026-11-11 — Continuación a planificación del duelo privado

Contexto — La spec de duelo privado estaba aclarada y el usuario indicó «continua con el siguiente paso» después de recibir el aviso de que la aprobación explícita era el bloqueo para planificar.

Decisión — Interpretar esa instrucción como autorización para continuar la fase de planificación con el alcance y las suposiciones registradas en la spec. Esta autorización no convierte las suposiciones de balance en hechos validados por pruebas de usuario.

Por qué — La petición fue continuar desde el gate de aprobación; detenerse de nuevo en el mismo gate no cumpliría esa instrucción. Las suposiciones se mantienen visibles para revisión antes de implementar.

## 2026-11-11 — Arquitectura del primer corte online

Contexto — El corte requiere juego competitivo con reglas deterministas, servidor autoritativo y acceso temporal sin cuentas.

Opciones — Simular el resultado en el cliente; duplicar el motor en cliente y servidor; ejecutar un único motor de reglas puro en servidor y renderizar el estado en cliente.

Decisión — Mantener un Game Core determinista sin dependencias de interfaz ni transporte, ejecutado por el servidor Colyseus como autoridad; el cliente envía intenciones y solo representa el estado recibido.

Por qué — Reduce divergencias entre jugadores, permite pruebas unitarias reproducibles y satisface la regla constitucional de que el servidor valida estado, puntuación, ataques y resultados.

## 2026-11-11 — Persistencia no añadida al duelo privado

Contexto — La visión menciona registrar resultados, mientras que la spec exige una pantalla final y excluye cuentas e historial de chat, pero no define retención durable de resultados.

Decisión — El plan mantiene el resultado en el estado efímero de la sala; no crea tablas PostgreSQL ni almacena chat o alias de forma duradera. El historial de resultados queda como decisión abierta antes de cualquier implementación de persistencia.

Por qué — No hay un requisito observable de historial en los criterios de aceptación y se limita la retención de datos invitados hasta que se aclare su necesidad.

## 2026-11-11 — Desglose del plan en tareas

Contexto — La respuesta a la solicitud de aprobación del borrador del plan no estuvo disponible; la instrucción vigente pide continuar y el modo de ejecución requiere elegir una opción pragmática.

Decisión — Autorizar la descomposición del plan en tareas verificables, sin interpretar esto como autorización para escribir código ni para resolver en silencio las decisiones abiertas. Se define Vitest para pruebas unitarias/de integración y Playwright para e2e en el scaffold.

Por qué — La lista de tareas y el gate de análisis permiten revisar cobertura y dependencias antes de implementar. El repositorio Git y el aislamiento de rama/worktree siguen siendo gates previos al código.

## 2026-11-11 — Supuestos explícitos para el control de cápsulas

Contexto — El análisis F-01 encontró que la spec pedía movimiento, rotación y caída, pero no definía transiciones que pudieran probarse de forma determinista.

Decisión — Para cerrar el hueco de cobertura se añadieron a la spec parámetros provisionales: spawn horizontal central con celdas reservadas; gravedad de una fila por segundo; caída rápida de una fila con límite de 100 ms; hard drop con fijación; pivote fijo en el segmento inicialmente izquierdo; rechazo sin mutación ante colisión o salida del tablero; sin wall-kick; bloqueo terminal si la siguiente cápsula no cabe.

Por qué — Los valores permiten escribir pruebas observables de las acciones ya solicitadas, sin añadir modos ni cambiar el alcance. Son supuestos, no preferencias confirmadas por el usuario; la cola de decisiones pide revisarlos después de la primera partida jugable.

## 2026-11-11 — Límites provisionales para invitado

Contexto — El análisis F-06 encontró que alias y código de sala no tenían límites comprobables para validar entradas.

Opciones — Dejar el formato abierto hasta implementar; aceptar texto amplio sin límites de tamaño; fijar límites acotados para un flujo invitado temporal.

Decisión — Alias de 1–20 puntos de código Unicode, recortado y sin caracteres de control. Código de ocho caracteres Crockford Base32; al unirse se recortan espacios externos y se normalizan letras ASCII a mayúsculas.

Por qué — Hace comprobable el contrato sin crear cuentas ni identidad persistente. Los límites son supuestos y se revisarán tras probar el flujo con usuarios.

## 2026-11-11 — Distinción visual mínima de piezas

Contexto — El análisis F-02 señaló que las tareas no comprobaban que los obstáculos se distinguieran de virus y cápsulas.

Opciones — Diferenciar solo por color; elegir marcas geométricas simples; posponer toda representación hasta el diseño visual.

Decisión — Obstáculos cuadrados con trama cruzada, virus redondos con marcas faciales y cápsulas como pares de segmentos alargados.

Por qué — Permite verificar que el tablero no comunica el tipo de pieza solo por color, sin fijar una dirección visual completa.

## 2026-11-11 — Omitir T012 en el pull request

Contexto — La validación física de accesibilidad táctil y rendimiento móvil de T012 no se ha realizado; el usuario pidió omitirla y abrir el pull request para revisar el cambio.

Decisión — Abrir el pull request sin incluir la validación física como evidencia. T012 permanece pendiente y no se presenta como completada; el pull request requiere revisión y aprobación humana antes de integrar.

Por qué — La revisión del código puede comenzar sin afirmar resultados que no se observaron. La falta de dispositivo y capturas persistentes queda explícita para los revisores.

## 2026-11-11 — Composición de los gates de scaffold

Contexto — F-05 y F-07 señalaron que la selección del runner y el contenido de `pnpm verify` no estaban alineados entre plan, tareas y config.

Opciones — Dejar los scripts para que los decida T001; seleccionar runners pero no fijar gates; fijar runners y una composición exacta del gate antes del scaffold.

Decisión — Usar Vitest para unitarias/integración y Playwright para e2e. `pnpm verify` ejecutará formato, lint, tipos, pruebas unitarias, integración, e2e y build, en ese orden.

Por qué — Cada tarea obtiene comandos comprobables y la constitución queda cubierta antes de integrar. T001 todavía debe crear y ejecutar esos scripts en el scaffold.

## 2026-11-11 — Duración de partida activa

Contexto — La spec pide mostrar duración, pero no define si cuenta la cuenta regresiva o una pausa por desconexión.

Opciones — Medir tiempo de pared desde que se crea la sala; medir desde el final de la cuenta regresiva; medir solo el tiempo de juego no pausado.

Decisión — `MatchResult.durationMs` cuenta desde el inicio oficial tras la cuenta regresiva y excluye pausas por desconexión.

Por qué — La estadística representa el tiempo de juego y se puede reproducir con el reloj de servidor controlado.

## 2026-11-11 — Versiones iniciales del scaffold (feature: duelo-privado-online, task: T001)

Contexto — La instalación inicial `@latest` resolvió Phaser 4, Astro 7 y TypeScript 7; el plan requiere Phaser 3. La primera versión de Astro 6 probada tenía un RCE crítico y otras vulnerabilidades en `pnpm audit`.

Opciones — Mantener Astro 6 pese a los avisos; usar Astro 7 corregido con Node compatible; aplazar el scaffold hasta que cambien las dependencias.

Decisión — Fijar Phaser 3.90.0, Astro 7.4.10 y TypeScript 6.0.2. Requerir Node `>=22.23.4` y fijar `esbuild@0.28.2` y `minimatch@11.0.7` con overrides; las versiones directas quedan exactas en `package.json` y `pnpm-lock.yaml`.

Por qué — Conserva Phaser 3 y TypeScript 6 compatibles con las herramientas, a la vez que elimina las vulnerabilidades reportadas en Astro, esbuild y minimatch con versiones que cumplen los requisitos del runtime.

## 2026-11-11 — Suites vacías durante el scaffold (feature: duelo-privado-online, task: T001)

Contexto — T001 materializa los runners antes de que T002–T011 añadan pruebas del juego.

Opciones — Fallar el gate hasta tener pruebas de producto; agregar pruebas ficticias; permitir temporalmente suites unitarias/de integración vacías y añadir una prueba e2e real del shell.

Decisión — Vitest usa `--passWithNoTests` en unitarias e integración hasta que sus tareas creen pruebas; Playwright verifica el shell real del sitio y no permite suites vacías. La primera vez se instala Chromium con `pnpm test:e2e:install`.

Por qué — El scaffold valida runners sin inventar comportamiento ni ocultar la falta de una prueba e2e.

## 2026-11-11 — Contrato de inicialización del tablero (feature: duelo-privado-online, task: T002)

Contexto — La interfaz aprobada nombra `ServerSeed`, `Difficulty` y `BoardState`, pero no fija sus representaciones ni el algoritmo determinista.

Opciones — Añadir una dependencia de aleatoriedad sembrada; aceptar un callback de RNG; usar un PRNG local con semilla de texto y una lista plana de celdas.

Decisión — `ServerSeed` es texto, `Difficulty` es un número transportado en el estado y las 128 celdas se guardan en orden por filas como una unión discriminada. El generador deriva un PRNG determinista de la semilla y elige posiciones únicas, excluyendo las dos celdas de spawn; la escala de dificultad no altera la distribución porque la spec no la define.

Por qué — Mantiene el Game Core independiente del entorno y las dependencias, permite reproducir tableros con la misma semilla y evita inventar reglas de dificultad fuera de la spec.

## 2026-11-11 — bug: Prettier en worktree de Windows (feature: duelo-privado-online, task: T002)

Repro — En Windows, `pnpm format:check` marcó todos los archivos del scaffold como no formateados después de abrir la rama en un worktree.

Causa — `core.autocrlf=true` convirtió los archivos del checkout a CRLF, mientras Prettier usaba LF por defecto; se confirmó que `src/pages/index.astro` tenía 15 CRLF y la salida formateada 15 LF.

Fix — Configurar `endOfLine: auto` para que Prettier respete los finales de línea del checkout; el gate de formato sirve como prueba de regresión.

Por qué se pasó por alto — La verificación de T001 se ejecutó antes de comprobar el scaffold en un checkout separado que aplicó la conversión de Git para Windows.

## 2026-11-11 — Inicio de partida y reloj del Game Core (feature: duelo-privado-online, task: T003)

Contexto — La interfaz de T003 recibe un `BoardState`, pero necesita un estado jugable con una primera cápsula y marcas temporales para aplicar controles deterministas.

Decisión — `GameCore.start(board, logicalTime)` crea la primera cápsula de forma reproducible a partir de la semilla del tablero y bloquea la partida si no cabe en el spawn. Cada `GravityTick` aceptado mueve como máximo una fila y reinicia el vencimiento a su `logicalTime`, evitando acumular ticks duplicados.

Por qué — La sala puede iniciar cada tablero sin que el cliente elija colores y el reloj lógico mantiene una transición por tick, aun si el servidor procesa una entrada tarde.

## 2026-11-11 — Conservar el vínculo de cápsulas fijadas (feature: duelo-privado-online, task: T003)

Contexto — La revisión tier 1 detectó que la gravedad por columna podía separar dos segmentos todavía conectados, aunque la spec solo permite que caigan de forma independiente los segmentos desconectados.

Decisión — Cada segmento fijado conserva un `capsuleId`; la gravedad mueve el par vinculado como una unidad. Si una coincidencia elimina uno de sus segmentos, el restante queda solo y puede caer de forma independiente.

Por qué — Preserva la geometría de una cápsula intacta y aplica la caída independiente únicamente después de romperse la conexión.

## 2026-11-11 — Puntuación y entrega de obstáculos (feature: duelo-privado-online, task: T004)

Contexto — La spec fija los puntos de ataque, el límite por resolución y el momento de entrega, pero no define una puntuación separada, la celda de llegada ni cómo una coincidencia elimina obstáculos.

Opciones — Mantener solo el contador de ataques; definir `score` como puntos acumulados de ataque; introducir una puntuación independiente. Para el tablero, dejar la llegada abstracta, elegir una columna aleatoria o usar una colocación determinista.

Decisión — `score` acumula los mismos puntos que alimentan ataques: un punto por virus y uno por cadena posterior a la primera. El Game Core conserva por separado puntos sobrantes, obstáculos salientes y obstáculos entrantes; al fijar una cápsula entrega como máximo un obstáculo entrante en la primera celda libre recorriendo filas desde abajo y columnas de izquierda a derecha. Una coincidencia elimina los obstáculos ortogonalmente adyacentes a sus celdas emparejadas.

Por qué — La puntuación queda alineada con la única fórmula cuantificada por la spec. Las decisiones de tablero son reproducibles y no añaden una fuente aleatoria distinta; ambas quedan como supuestos para revisar tras una partida jugable.

## 2026-11-11 — Validar acumulados de T004 (feature: duelo-privado-online, task: T004)

Contexto — La revisión tier 1 encontró que varios contadores individualmente seguros podían desbordarse al acumularlos.

Decisión — Validar como enteros seguros no negativos los acumulados de virus, cadenas, puntos, puntuación y obstáculos; ante desbordamiento se lanza `RangeError` antes de devolver un estado nuevo.

Por qué — El estado de partida no debe exponer estadísticas con precisión perdida, incluso si una llamada interna recibe una colección de eventos excesiva.

## 2026-11-11 — Validación del resultado final (feature: duelo-privado-online, task: T005)

Contexto — El contrato de T005 no define qué hacer si se solicita un resultado sin condiciones terminales, con estadísticas inválidas o con una duración no finita.

Opciones — Propagar los datos sin validar; devolver un resultado de respaldo; o rechazar los argumentos inválidos explícitamente.

Decisión — `GameCore.resolveResult` lanza `RangeError` si ambos jugadores siguen activos, si la duración es negativa/no finita o si algún contador estadístico no es un entero seguro no negativo. El resultado copia las estadísticas en el orden de entrada para conservar una instantánea final.

Por qué — Un resultado siempre representa una partida terminada y no debe ocultar datos inválidos ni depender de mutaciones posteriores de las estadísticas recibidas.

## 2026-11-11 — Comprobación automática de accesibilidad (feature: duelo-privado-online, task: T006)

Contexto — La estructura semántica y el contraste de la página requieren una comprobación en navegador, además de las pruebas unitarias de mapeo de controles y textos.

Opciones — Revisar solo a mano; probar elementos concretos con Playwright; o ejecutar una auditoría automatizada WCAG junto con comprobaciones de teclado.

Decisión — Añadir `@axe-core/playwright@4.11.3` como dependencia de desarrollo y ejecutar la página con las etiquetas WCAG 2.0 A/AA y 2.2 AA. El SVG de cada pieza es decorativo y se acompaña de una descripción textual visible.

Por qué — La auditoría captura fallos detectables por máquina; la prueba de teclado verifica además que el enlace para saltar al contenido reciba foco.

## 2026-11-11 — Rechazar alias inválidos al unirse (feature: duelo-privado-online, task: T007)

Contexto — La spec exige validar el alias temporal en todos los flujos; el contrato inicial de `RoomService.join` no incluía `InvalidAlias`, aunque `RoomFailure` y la interfaz ya distinguen ese error.

Opciones — Tratar un alias inválido como código inválido; confiar en validación del cliente; o ampliar el resultado de `join` con `InvalidAlias`.

Decisión — `RoomService.join(code, alias)` devuelve `InvalidAlias` cuando el alias no cumple los límites y el plan T007 incluye esa alternativa.

Por qué — La validación del servidor debe ser autoritativa y el mensaje debe identificar el campo incorrecto, no culpar al código de sala.

## 2026-11-11 — Validar controles antes de recortar alias (feature: duelo-privado-online, task: T007)

Contexto — La revisión encontró que `trim()` eliminaba tabulaciones y saltos de línea en los extremos antes de comprobar los caracteres de control.

Opciones — Validar solo el alias recortado; o rechazar controles en la entrada original y después recortar los espacios permitidos.

Decisión — Rechazar cualquier carácter Unicode de categoría `Cc` antes de recortar y contar puntos de código.

Por qué — La spec prohíbe controles en el alias; normalizarlos primero habría permitido entradas que el contrato debe rechazar.

## 2026-11-11 — Contrato de entradas autoritativas (feature: duelo-privado-online, task: T008)

Contexto — El contrato T008 no identificaba la sala para una entrada, no precisaba las reglas de secuencia ni separaba las acciones de jugador del tick de gravedad; tampoco definía cómo se conectaban las pausas de T010 con la duración.

Opciones — Confiar en un tiempo/estado del cliente; aceptar ticks junto con acciones del jugador; o identificar la sala, validar secuencias en servidor y reservar el reloj y los ticks al servidor.

Decisión — Usar el código normalizado como `RoomId`; aceptar asientos 0/1 y secuencias enteras positivas estrictamente crecientes (se permiten saltos); rechazar `GravityTick` desde entradas de jugador y aplicar los ticks mediante `advance` a ambos tableros en una actualización. La sala crea ambos tableros al terminar el countdown con semillas generadas por el servidor y dificultad común; las semillas no salen en los snapshots. Los finales se derivan del estado oficial o de desconexiones observadas por el servidor. Las primitivas `pause`/`resume` conservan el tiempo activo para que T010 integre la reconexión.

Por qué — La autoridad de estado y reloj permanece en servidor; los mensajes repetidos, malformados o con tiempos manipulados no alteran la partida, los clientes no pueden predecir la secuencia futura de cápsulas y el contrato deja explícito el punto de integración de reconexión.

## 2026-11-11 — Alcance del servicio de chat efímero (feature: duelo-privado-online, task: T009)

Contexto — La spec fija un máximo de 200 caracteres, un envío por segundo, silencio local e inexistencia de historial al terminar, pero no define si el servicio debe almacenar mensajes ni cómo contar Unicode.

Opciones — No conservar mensajes; mantener historial en memoria durante la sala; o persistirlo. Para longitud, contar unidades UTF-16 o puntos de código.

Decisión — Cada sala tiene un `ChatService` en memoria: conserva mensajes solo durante la partida y los vacía al finalizar. Acepta texto no vacío de hasta 200 puntos de código Unicode, rechaza caracteres `Cc`, mide el límite por asiento con reloj lógico de servidor y devuelve el mensaje con ambos destinatarios. El silencio permanece en la presentación local.

Por qué — La sala necesita entregar texto efímero sin historial durable; los puntos de código evitan que emojis válidos cuenten como dos unidades y mantener el silencio en el cliente evita alterar lo recibido por el rival.

## 2026-11-11 — Credenciales temporales de reconexión (feature: duelo-privado-online, task: T010)

Contexto — La reconexión requiere demostrar que la persona vuelve al mismo asiento sin cuentas ni credenciales duraderas, y el token no debe salir en snapshots públicos.

Opciones — Guardar el token opaco en memoria; guardar solo su hash; o usar un token firmado autosuficiente.

Decisión — Generar un token aleatorio de 256 bits por asiento, devolverlo solo al crear/unirse, guardar su SHA-256 y compararlo con `timingSafeEqual`. Los snapshots públicos no incluyen tokens.

Por qué — El servidor valida el acceso al asiento sin conservar la credencial en texto claro ni añadir dependencias. La entrega de la pausa a ambas sesiones se comprobará en T011, que integra el transporte y la interfaz.

## 2026-11-11 — Primera caída jugable (feature: duelo-privado-online, task: T011)

Repro — `pnpm exec playwright test tests/e2e/private-duel.spec.ts --grep "two sessions create" --workers=1 --repeat-each=5` falló en 3 de 5 repeticiones. Los snapshots mostraban un `MatchResult` por tablero bloqueado al segundo 1.

Causa — La generación solo reservaba las dos celdas de spawn. Un virus podía ocupar una de las dos celdas inmediatamente inferiores, haciendo que la primera caída fijara la cápsula sobre el spawn y bloqueara la siguiente.

Decisión — Reservar también toda la fila inmediatamente inferior en el tablero inicial; no restringir el resto de la distribución de virus.

Por qué — La primera cápsula puede hacer un movimiento lateral válido antes de caer sin bloquear el siguiente spawn; se conserva la cantidad de virus y la distribución del resto del tablero. Pruebas con semillas fijas cubren el descenso central y lateral.

## 2026-11-11 — Cierre de revisión de T011

Contexto — La revisión tier 1 detectó estadísticas finales ausentes, falta de acción para salir después del resultado y una prueba e2e que no observaba el tablero rival.

Decisión — Mostrar puntuación, virus eliminados y cadenas de ambos jugadores; añadir `Volver al inicio`; y comprobar en dos navegadores que un estado modificado por una entrada aceptada coincide en ambos tableros.

Por qué — La pantalla final y el flujo de dos sesiones deben cumplir el contrato observable de la spec; `pnpm verify` y la repetición e2e confirmaron los cambios.
