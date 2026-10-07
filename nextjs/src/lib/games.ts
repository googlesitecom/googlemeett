import {
  Car,
  Crosshair,
  Flag,
  LayoutGrid,
  Star,
  Swords,
  type LucideIcon,
} from "lucide-react";
import { GAME_LINKS } from "@/lib/game-urls";

export type CategoryId = "carreras" | "disparos" | "battle-royale";

export interface Game {
  id: string;
  name: string;
  url: string;
  category: CategoryId;
  tagline: string;
  icon: LucideIcon;
  gradient: string;
  glow: string;
}

const GAME_STYLE: Record<
  string,
  {
    category: CategoryId;
    tagline: string;
    icon: LucideIcon;
    gradient: string;
    glow: string;
  }
> = {
  f1: {
    category: "carreras",
    tagline: "Carreras de Fórmula 1 a fondo, vueltas rápidas y pits.",
    icon: Flag,
    gradient: "from-red-500 via-rose-500 to-orange-400",
    glow: "shadow-red-500/40",
  },
  "mario-kart": {
    category: "carreras",
    tagline: "Karts, plátanos y caparazones en pistas caóticas.",
    icon: Car,
    gradient: "from-amber-400 via-orange-500 to-rose-500",
    glow: "shadow-orange-500/40",
  },
  cs2: {
    category: "disparos",
    tagline: "Shooter táctico por rondas, bombas y rifles.",
    icon: Crosshair,
    gradient: "from-yellow-500 via-amber-600 to-stone-600",
    glow: "shadow-amber-500/40",
  },
  "zona-cero": {
    category: "battle-royale",
    tagline: "Battle royale: saquea, construye y sé el último.",
    icon: Swords,
    gradient: "from-emerald-400 via-teal-500 to-green-600",
    glow: "shadow-emerald-500/40",
  },
};

/** Las URLs exactas provienen de GAME_LINKS (mayúsculas incluidas). */
export const GAMES: Game[] = GAME_LINKS.map((link) => ({
  ...link,
  ...GAME_STYLE[link.id],
}));

export interface Category {
  id: "all" | CategoryId;
  name: string;
  icon: LucideIcon;
}

export const CATEGORIES: Category[] = [
  { id: "all", name: "Todos", icon: LayoutGrid },
  { id: "carreras", name: "Carreras", icon: Flag },
  { id: "disparos", name: "Disparos", icon: Crosshair },
  { id: "battle-royale", name: "Battle Royale", icon: Swords },
];

export const FAVORITES_CATEGORY: Category = {
  id: "all",
  name: "Favoritos",
  icon: Star,
};

/* ---------------- Internal URL helpers ---------------- */

export { canonicalGameUrl, gameForHost } from "@/lib/game-urls";

export const NEW_TAB_URL = "lucid://newtab";

export function makeSearchUrl(query: string): string {
  return `lucid://search?q=${encodeURIComponent(query)}`;
}

export function parseSearchUrl(url: string): string | null {
  if (url.startsWith("lucid://search?q=")) {
    return decodeURIComponent(url.slice("lucid://search?q=".length));
  }
  return null;
}

export function isLikelyUrl(input: string): boolean {
  const value = input.trim();
  if (!value || /\s/.test(value)) return false;
  if (/^https?:\/\//i.test(value)) return true;
  if (/^localhost(:\d+)?(\/\S*)?$/i.test(value)) return true;
  // Dominio con TLD alfabético plausible (evita tratar "jugar.cs2" como URL).
  const domain = value.match(/^([\w-]+\.)+([a-zA-Z]{2,})(:\d+)?(\/\S*)?$/);
  return !!domain;
}

export function normalizeUrl(input: string): string {
  const value = input.trim();
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Favicons vía DuckDuckGo (sin usar ningún servicio de Google). */
export function faviconUrl(url: string): string {
  return `https://icons.duckduckgo.com/ip3/${hostnameOf(url)}.ico`;
}

export function gameByUrl(url: string): Game | undefined {
  return GAMES.find((g) => g.url === url);
}
