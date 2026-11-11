---
type: constitution
title: DrMario — Constitution
description: Reglas no negociables ratificadas para las fases de desarrollo.
tags: [sdd, constitution]
timestamp: 2026-11-11T04:31:00Z
topic: sdd
version: v1.0.1
---

# DrMario — Constitución

> Versión: v1.0.1 · Ratificada: 2026-11-10 · Última modificación: 2026-11-10.
> Las reglas guiarán las fases posteriores.

## Contexto conocido

- Objetivo: juego web competitivo de puzles, con identidad visual original.
- Flujo aceptado: trabajo por fases y revisión interactiva.
- El branch por defecto está cerrado; se requiere trabajar con ramas y pull requests.
- Al inicio no había código ni manifiestos; el stack quedó fijado al ratificar esta constitución.

## 1. Stack

1. El cliente usará TypeScript, Astro como aplicación web, Phaser 3 para el juego y GSAP para animaciones de interfaz. El servidor usará Node.js LTS y Colyseus; PostgreSQL guardará los datos persistentes. Las versiones se fijarán en los manifiestos y el lockfile.
2. pnpm será el gestor de paquetes para mantener un único lockfile en el workspace. Redis no se añadirá hasta que una necesidad de escalado lo justifique.

## 2. Calidad

3. Las reglas del juego se mantendrán separadas del renderizado y podrán probarse de forma determinista.
4. Antes de integrar cambios deben pasar formato, lint, comprobación de tipos, pruebas afectadas y build. Las reglas de juego nuevas seguirán TDD: prueba fallida, implementación mínima y refactor con pruebas verdes.
5. Las pruebas deben comprobar el comportamiento observable; no se fijará un umbral de cobertura hasta tener una base de pruebas y una medición reproducible.

## 3. Arquitectura y seguridad

6. El servidor será la autoridad para validar acciones, estado, puntuación, ataques y resultados. El cliente enviará intenciones de entrada, no cambios de estado confiables.
7. Los límites entre módulos y mensajes de red serán tipados y validados. Los mensajes inválidos o excesivos se rechazarán sin alterar la partida.
8. No se incluirán secretos en el repositorio. Los datos personales se limitarán a lo necesario para las funciones aprobadas.

## 4. Experiencia y rendimiento

9. La interfaz será usable con teclado y controles táctiles; los elementos de interfaz cumplirán WCAG 2.2 AA. La jugabilidad no dependerá solo del color.
10. Las pruebas de rendimiento definirán dispositivo de referencia, escena y duración. El objetivo es sostener al menos 60 FPS en escritorio y 30 FPS en móvil en esos dispositivos.

## 5. Originalidad, ramas y conocimiento

11. No se usarán personajes, marcas, arte, música ni sonidos protegidos de Dr. Mario o Nintendo. Los recursos del juego serán originales o tendrán licencia compatible documentada.
12. Los cambios se harán en ramas de trabajo y entrarán mediante pull request; no se harán pushes directos al branch por defecto.
13. Las decisiones relevantes se registrarán en `02-DOCS/wiki/sdd/decisions.md`. La documentación distinguirá claramente lo implementado de lo pendiente y no presentará datos simulados como funciones reales.

## Definition of Done

Un cambio estará listo para integrar solo si:

- [ ] Sigue el stack y los límites arquitectónicos aprobados.
- [ ] Pasa formato, lint, tipos, pruebas afectadas y build.
- [ ] Las reglas de juego nuevas tienen pruebas deterministas.
- [ ] Las acciones y mensajes de red se validan en el servidor.
- [ ] La interfaz conserva accesibilidad y controles previstos para su alcance.
- [ ] No añade recursos protegidos ni secretos.
- [ ] Cumple los criterios de rendimiento definidos para el cambio, si aplican.
- [ ] Se integra mediante pull request y deja las decisiones documentadas.
- [ ] La interfaz no afirma funciones que todavía no existen.

## Registro de cambios

| Fecha | Versión | Cambio | Motivo |
|---|---|---|---|
| 2026-11-10 | v1.0.0 | Ratificación inicial de las reglas del proyecto. | Stack y mínimos de calidad aceptados por el usuario. |
| 2026-11-10 | v1.0.1 | Aclaración del estado inicial del proyecto y la ratificación del stack. | Evitar que el contexto histórico se lea como una regla o estado actual. |
