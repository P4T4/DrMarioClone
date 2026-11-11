---
type: spec
title: Spec — Duelo privado online
description: Qué ofrece la primera partida competitiva online y cómo se valida.
tags: [sdd, spec, game, multiplayer]
timestamp: 2026-11-11T04:31:00Z
topic: sdd
slug: duelo-privado-online
status: approved
---

# Spec — Duelo privado online

> Slug: `duelo-privado-online` · Estado: aprobada para planificación; las suposiciones siguen visibles para revisar antes de implementar · Creada: 2026-11-10
> Hereda: [constitución](../constitution.md)

## Problem & why / Problema y motivo

El documento considera el multijugador una función central, pero hoy no existe una partida que dos personas puedan jugar online. Sin un duelo funcional no se puede validar la sincronización, la justicia de las partidas ni la experiencia de competir. Aunque se recomendó empezar por el núcleo individual, la primera entrega prioriza el duelo online porque la visión del producto lo identifica como su requisito central.

## Cost of not building it / Coste de no construirlo

No habrá una experiencia jugable que demuestre el requisito central del documento. Tampoco se podrá probar si la sincronización y la competencia resultan atractivas. No hay evidencia de usuarios, fechas límite ni ingresos asociados; por eso no se atribuye un coste comercial adicional.

## The cheapest alternative / La alternativa más barata

Un prototipo local de un jugador permitiría probar las reglas del tablero con menos alcance. No comprobaría la sincronización, la reconexión, el envío de obstáculos ni la interacción entre dos jugadores, que son el motivo elegido para empezar por el duelo online.

## Goals / Objetivos

- Dos personas pueden iniciar un duelo privado sin crear cuentas.
- Cada jugador controla su tablero y puede ver el progreso del rival.
- Las reglas de cápsulas, eliminaciones, gravedad y ataques producen un ganador y un resultado comprensible.
- Ambos jugadores pueden intercambiar mensajes de texto durante la partida.
- Una desconexión breve no elimina una partida que aún puede reanudarse; una ausencia prolongada termina con un resultado claro.

## Non-goals / out of scope

- Cola pública, matchmaking automático, cuentas persistentes, perfiles, rankings y torneos.
- Modos entrenamiento y supervivencia, y juego contra bots.
- Espectadores, voz, archivos adjuntos y chat persistente después de la partida.
- Filtros automáticos de contenido y flujo de reportes de chat.
- Despliegue público y herramientas avanzadas de moderación.
- Arte, música y sonidos finales de producción. Se usarán elementos visuales originales mínimos para que el juego sea legible y no se confunda con un producto protegido.

## Users & context

Dos personas quieren jugar una partida competitiva casual desde navegadores modernos. Una crea una sala privada y comparte el código; la otra lo introduce para unirse. Ambas participan como invitadas, con alias temporales, desde escritorio o un dispositivo con pantalla táctil.

## What the user can do

- Elegir un alias temporal de 1–20 puntos de código Unicode y crear una sala privada para dos personas.
- Compartir el código de sala y unirse con él desde otro navegador.
- Ver quién está conectado y comenzar juntos tras una cuenta regresiva.
- Mover y rotar cápsulas, acelerar su caída o dejarlas caer de inmediato. Una pulsación izquierda/derecha desplaza una columna; abajo las hace bajar una fila; arriba o X las rota en sentido horario; Z las rota en sentido antihorario; espacio las deja caer hasta la posición válida más baja y las fija. En móvil se usan controles táctiles equivalentes.
- Ver el tablero rival, enviar obstáculos según las eliminaciones y escribir mensajes durante la partida.
- Volver a una partida interrumpida durante la ventana de 30 segundos y consultar el resultado final.

## What result they get

Esta referencia de pantallas fue aprobada por el usuario y define los datos y estados que deben estar presentes. No fija la dirección visual final.

