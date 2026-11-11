# PROYECTO: DESARROLLO DE UN JUEGO WEB MULTIJUGADOR INSPIRADO EN DR. MARIO

## 1. ROL Y OBJETIVO

Actúa como un desarrollador senior de videojuegos web, arquitecto de software y especialista en experiencias multijugador en tiempo real.

Tu objetivo es diseñar y desarrollar un videojuego web de tipo puzzle competitivo, inspirado en las mecánicas clásicas de Dr. Mario, pero con identidad visual, nombre, personajes, elementos gráficos y sonidos originales.

El juego debe permitir que dos o más jugadores compitan online simultáneamente, enfrentándose en partidas en tiempo real donde el objetivo sea eliminar virus mediante la colocación estratégica de cápsulas de colores.

El resultado debe ser un videojuego completamente funcional, no solamente una demostración visual o un prototipo estático.

## 2. CONCEPTO GENERAL DEL JUEGO

Desarrollar un videojuego de puzles con las siguientes características:

- Juego de tablero vertical.
- Cápsulas compuestas por dos segmentos de colores.
- Diferentes tipos de virus distribuidos aleatoriamente en el tablero.
- Eliminación de virus al alinear cuatro o más elementos del mismo color.
- Sistema de gravedad para las cápsulas y segmentos que queden separados.
- Competición entre jugadores en tiempo real.
- Sistema de envío de obstáculos al oponente.
- Condiciones de victoria y derrota.
- Interfaz moderna, intuitiva y responsive.

Cada jugador debe tener su propio tablero independiente, pero ambos deben visualizar el progreso de la partida del oponente.

## 3. MECÁNICAS PRINCIPALES

### 3.1. Tablero de juego

Crear un tablero vertical compuesto por una cuadrícula de 8 columnas por 16 filas, configurable desde el motor del juego.

El tablero debe contener:

- Virus de diferentes colores.
- Espacios vacíos.
- Cápsulas completas.
- Segmentos individuales de cápsulas.
- Animaciones de eliminación.
- Animaciones de caída y reorganización.

Los virus deben distribuirse aleatoriamente al comenzar cada partida, con diferentes niveles de dificultad.

### 3.2. Sistema de cápsulas

Implementar cápsulas formadas por dos segmentos, cada uno con un color determinado.

Colores iniciales:

- Rojo.
- Azul.
- Amarillo.

Las cápsulas deben poder:

- Desplazarse horizontalmente.
- Rotar en sentido horario.
- Rotar en sentido antihorario.
- Caer automáticamente.
- Acelerar su caída.
- Acoplarse a otras cápsulas o virus.
- Dividirse cuando sus segmentos dejen de estar conectados después de una eliminación.

Controles:

- Flecha izquierda: mover a la izquierda.
- Flecha derecha: mover a la derecha.
- Flecha abajo: acelerar caída.
- Flecha arriba o X: rotar.
- Z: rotar en sentido contrario.
- Espacio: caída instantánea (hard drop).

Incluir soporte para controles táctiles en dispositivos móviles.

### 3.3. Sistema de eliminación

Cuando se alineen cuatro o más elementos del mismo color, horizontal o verticalmente, deben eliminarse.

La eliminación puede involucrar:

- Virus.
- Segmentos de cápsulas.
- Combinaciones de ambos.

Después de cada eliminación:

1. Detectar las coincidencias.
2. Eliminar los elementos correspondientes.
3. Reproducir una animación.
4. Aplicar gravedad a los segmentos suspendidos.
5. Detectar nuevas coincidencias.
6. Ejecutar reacciones en cadena.

Implementar un sistema de puntuación basado en virus eliminados, combinaciones y reacciones en cadena.

### 3.4. Sistema competitivo

Implementar una mecánica de ataque entre jugadores.

Cuando un jugador realice una eliminación importante o una combinación múltiple, podrá enviar obstáculos al tablero del oponente.

Los obstáculos deberán:

- Tener un diseño visual diferente.
- Aparecer progresivamente en el tablero rival.
- Generar presión estratégica.
- Poder eliminarse mediante las mecánicas habituales.

La cantidad de obstáculos enviados debe depender de la puntuación y de las combinaciones realizadas.

## 4. MULTIJUGADOR ONLINE

