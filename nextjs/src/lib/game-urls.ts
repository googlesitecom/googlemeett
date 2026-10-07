/**
 * URLs canónicas de los juegos (fuente única de verdad).
 *
 * GitHub Pages distingue mayúsculas en la ruta: /Googlecom/ existe pero
 * /googlecom/ devuelve 404. Los buscadores y los enlaces externos a veces
 * llegan con la ruta en minúsculas o truncada, así que todos los puntos de
 * entrada (proxy, middleware, buscador) normalizan contra esta lista para
 * recuperar SIEMPRE el enlace exacto.
 *
 * Módulo sin dependencias de UI para poder importarlo en middleware (edge).
 */

export interface GameLink {
  id: string;
  name: string;
  url: string;
}

export const GAME_LINKS: GameLink[] = [
  {
    id: "f1",
    name: "F1",
    url: "https://googlesitecom.github.io/googleslides/",
  },
  {
    id: "mario-kart",
    name: "Mario Kart",
    url: "https://googlesitecom.github.io/gmail/",
  },
  {
    id: "cs2",
    name: "Counter Strike 2",
    url: "https://googlesitecom.github.io/Googlecom/",
  },
  {
    id: "zona-cero",
    name: "Zona Cero",
    url: "https://nflowstudios.github.io/Googlemeet/",
  },
];

function normalizePath(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed.toLowerCase();
}

/**
 * Devuelve la URL canónica exacta del juego cuando `url` coincide con ella
 * ignorando mayúsculas y barras finales. Null si no es ningún juego.
 */
export function canonicalGameUrl(url: string): string | null {
  let input: URL;
  try {
    input = new URL(url);
  } catch {
    return null;
  }

  for (const game of GAME_LINKS) {
    let target: URL;
    try {
      target = new URL(game.url);
    } catch {
      continue;
    }
    if (target.hostname.toLowerCase() !== input.hostname.toLowerCase()) {
      continue;
    }
    if (normalizePath(target.pathname) === normalizePath(input.pathname)) {
      return game.url;
    }
  }
  return null;
}

/**
 * Devuelve el juego cuyo HOST coincide con el de `url` (independientemente
 * de la ruta). Se usa para sugerir el juego correcto en páginas 404.
 */
export function gameForHost(url: string): GameLink | null {
  let input: URL;
  try {
    input = new URL(url);
  } catch {
    return null;
  }
  return (
    GAME_LINKS.find((game) => {
      try {
        return (
          new URL(game.url).hostname.toLowerCase() ===
          input.hostname.toLowerCase()
        );
      } catch {
        return false;
      }
    }) ?? null
  );
}
