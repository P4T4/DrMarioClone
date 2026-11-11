# Guía de revisión — DrMario

Reglas ratificadas junto con `02-DOCS/wiki/sdd/constitution.md` v1.0.1.

## Qué cuenta como fallo

- Una entrada del cliente puede falsear el estado, la puntuación, los ataques o el resultado.
- Una transición de tablero produce un estado imposible, no determinista o no cubierto por pruebas.
- Una desconexión o mensaje inválido deja la sala en un estado incoherente.
- La interfaz pierde controles de teclado/táctiles o comunica información solo mediante color.
- Se incorpora un recurso protegido sin licencia compatible documentada.
- Se presenta una función simulada como si estuviera implementada.

## Alcance de revisión

- Omitir dependencias instaladas, artefactos de build, cobertura y archivos generados.
- Máximo de tres observaciones de estilo por revisión; priorizar defectos funcionales, seguridad y accesibilidad.
- El resumen empieza por el recuento: «N hallazgos: X bloqueantes, Y importantes, Z menores».
- Rutas siempre humanas propuestas: autenticación, migraciones de base de datos, secretos y despliegue/infraestructura. Esta lista aún no está configurada como regla automática de riesgo en RSC.