Esta es una de las funcionalidades más importantes del proyecto.

Implementar un sistema multijugador online en tiempo real utilizando WebSockets.

### Funcionalidades:

- Crear una sala privada.
- Unirse a una sala mediante código.
- Buscar partidas públicas.
- Emparejamiento automático.
- Sala de espera.
- Visualización de jugadores conectados.
- Indicador de conexión.
- Chat básico entre jugadores.
- Invitación mediante enlace.
- Inicio sincronizado de partidas.
- Detección de desconexiones.
- Reconexión cuando sea posible.
- Finalización de partidas.
- Registro del resultado.

### Flujo de partida:

1. El jugador entra al sitio web.
2. Selecciona el modo multijugador.
3. Crea una sala o se une a una existente.
4. Espera a que otro jugador ingrese.
5. Ambos jugadores visualizan una cuenta regresiva.
6. La partida comienza simultáneamente.
7. Cada jugador controla su propio tablero.
8. Los ataques se transmiten al tablero contrario.
9. La partida termina cuando uno de los jugadores cumple una condición de derrota.
10. Se muestra una pantalla con los resultados.

### Requisitos técnicos del multijugador:

- El servidor debe ser responsable de validar las acciones y mantener el estado oficial de la partida.
- Evitar que el cliente pueda modificar arbitrariamente puntuaciones o resultados.
- Sincronizar los eventos relevantes de ambos tableros.
- Minimizar la latencia.
- Implementar un sistema de reconexión.
- Gestionar correctamente los estados de cada partida.

## 5. MODOS DE JUEGO

Desarrollar inicialmente los siguientes modos:

**Modo versus online**
- Dos jugadores compiten directamente.
- Gana quien elimine todos los virus o consiga que el tablero rival se bloquee.

**Modo entrenamiento**
- Un solo jugador.
- Diferentes niveles de dificultad.
- Sin límite de tiempo.

**Modo supervivencia**
- El jugador debe eliminar tantos virus como pueda.
- La dificultad aumenta progresivamente.

**Modo sala privada**
- Partidas entre amigos mediante códigos de invitación.

Diseñar la arquitectura para incorporar posteriormente torneos y rankings.

## 6. INTERFAZ Y EXPERIENCIA DE USUARIO

Crear una interfaz moderna, atractiva y visualmente pulida.

La estética debe combinar elementos de videojuegos arcade clásicos con un diseño contemporáneo.

### Pantalla principal

Incluir:

- Logotipo original del juego.
- Botón Jugar online.
- Botón Crear partida.
- Botón Unirse a partida.
- Botón Entrenamiento.
- Botón Clasificación.
- Perfil del jugador.
- Configuración.

### Pantalla de partida

Debe mostrar:

- Tablero del jugador principal.
- Tablero del oponente.
- Próxima cápsula.
- Puntuación.
- Nivel actual.
- Virus restantes.
- Indicador de ataques enviados y recibidos.
- Estado de conexión.
- Temporizador de partida.
- Controles disponibles.

La interfaz debe priorizar la visibilidad de los tableros y la fluidez de la experiencia.

### Pantalla de resultados

Mostrar:

- Ganador.
- Perdedor.
- Puntuación de ambos jugadores.
- Virus eliminados.
- Número de combinaciones.
- Tiempo de partida.
- Botón para revancha.
- Botón para regresar al menú.

## 7. DISEÑO VISUAL

Crear una identidad visual original.

Referencias estéticas:

- Videojuegos arcade de los años 90.
- Interfaces de videojuegos retro modernizadas.
- Colores vibrantes.
- Animaciones fluidas.
- Efectos de partículas.
- Iluminación sutil.
- Bordes redondeados.
- Tipografía legible y con personalidad.

Los virus deben tener diseños originales, expresiones faciales y animaciones propias.

Las cápsulas deben distinguir claramente sus colores y tener efectos visuales al rotar, caer y eliminarse.

No utilizar recursos gráficos, personajes, logotipos, música ni elementos protegidos de Dr. Mario o Nintendo. Crear todos los recursos originales.

## 8. ARQUITECTURA Y TECNOLOGÍAS

Utilizar una arquitectura modular, escalable y mantenible.

Stack tecnológico recomendado:

