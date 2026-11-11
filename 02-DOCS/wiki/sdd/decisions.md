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
