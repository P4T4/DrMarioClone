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