```text
SALA PRIVADA
[Tu alias]  [Crear sala]  [Código de sala: ____] [Unirse]
Estado: esperando a 1 jugador · código visible para compartir

PARTIDA (escritorio)
[Rival: tablero 8×16] [Conexión · tiempo · ataques] [Tu tablero 8×16]
                         [Próxima cápsula · puntuación · virus restantes]
[Chat de la sala]                                      [Controles]

PARTIDA (móvil)
[Estado del rival + tablero reducido]
[Tu tablero como elemento principal]
[Próxima cápsula · puntuación · controles táctiles · chat]

RESULTADO
[Ganador / derrota / desconexión]
[Puntuación y virus eliminados de ambos · cadenas · duración]
[Volver a la sala]
```

Los errores de código inválido, sala llena o desconexión muestran un mensaje claro y una acción para reintentar o salir. La interfaz incluye todos los datos anteriores en escritorio y móvil.

## What it must respect

- El servidor decide el estado oficial, las puntuaciones, los ataques y el resultado; los datos enviados por el cliente no se aceptan como verdad.
- La partida usa un tablero de 8×16, cápsulas de dos segmentos en rojo, azul y amarillo, eliminaciones de cuatro o más, gravedad, cadenas y obstáculos según las reglas de la visión.
- El alias se recorta en los extremos, admite de 1 a 20 puntos de código Unicode y no contiene caracteres de control. El código de sala tiene ocho caracteres del alfabeto Crockford Base32 (`0123456789ABCDEFGHJKMNPQRSTVWXYZ`); al unirse se recortan espacios externos y se normalizan letras ASCII a mayúsculas.
- Cada cápsula nueva aparece horizontalmente en las dos celdas superiores centrales, que se reservan libres al generar el tablero inicial. La caída automática avanza una fila cada segundo; cada entrada de caída rápida avanza una fila y las repetidas se aceptan como máximo una vez cada 100 ms.
- Las cápsulas no pueden atravesar los límites del tablero ni ocupar celdas ocupadas. Cada movimiento o rotación que saldría del tablero o colisionaría con una celda ocupada se rechaza sin cambiar el estado. La rotación usa como pivote fijo el segmento que estaba a la izquierda al aparecer la cápsula y no aplica desplazamientos correctivos de pared.
- Una cápsula se fija cuando su siguiente caída está bloqueada. Tras una eliminación, los segmentos de cápsula desconectados caen de forma independiente. Si una cápsula no cabe en su posición inicial, ese tablero queda bloqueado y el rival gana.
- Solo hay dos jugadores invitados en una sala privada; no se exige una cuenta ni se ofrece cola pública en esta entrega.
- La reconexión dura 30 segundos. El chat es de texto y está limitado a la sala.
- Los controles funcionan con teclado y táctil; la información no depende solo del color y la interfaz respeta WCAG 2.2 AA.
- Todo arte, nombre y sonido será original o tendrá licencia compatible.
- No existe comportamiento implementado que deba conservarse.

## How it proves it

- Pruebas automáticas verifican las reglas de cápsulas, coincidencias, gravedad, cadenas, puntuación, ataques y victoria o derrota.
- Pruebas de dos sesiones verifican crear y unirse a una sala, cuenta regresiva, sincronización, chat, mensajes inválidos y reconexión antes y después de 30 segundos.
- Una comprobación manual en dos dispositivos valida el flujo completo y la interacción táctil.
- Se conservan resultados de pruebas, checklist manual y capturas de la sala, partida y resultado en escritorio y móvil.
- Aún no existe runner ni infraestructura de pruebas. El plan elige Vitest y Playwright; T001 debe materializarlos y crear los scripts y comandos de verificación.

## Behaviour

