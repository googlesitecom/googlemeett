/**
 * Apariencia de la página (Configuración de Lucid).
 *
 * El usuario puede personalizar cómo se ve SU navegador en la pestaña real:
 * - `title`: el nombre que muestra la pestaña del navegador (document.title).
 * - `favicon`: el logo (emoji, URL de imagen, imagen subida o el de Lucid).
 *
 * Se guarda como JSON en `User.appearance` (servidor) y se refleja en
 * localStorage para aplicarla al instante en la siguiente visita.
 */

export type FaviconKind = "default" | "emoji" | "url" | "image";

export interface Appearance {
  /** Nombre de la pestaña (document.title). */
  title: string;
  /** Tipo de logo: "default" usa el logo de Lucid. */
  faviconType: FaviconKind;
  /** Emoji, URL http(s) o data-URL de imagen (vacío con "default"). */
  faviconValue: string;
  /** Marca de tiempo (ms) del último cambio: evita perder personalizaciones
   *  cuando un guardado no llegó al servidor y el GET de inicio de sesión
   *  trae datos más antiguos que la caché local. */
  updatedAt?: number;
}

export const DEFAULT_APPEARANCE: Appearance = {
  title: "Nueva pestaña",
  faviconType: "default",
  faviconValue: "",
};

export const APPEARANCE_TITLE_MAX = 80;
/** Límite generoso para data-URLs de imágenes subidas (~100 KB). */
export const APPEARANCE_FAVICON_MAX = 150_000;

/** Convierte un emoji en un favicon SVG como data-URL. */
export function emojiFaviconDataUrl(emoji: string): string {
  const safe = emoji.replace(/[<>&"']/g, "");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">${safe}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** URL final del favicon según el tipo. */
export function resolveFaviconHref(appearance: Appearance): string {
  switch (appearance.faviconType) {
    case "emoji":
      return appearance.faviconValue
        ? emojiFaviconDataUrl(appearance.faviconValue)
        : "/logo.svg";
    case "url":
    case "image":
      return appearance.faviconValue || "/logo.svg";
    default:
      return "/logo.svg";
  }
}

/** Parseo tolerante del JSON guardado en la base de datos. */
export function parseAppearance(raw: string | null | undefined): Appearance {
  if (!raw) return { ...DEFAULT_APPEARANCE };
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    const title =
      typeof data.title === "string" && data.title.trim()
        ? data.title.trim().slice(0, APPEARANCE_TITLE_MAX)
        : DEFAULT_APPEARANCE.title;
    const faviconType: FaviconKind = (
      ["default", "emoji", "url", "image"] as const
    ).includes(data.faviconType as FaviconKind)
      ? (data.faviconType as FaviconKind)
      : "default";
    const faviconValue =
      typeof data.faviconValue === "string"
        ? data.faviconValue.slice(0, APPEARANCE_FAVICON_MAX)
        : "";
    const updatedAt = typeof data.updatedAt === "number" ? data.updatedAt : undefined;
    return { title, faviconType, faviconValue, updatedAt };
  } catch {
    return { ...DEFAULT_APPEARANCE };
  }
}

/** Validez básica en cliente antes de enviar al servidor. */
export function appearanceLooksValid(appearance: Appearance): boolean {
  if (!appearance.title.trim() || appearance.title.length > APPEARANCE_TITLE_MAX)
    return false;
  switch (appearance.faviconType) {
    case "default":
      return true;
    case "emoji":
      return appearance.faviconValue.length >= 1;
    case "url":
      return /^https?:\/\//i.test(appearance.faviconValue);
    case "image":
      return (
        appearance.faviconValue.startsWith("data:image/") &&
        appearance.faviconValue.length <= APPEARANCE_FAVICON_MAX
      );
    default:
      return false;
  }
}
