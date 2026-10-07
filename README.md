# googlemeett

Navegador web estilo Lucid, **100% nativo proxy**: las páginas se abren **dentro** de la app, servidas desde este mismo origen — nunca se van a Google ni a pestañas externas. Tema **negro premium con letras blancas**.

- **Sitio en vivo (GitHub Pages):** <https://googlesitecom.github.io/googlemeett/>
- **Repositorio:** <https://github.com/googlesitecom/googlemeett>

## Estructura

```
├── index.html      ← el navegador completo (un solo archivo, sin dependencias)
├── sw.js           ← motor proxy 100% cliente (Service Worker)
├── nextjs/         ← TODO el código fuente del proyecto Next.js (proxy de servidor,
│                      cuentas con base de datos, amigos, chat, ajustes por cuenta)
└── README.md
```

## Motor proxy nativo (cómo abre las páginas)

Todo lo que escribas en la barra se abre **aquí dentro**:

1. **Mismo origen** → carga directa nativa (los 3 juegos de `googlesitecom.github.io` cuando el portal está desplegado).
2. **Fetch directo (CORS)** → GitHub Pages envía `access-control-allow-origin: *`, así que los 4 juegos y cualquier host con CORS se sirven desde este origen con el HTML reescrito: `<base>` del sitio real, enlaces reescritos para que la navegación siga dentro del proxy, parche de History (las apps Next.js hidratan con su ruta real) y `location.pathname` fiel.
3. **Cadena de proveedores** (allorigins → codetabs) ejecutada **dentro del marco** como último recurso, con reescritura idéntica.
4. Si nada responde → página de error negra premium con "Reintentar" y "Abrir en pestaña real ↗" (último recurso, nunca automático).

La búsqueda muestra resultados instantáneos de Wikipedia (CORS directo) y abre **cualquier motor dentro de la app** a través del proxy: DuckDuckGo, Bing, Brave, Mojeek, Ecosia, Wikipedia. **Nunca Google.**

## Enlaces (se abren tal cual, sin ninguna modificación)

| Juego | Enlace exacto |
|---|---|
| F1 Racing | `https://googlesitecom.github.io/googleslides/` |
| Mario Kart | `https://googlesitecom.github.io/gmail/` |
| Counter Strike 2 | `https://googlesitecom.github.io/Googlecom/` |
| Zona Cero | `https://nflowstudios.github.io/Googlemeet/` |

## Funciones

- **Tema negro puro** (`#000`) con letras blancas, animaciones premium y micro-interacciones.
- **Pestañas con iframe propio** — cada juego conserva su estado al cambiar de pestaña.
- **Cuentas locales** (usuario + contraseña, sin correo) en `localStorage`.
- **Amigos y chat** con respuestas automáticas.
- **Ajustes persistentes**: nombre de la pestaña del navegador y logo (favicon) — sobreviven recargas y reinicios.
- Historial, favoritos, atrás/adelante, recargar, pantalla completa.
- Cero llamadas a Google (sin Fonts, sin servicios, sin redirecciones).

## Despliegue

### GitHub Pages (ya activo)
El sitio estático (`index.html` + `sw.js`) se sirve desde la rama `main`, carpeta raíz. El Service Worker requiere HTTPS o `localhost` — GitHub Pages cumple.

### Self-hosting con proxy de servidor (opcional, `nextjs/`)
El proxy de servidor evita los proveedores públicos y añade búsqueda web real:

```bash
cd nextjs
bun install
bun run db:push        # SQLite + Prisma
bun run dev            # http://localhost:3000
```

Despliégalo en cualquier host con Node (Vercel, Render, VPS) y tendrás `/api/proxy` server-side, cuentas en base de datos y búsqueda con IA.

## Notas

- Los datos (cuenta, amigos, chats, ajustes) viven en el `localStorage` del navegador de cada usuario.
- Las páginas proxificadas se ejecutan con el origen de este portal (comportamiento estándar de este tipo de navegadores); úsalo con sitios de confianza.
- Para añadir juegos, edita el array `GAMES` en `index.html` (usa la URL completa y exacta).