- Sala: quien crea una sala recibe un código válido durante cinco minutos mientras espera al segundo jugador. La segunda persona entra con ese código; si es inválido, expiró o la sala está ocupada, recibe un mensaje claro y puede reintentar. Al entrar el segundo jugador, ambos ven una cuenta regresiva sincronizada de tres segundos.
- Partida: cada persona controla su tablero y ve el progreso rival. Al alinear cuatro o más piezas del mismo color en horizontal o vertical, se eliminan; las piezas suspendidas caen y pueden producir cadenas. Las eliminaciones alimentan la puntuación y los ataques.
- Controles: las entradas válidas mueven una columna o rotan una posición; los límites y otras piezas bloquean el movimiento. La caída automática es de una fila por segundo; abajo baja una fila por entrada, con repetición del servidor limitada a una cada 100 ms. La caída instantánea fija la cápsula en la posición más baja disponible. La cápsula aparece horizontal en el centro superior; la rotación pivota sobre el segmento inicialmente izquierdo, que permanece como pivote, y se rechaza si su nueva posición colisiona o sale del tablero. Los segmentos desconectados caen por separado; no hay desplazamiento correctivo de pared.
- Bloqueo: si no hay dos celdas libres para la siguiente cápsula en la posición inicial, el tablero queda bloqueado y el rival gana.
- Inicio: cada tablero empieza con 15 virus, cinco de cada color y la misma dificultad; sus posiciones pueden diferir.
- Ataques: cada virus eliminado da un punto de ataque y cada cadena posterior a la primera suma otro. Cada cuatro puntos envían un obstáculo, hasta tres por resolución; los puntos sobrantes se conservan. Los obstáculos llegan de uno en uno al fijarse la siguiente cápsula, tienen una silueta cuadrada con trama cruzada y se eliminan con las coincidencias habituales. Los virus son redondos con marcas faciales y las cápsulas son pares de segmentos alargados.
- Chat: los mensajes de texto se ven en la sala actual; no se permiten archivos. Cada jugador puede enviar como máximo un mensaje de 200 caracteres por segundo. Puede silenciar los mensajes futuros del rival. El historial deja de estar disponible al finalizar la partida.
- Desconexión: la partida se pausa, ambos ven el estado pausado y el reloj lógico de juego deja de avanzar. Si la persona vuelve antes de 30 segundos, la partida continúa desde el estado conservado; si no, el rival gana por desconexión.
- Fin: eliminar todos los virus o bloquear el tablero rival termina la partida. Si ambos tableros alcanzan una condición terminal en la misma resolución, el resultado es empate. Ambos ven ganador, puntuaciones, virus eliminados, cadenas y duración, y pueden volver a la sala. La duración usa el reloj oficial desde que termina la cuenta regresiva; excluye el tiempo de cuenta regresiva y las pausas por desconexión.
- Errores: un código inválido, caducado o una sala ocupada no altera otra partida; la interfaz distingue el motivo y ofrece corregir/reintentar o salir. Una acción de juego inválida no cambia el estado oficial.

## Acceptance criteria

1. Dada una sala privada abierta, cuando un segundo invitado introduce su código dentro de cinco minutos, ambos aparecen conectados; una tercera persona no puede entrar.
2. Cuando el segundo jugador entra, ambos reciben una cuenta regresiva de tres segundos y la partida comienza para los dos al terminarla.
3. Cada tablero comienza con 15 virus, cinco por color y la misma dificultad para ambos jugadores; las dos celdas superiores centrales de spawn están libres.
4. En una partida, las cápsulas aparecen horizontalmente en el centro superior y caen una fila por segundo; izquierda/derecha mueve una columna, abajo una fila por entrada (máximo una por cada 100 ms), espacio las fija en la posición más baja disponible y arriba/X o Z las rota alrededor de su pivote fijo (el segmento inicialmente izquierdo). Una acción que colisiona o sale del tablero no cambia el estado. Cuatro o más piezas iguales alineadas se eliminan; los segmentos suspendidos o desconectados caen y las nuevas alineaciones se resuelven antes de continuar. Si la siguiente cápsula no cabe, gana el rival por bloqueo.
5. Cada jugador ve el mismo estado oficial de puntuación, virus restantes y ataques que el servidor reconoce; una acción inválida no cambia ese estado.
6. Cada virus eliminado genera un punto de ataque y cada cadena posterior a la primera añade uno; cada cuatro puntos envían un obstáculo, hasta tres por resolución, con puntos sobrantes conservados. Los obstáculos llegan de uno en uno al fijarse la siguiente cápsula, se eliminan con coincidencias habituales y tienen una silueta cuadrada con trama cruzada; los virus son redondos con marcas faciales y las cápsulas son pares de segmentos alargados.
7. Un mensaje de chat de hasta 200 caracteres llega a ambos jugadores; cada persona puede enviar como máximo uno por segundo, puede silenciar al rival y no vuelve a ver el historial tras terminar la partida.
8. Al desconectarse alguien, ambos ven el estado pausado y el tablero/reloj lógico no avanza. Si vuelve antes de 30 segundos, el mismo estado se reanuda; si no vuelve, el rival gana por desconexión.
9. Si ambos tableros alcanzan una condición terminal en la misma resolución, la partida termina en empate; en otro caso gana quien elimina todos los virus o provoca que el tablero rival se bloquee. Ambos reciben las mismas estadísticas finales; la duración se cuenta desde el inicio oficial y excluye cuenta regresiva y pausas.
10. Los controles de teclado y táctiles permiten jugar; el estado no se comunica solo por color y la interfaz supera una comprobación WCAG 2.2 AA.
11. Un alias vacío, con caracteres de control o de más de 20 puntos de código se rechaza; uno válido tiene de 1 a 20 puntos de código Unicode tras recortar espacios externos. Al unirse, el código se recorta y se normaliza a mayúsculas; se acepta solo si tiene ocho caracteres del alfabeto Crockford Base32.
12. Para código inválido, código caducado o sala llena, la persona ve un mensaje que distingue el motivo y puede corregir/reintentar o salir; un rechazo no cambia el estado de ninguna sala. Si pierde la conexión, ve el plazo restante y puede reconectar antes de 30 segundos o salir.

