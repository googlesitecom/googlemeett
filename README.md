# googlemeett

Portal web estilo navegador, tema **negro premium con letras blancas**, un solo archivo (`index.html`) sin dependencias externas. Listo para GitHub Pages.

**Publicado en:** <https://googlesitecom.github.io/googlemeett/>

## Enlaces (se abren tal cual, sin ninguna modificación)

| Juego | Enlace exacto |
|---|---|
| F1 Racing | `https://googlesitecom.github.io/googleslides/` |
| Mario Kart | `https://googlesitecom.github.io/gmail/` |
| Counter Strike 2 | `https://googlesitecom.github.io/Googlecom/` |
| Zona Cero | `https://nflowstudios.github.io/Googlemeet/` |

Cada enlace se usa **carácter por carácter** (mayúsculas incluidas) y se abre de forma nativa: integrado en pestaña (iframe) o en una pestaña real del navegador (botón nativo ↗).

## Funciones

- **Tema negro puro** (`#000`) con letras blancas, animaciones premium y micro-interacciones.
- **Cuentas locales**: registro e inicio de sesión solo con usuario y contraseña (sin correo, sin servicios externos).
- **Amigos y chat** con respuestas simuladas, guardados en el navegador.
- **Ajustes persistentes** (localStorage): personaliza el **nombre de la pestaña** y el **logo (favicon)**; sobreviven recargas y reinicios.
- **Apertura nativa de enlaces**: el buscador fue sustituido por acceso directo a los enlaces exactos; lo que escribas se ejecuta tal cual, nunca se redirige a Google.
- **Pestañas integradas** con historial, recarga, pantalla completa y apertura en pestaña nueva.
- Panel de juegos con **categorías** (Carreras / Shooter / Battle Royale) y botón de gamepad en la barra lateral.
- Sin llamadas a Google Fonts ni a ningún servicio de Google.

## Despliegue (GitHub Pages)

1. El sitio se sirve desde la rama `main`, carpeta raíz (`/`).
2. Configuración: *Settings → Pages → Branch: `main` / `root`*.
3. Añade más juegos editando el array `GAMES` en `index.html` (usa la URL completa y exacta).

## Nota

Los datos de cuenta, amigos, chat y ajustes se guardan en el `localStorage` del navegador de cada usuario. Este repositorio no recopila ningún dato.
