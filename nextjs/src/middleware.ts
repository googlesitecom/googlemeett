import { NextRequest, NextResponse } from "next/server";

/**
 * Middleware de Lucid.
 *
 * Cuando el proxy sirve una página, el router del sitio visitado funciona
 * contra NUESTRO origen (history.replaceState con la ruta del sitio). Si ese
 * router hace una navegación completa (location.href, form, recarga), la
 * petición llega a nuestro servidor con una ruta que no existe y antes
 * terminaba en 404 ("las páginas no se encuentran bien").
 *
 * Solución: el proxy guarda en la cookie lucid-ctx el origen del último sitio
 * interceptado; este middleware rescata esas rutas y las redirige de vuelta
 * al proxy con el origen correcto.
 */

const PROXY_COOKIE = "lucid-ctx";

const SKIP_PREFIXES = [
  "/api/",
  "/_next/",
  "/favicon.ico",
  "/logo.svg",
  "/robots.txt",
  "/sitemap.xml",
];

const ASSET_EXTENSION =
  /\.(js|css|png|jpe?g|svg|gif|webp|avif|ico|woff2?|ttf|eot|otf|map|json|txt|xml|mp4|webm|mp3|wav|ogg|wasm|pdf|zip)$/i;

/** Destinos de petición que NO son navegación de documento/iframe. */
const NON_NAVIGATION_DESTS = new Set([
  "script",
  "style",
  "image",
  "font",
  "audio",
  "video",
  "object",
  "track",
  "worker",
  "manifest",
  "report",
  "sharedworker",
  "serviceworker",
  "paintworklet",
  "audioworklet",
]);

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // La raíz y las rutas del propio Lucid nunca se rescatan.
  if (pathname === "/") return NextResponse.next();
  if (SKIP_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }
  if (ASSET_EXTENSION.test(pathname)) return NextResponse.next();

  const contextOrigin = req.cookies.get(PROXY_COOKIE)?.value;
  if (!contextOrigin || !/^https?:\/\//i.test(contextOrigin)) {
    return NextResponse.next();
  }

  // Solo navegaciones de documento (página o iframe), no subrecursos.
  const dest = req.headers.get("sec-fetch-dest");
  if (dest && NON_NAVIGATION_DESTS.has(dest)) {
    return NextResponse.next();
  }

  try {
    const target = new URL(pathname + search, contextOrigin);
    if (!/^https?:$/.test(target.protocol)) return NextResponse.next();

    const proxyUrl = req.nextUrl.clone();
    proxyUrl.pathname = "/api/proxy";
    proxyUrl.search = `?url=${encodeURIComponent(target.toString())}`;
    return NextResponse.redirect(proxyUrl);
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  // Aplica a todo excepto api, _next y archivos estáticos.
  matcher: ["/((?!api|_next/static|_next/image).*)"],
};