## Points to clarify

- **suposición tomada** — Cada tablero empieza con 15 virus, cinco por color, la misma dificultad y posiciones independientes. *Base:* 15 se divide por igual entre los tres colores y el tablero tiene 8×16; la igualdad inicial reduce ventajas no relacionadas con la habilidad. *Riesgo:* el ritmo puede resultar demasiado rápido o lento y requerir balance.
- **suposición tomada** — Cada virus eliminado suma un punto de ataque; cada cadena posterior a la primera suma uno; cuatro puntos envían un obstáculo, hasta tres por resolución, con sobrantes conservados. Llegan de uno en uno al fijarse una cápsula y pueden eliminarse en coincidencias habituales. *Base:* el documento pide ataques ligados a virus, combinaciones y cadenas que aparezcan progresivamente. *Riesgo:* la frecuencia y presión pueden desbalancear el duelo.
- **suposición tomada** — La cuenta regresiva dura tres segundos y un código de sala sin segundo jugador caduca a los cinco minutos. *Base:* permite un comienzo perceptiblemente sincronizado y evita salas abandonadas indefinidamente. *Riesgo:* el plazo puede ser corto para invitar a otra persona.
- **suposición tomada** — Si ambas condiciones terminales ocurren en la misma resolución, el resultado es empate. *Base:* evita favorecer un orden de procesamiento invisible para los jugadores. *Riesgo:* algunos jugadores podrían preferir desempatar por puntuación.
- **suposición tomada** — La duración final se mide con el reloj oficial desde que termina la cuenta regresiva y excluye las pausas por desconexión. *Base:* representa el tiempo de juego activo y evita que las esperas técnicas alteren la estadística. *Riesgo:* los jugadores podrían esperar que duración incluya todo el tiempo de pared.
- **suposición tomada** — El chat se limita a 200 caracteres por mensaje y uno por segundo; cada jugador puede silenciar al rival. No incluye filtros automáticos ni sistema de reportes. *Base:* sala privada de dos invitados, texto efímero y alcance acotado. *Riesgo:* el control de abuso es limitado; si se amplía el público o el chat, se necesitarán más protecciones.
- **suposición tomada** — Los alias son temporales y solo necesitan distinguir a los dos jugadores de una sala. *Base:* se eligió acceso invitado sin cuentas. *Riesgo:* si se requieren nombres únicos o persistentes, cambia el flujo de identidad.
- **suposición tomada** — Un alias contiene de 1 a 20 puntos de código Unicode tras recortar espacios externos y no puede contener caracteres de control. Los códigos tienen ocho caracteres Crockford Base32; al introducirlos se recortan espacios externos y se convierten letras ASCII a mayúsculas. *Base:* se necesitan límites verificables para el protocolo de invitado sin añadir identidad persistente. *Riesgo:* un alias de 20 puntos de código puede representar menos de 20 caracteres percibidos en algunos alfabetos; validar con usuarios antes de ampliar el formato.
- **suposición tomada** — Los obstáculos usan silueta cuadrada con trama cruzada, los virus una forma redonda con marcas faciales y las cápsulas pares de segmentos alargados. *Base:* hace reconocibles las piezas sin depender del color, como pide la accesibilidad de la spec. *Riesgo:* la dirección visual puede ajustarse después de una prueba de legibilidad.
- **suposición tomada** — El chat no se conserva después de terminar la partida. *Base:* se aprobó que el historial no quede disponible y el alcance excluye chat persistente. *Riesgo:* los jugadores no podrán recuperar mensajes para resolver disputas.
- **suposición tomada** — Las cápsulas aparecen en horizontal en las dos celdas superiores centrales, reservadas libres al iniciar; la caída automática es una fila por segundo; cada entrada abajo baja una fila y se limita a una cada 100 ms; la caída instantánea baja hasta el punto más bajo y fija la cápsula. El segmento inicialmente izquierdo permanece como pivote de rotación; no hay wall-kick y una rotación/movimiento que colisiona o sale del tablero se rechaza sin mutación. Si una cápsula no cabe al aparecer, ese jugador pierde por bloqueo; los segmentos desconectados caen independientemente. *Base:* convierte los controles pedidos en transiciones observables y mantiene iguales las condiciones de partida. *Riesgo:* el ritmo inicial puede requerir ajuste tras probar una partida completa.
- **decisión diferida** — Cola pública, cuentas, perfiles, rankings, torneos, entrenamiento, supervivencia, espectadores y despliegue público.

