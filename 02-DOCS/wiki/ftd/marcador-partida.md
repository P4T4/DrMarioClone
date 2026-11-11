---
author: P4t4
branch: feat/duelo-privado-online
status: in-progress
---
# Marcador de partida

## Intent

Completar la información de juego que falta en el HUD del duelo. La spec aprobada pide mostrar virus restantes y ataques; su referencia también incluye tiempo y próxima cápsula.

## Scope

Incluir una vista autoritativa de tiempo activo, próxima cápsula, virus restantes, carga de ataque y obstáculos pendientes para ambos tableros. La vista previa se calcula en el servidor sin enviar la semilla. No cambiar reglas, balance, protocolo de entrada ni la validación física móvil pendiente de T012.

## Checklist

- [x] Publicar los colores de la próxima cápsula sin exponer semillas; una prueba los compara con la cápsula que aparece después.
- [x] Mostrar y probar para ambos asientos los virus restantes, la carga de ataque y los obstáculos pendientes del snapshot oficial.
- [x] Mostrar el reloj activo sincronizado desde tiempo oficial e identificar su comportamiento al pausar y reanudar.
- [x] Completar `pnpm verify`, revisar el diff y registrar evidencias.

## Evidence

- RED: la prueba unitaria de vista previa recibió `null` en vez de los colores de la siguiente cápsula; la integración falló al faltar el reloj; el e2e detectó que el HUD no mostraba los virus restantes.
- GREEN: 54 pruebas unitarias, 24 de integración y 4 e2e pasaron; e2e comprueba las métricas de ambos asientos y que el reloj avanza y se congela durante una pausa.
- `pnpm verify` pasó formato, lint, tipos, pruebas y build. `pnpm audit --prod` no encontró vulnerabilidades conocidas.
- `npx @ericrisco/rsc risk --base HEAD --json`: tier 1 (`default`, `docs`).
- Revisión directa del diff: la primera versión incluía la próxima cápsula de ambos jugadores en el snapshot compartido. Se cambió a un mensaje privado por asiento; el snapshot común no contiene la vista previa ni la semilla.

## Next

Continuar con la siguiente funcionalidad aprobada. T012 permanece pendiente: esta entrega no sustituye la validación física móvil solicitada en el plan.
