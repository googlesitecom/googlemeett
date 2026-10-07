import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

/**
 * Motor de búsqueda propio de Lucid.
 * 1. Motor principal (z-ai-web-dev-sdk).
 * 2. Si falla o no devuelve nada: respaldo con DuckDuckGo HTML.
 * 3. Si también falla: respaldo con DuckDuckGo Lite.
 * Ningún paso usa Google.
 */

interface SearchItem {
  url: string;
  name: string;
  snippet: string;
  hostName: string;
  date: string;
  rank: number;
}

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripTags(value: string): string {
  return decodeEntities(value.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
}

/** Extrae la URL real del enlace de resultados de DuckDuckGo (parámetro uddg). */
function extractTarget(href: string): string | null {
  try {
    const absolute = href.startsWith("//")
      ? `https:${href}`
      : href;
    const parsed = new URL(absolute, "https://duckduckgo.com");
    const uddg = parsed.searchParams.get("uddg");
    if (uddg && /^https?:\/\//i.test(uddg)) return uddg;
    if (/^https?:\/\//i.test(absolute) && !absolute.includes("duckduckgo.com")) {
      return absolute;
    }
    return null;
  } catch {
    return null;
  }
}

function dedupe(items: SearchItem[]): SearchItem[] {
  const seen = new Set<string>();
  const output: SearchItem[] = [];
  for (const item of items) {
    const key = item.url.replace(/\/$/, "");
    if (!item.url || seen.has(key)) continue;
    if (item.url.includes("duckduckgo.com/y.js")) continue; // anuncios
    seen.add(key);
    output.push({ ...item, rank: output.length + 1 });
  }
  return output;
}

/* ---------------------- Motor principal ---------------------- */

async function zaiSearch(query: string): Promise<SearchItem[]> {
  try {
    const zai = await ZAI.create();
    const results = await zai.functions.invoke("web_search", {
      query,
      num: 12,
    });
    const items = Array.isArray(results) ? results : [];
    return items
      .map((item: Record<string, unknown>, index: number) => ({
        url: String(item.url ?? ""),
        name: String(item.name ?? ""),
        snippet: String(item.snippet ?? ""),
        hostName: String(item.host_name ?? ""),
        date: String(item.date ?? ""),
        rank: Number(item.rank ?? index + 1),
      }))
      .filter((item) => item.url && item.name);
  } catch {
    return [];
  }
}

/* ------------------- Respaldo: DuckDuckGo HTML ------------------- */

async function ddgHtmlSearch(query: string): Promise<SearchItem[]> {
  try {
    const res = await fetch(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
      {
        headers: {
          "User-Agent": BROWSER_UA,
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
        },
        signal: AbortSignal.timeout(9000),
        cache: "no-store",
      }
    );
    if (!res.ok) return [];
    const html = await res.text();

    const anchors = [
      ...html.matchAll(
        /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g
      ),
    ];

    const items: SearchItem[] = [];
    for (let i = 0; i < anchors.length; i += 1) {
      const match = anchors[i];
      const url = extractTarget(match[1]);
      if (!url) continue;
      const name = stripTags(match[2]);
      if (!name) continue;

      const nextIndex =
        i + 1 < anchors.length ? (anchors[i + 1].index ?? html.length) : html.length;
      const segment = html.slice(match.index ?? 0, nextIndex);
      const snippetMatch = segment.match(
        /class="result__snippet"[^>]*>([\s\S]*?)<\/a>/
      );

      items.push({
        url,
        name,
        snippet: snippetMatch ? stripTags(snippetMatch[1]) : "",
        hostName: hostOf(url),
        date: "",
        rank: items.length + 1,
      });
    }
    return dedupe(items);
  } catch {
    return [];
  }
}

/* ------------------- Respaldo: DuckDuckGo Lite ------------------- */

async function ddgLiteSearch(query: string): Promise<SearchItem[]> {
  try {
    const res = await fetch(
      `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`,
      {
        headers: {
          "User-Agent": BROWSER_UA,
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
        },
        signal: AbortSignal.timeout(9000),
        cache: "no-store",
      }
    );
    if (!res.ok) return [];
    const html = await res.text();

    const anchors = [
      ...html.matchAll(
        /<a[^>]*class="result-link"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g
      ),
    ];

    const items: SearchItem[] = [];
    for (let i = 0; i < anchors.length; i += 1) {
      const match = anchors[i];
      const url = extractTarget(match[1]);
      if (!url) continue;
      const name = stripTags(match[2]);
      if (!name) continue;

      const nextIndex =
        i + 1 < anchors.length ? (anchors[i + 1].index ?? html.length) : html.length;
      const segment = html.slice(match.index ?? 0, nextIndex);
      const snippetMatch = segment.match(
        /class="result-snippet"[^>]*>([\s\S]*?)<\/td>/
      );

      items.push({
        url,
        name,
        snippet: snippetMatch ? stripTags(snippetMatch[1]) : "",
        hostName: hostOf(url),
        date: "",
        rank: items.length + 1,
      });
    }
    return dedupe(items);
  } catch {
    return [];
  }
}

/* ------------------------------ API ------------------------------ */

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json(
      { success: false, error: "Falta el parámetro ?q=" },
      { status: 400 }
    );
  }

  let results = await zaiSearch(query);
  let source: "lucid" | "duckduckgo" = "lucid";

  if (results.length === 0) {
    results = await ddgHtmlSearch(query);
    if (results.length > 0) source = "duckduckgo";
  }

  if (results.length === 0) {
    results = await ddgLiteSearch(query);
    if (results.length > 0) source = "duckduckgo";
  }

  if (results.length === 0) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Ningún motor respondió. Revisa tu conexión e inténtalo en unos segundos.",
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    success: true,
    query,
    source,
    total: results.length,
    results: results.slice(0, 14),
  });
}