## Clarifications

### 2026-11-10

- Pregunta sobre tablero inicial → se propusieron como suposición 15 virus por tablero, cinco por color y condiciones equivalentes → 15 se divide por igual entre los tres colores; el valor puede revisarse tras probar el ritmo.
- Pregunta sobre ataques → se propuso como suposición la regla de puntos y llegada descrita arriba → ofrece una regla sencilla y verificable; requiere balance posterior.
- Pregunta sobre cuenta regresiva y caducidad de sala → se propusieron tres segundos y cinco minutos → limita la espera y evita salas abandonadas sin crear un flujo adicional.
- Pregunta sobre finales simultáneos → se propuso empate → evita que el orden interno decida el resultado.
- Pregunta sobre moderación de chat → se propusieron longitud y frecuencia acotadas, silenciar y sin reportes → el alcance sigue siendo privado y de dos personas.
- Las suposiciones sobre alias temporales y ausencia de historial de chat se validaron con las respuestas previas del usuario; se mantienen.
- Cola pública, cuentas, rankings, otros modos, espectadores y despliegue público se dejaron diferidos.

### 2026-11-11

- Continuación a planificación → tras recibir el aviso de que la aprobación era el paso previo, el usuario indicó «continua con el siguiente paso» → se interpreta como autorización para elaborar el plan con este alcance; las suposiciones de balance siguen identificadas y no se presentan como validadas por pruebas de usuario.
- Control de cápsulas (hallazgo F-01 del análisis) → se propusieron supuestos explícitos para posición inicial, caída, repetición, giro, colisión, fijación y bloqueo de salida → permiten probar el ciclo jugable sin depender de un cliente ni del orden de eventos; los parámetros de ritmo quedan marcados para revisión después de probar.
- Límites de alias/código (F-06) → se fijaron límites provisionales de alias (1–20 puntos de código, sin controles) y códigos de ocho caracteres Crockford Base32, con recorte/normalización al unir → hacen validable el contrato invitado sin persistir identidad; revisar accesibilidad y facilidad de uso tras la primera partida.
- Distinción visual de obstáculos (F-02) → se fijaron siluetas y patrones diferentes para obstáculos, virus y cápsulas → evita depender solo del color y hace observable el criterio visual.
- Duración de partida → se definió como tiempo de juego activo desde el inicio oficial, excluyendo cuenta regresiva y pausas por desconexión → permite un resultado reproducible con reloj de servidor y pruebas controladas.

> Las propuestas de balance, control, límites de entrada y representación visual se registraron como suposiciones porque no hubo una respuesta específica a esos parámetros. Deben revisarse con evidencia de uso antes de cerrar el balance y la presentación.