### Frontend
- Astro como framework principal.
- TypeScript.
- Phaser 3 para el motor de juego y renderizado 2D.
- GSAP para animaciones de interfaz.
- HTML5 y CSS3.
- Diseño responsive.

### Backend
- Node.js.
- TypeScript.
- Colyseus para gestionar salas y partidas multijugador.
- WebSockets para comunicación en tiempo real.

### Persistencia
- PostgreSQL para usuarios, estadísticas y rankings.
- Redis opcional para gestión de sesiones y escalabilidad.

### Infraestructura
- Separación entre frontend y servidor de juego.
- Variables de entorno.
- Docker para facilitar el despliegue.
- Configuración para desarrollo local y producción.

Si alguna tecnología presenta incompatibilidades, proponer una alternativa sin sacrificar las funcionalidades principales.

## 9. ESTRUCTURA DEL PROYECTO

Organizar el código de forma modular.

Separar claramente:

- Motor de juego.
- Lógica de tablero.
- Sistema de cápsulas.
- Detección de coincidencias.
- Sistema de gravedad.
- Sistema de puntuación.
- Sistema de ataques.
- Comunicación multijugador.
- Gestión de salas.
- Gestión de usuarios.
- Interfaz gráfica.
- Sonido.
- Configuración.

Evitar componentes excesivamente grandes y lógica duplicada.

## 10. RENDIMIENTO Y SEGURIDAD

- Mantener una tasa de renderizado fluida.
- Optimizar las animaciones.
- Evitar renderizados innecesarios.
- Validar los movimientos en el servidor.
- Evitar manipulación de puntuaciones.
- Implementar validación de mensajes WebSocket.
- Gestionar desconexiones y reconexiones.
- Evitar que un jugador pueda modificar el tablero del oponente desde el cliente.
- Implementar límites de frecuencia para los mensajes.

## 11. PRUEBAS Y VALIDACIÓN

Crear pruebas para:

- Movimiento de cápsulas.
- Rotación.
- Colisiones.
- Detección de cuatro elementos.
- Eliminación simultánea.
- Reacciones en cadena.
- Aplicación de gravedad.
- División de cápsulas.
- Envío de obstáculos.
- Sincronización de partidas.
- Desconexión y reconexión.
- Condiciones de victoria y derrota.

La lógica central del juego debe estar desacoplada de la interfaz para facilitar las pruebas automatizadas.

## 12. METODOLOGÍA DE DESARROLLO

No intentes construir todo el proyecto en un único bloque de código.

Trabaja por etapas:

**Fase 1:** Arquitectura inicial y configuración del proyecto.

**Fase 2:** Motor de juego y tablero individual completamente funcional.

**Fase 3:** Implementación de cápsulas, movimientos, colisiones y eliminación de virus.

**Fase 4:** Sistema de puntuación, gravedad y reacciones en cadena.

**Fase 5:** Implementación del servidor multijugador y salas.

**Fase 6:** Sincronización en tiempo real y sistema de ataques.

**Fase 7:** Interfaz gráfica, animaciones, sonidos y experiencia de usuario.

**Fase 8:** Rankings, estadísticas y perfiles.

**Fase 9:** Pruebas, optimización y despliegue.

Al finalizar cada fase:

- Explicar qué se implementó.
- Mostrar la estructura de archivos.
- Entregar el código completo de los archivos modificados.
- Indicar cómo ejecutar y probar lo desarrollado.
- Identificar errores o funcionalidades pendientes.

## 13. RESULTADO ESPERADO

El producto final debe ser un videojuego web multijugador funcional, visualmente atractivo y preparado para ejecutarse en navegadores modernos.

Debe permitir que dos jugadores se conecten desde diferentes dispositivos y compitan en una partida sincronizada en tiempo real.

Priorizar siempre:

1. Jugabilidad correcta.
2. Sincronización multijugador.
3. Rendimiento.
4. Experiencia visual.
5. Escalabilidad.

No utilizar datos ficticios para simular funcionalidades que todavía no estén implementadas. Si alguna funcionalidad está pendiente, indicarlo claramente.

Antes de comenzar, presenta la arquitectura propuesta, la estructura de carpetas y el plan de implementación. Después, desarrolla el proyecto progresivamente, asegurándote de que cada etapa funcione antes de continuar.