import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy del navegador Lucid.
 * - Obtiene el HTML del sitio de forma server-side (el navegador del usuario
 *   nunca contacta al sitio directamente).
 * - Inyecta <base> para que los recursos (JS/CSS/img) se resuelvan contra el
 *   sitio original.
 * - Reescribe los enlaces <a> para que la navegación continúe dentro del proxy.
 * - Al responder desde nuestro propio origen, se evita X-Frame-Options.
 */

const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
};

const PROXY_PREFIX = "/api/proxy?url=";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function errorPage(title: string, message: string, targetUrl: string): string {
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
  :root { color-scheme: dark; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    background:
      radial-gradient(900px 500px at 15% 10%, rgba(139, 92, 246, 0.16), transparent 60%),
      radial-gradient(900px 500px at 85% 90%, rgba(16, 185, 129, 0.12), transparent 60%),
      #0b0b12;
    color: #e7e7f0; padding: 24px;
  }
  .card {
    max-width: 560px; width: 100%; text-align: center;
    background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.09);
    border-radius: 20px; padding: 48px 32px; backdrop-filter: blur(12px);
  }
  .badge {
    display: inline-flex; align-items: center; gap: 8px; margin-bottom: 20px;
    font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; font-weight: 700;
    color: #f87171; background: rgba(248,113,113,0.1); border: 1px solid rgba(248,113,113,0.25);
    padding: 6px 12px; border-radius: 999px;
  }
  h1 { font-size: 22px; margin-bottom: 12px; }
  p { color: #a1a1b5; font-size: 14px; line-height: 1.6; margin-bottom: 8px; }
  code {
    display: block; margin-top: 16px; padding: 10px 14px; border-radius: 10px;
    background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.08);
    font-family: ui-monospace, monospace; font-size: 12px; color: #c4c4d4;
    word-break: break-all;
  }
</style></head>
<body><div class="card">
  <div class="badge">Proxy Lucid</div>
  <h1>${escapeHtml(title)}</h1>
  <p>${escapeHtml(message)}</p>
  <code>${escapeHtml(targetUrl)}</code>
</div></body></html>`;
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("url");
  const origin = req.nextUrl.origin;

  if (!raw) {
    return new NextResponse(
      errorPage(
        "Falta la URL",
        "El proxy necesita el par\u00e1metro ?url= para funcionar.",
        "\u2014"
      ),
      { status: 400, headers: { "content-type": "text/html; charset=utf-8" } }
    );
  }

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return new NextResponse(
      errorPage(
        "URL no v\u00e1lida",
        "La direcci\u00f3n que escribiste no se pudo interpretar.",
        raw
      ),
      { status: 400, headers: { "content-type": "text/html; charset=utf-8" } }
    );
  }

  if (target.protocol !== "http:" && target.protocol !== "https:") {
    return new NextResponse(
      errorPage(
        "Protocolo no permitido",
        "Solo se pueden abrir direcciones http y https.",
        raw
      ),
      { status: 400, headers: { "content-type": "text/html; charset=utf-8" } }
    );
  }

  let response: Response;
  try {
    response = await fetch(target.toString(), {
      headers: BROWSER_HEADERS,
      redirect: "follow",
      signal: AbortSignal.timeout(20000),
      cache: "no-store",
    });
  } catch {
    return new NextResponse(
      errorPage(
        "El sitio no respondi\u00f3",
        "No se pudo conectar con el servidor de destino (tiempo de espera agotado o red no disponible).",
        target.toString()
      ),
      { status: 502, headers: { "content-type": "text/html; charset=utf-8" } }
    );
  }

  const contentType = response.headers.get("content-type") ?? "text/html";

  // Recursos no-HTML (CSS, JS, im\u00e1genes, fuentes...): pasar tal cual.
  if (!contentType.includes("text/html")) {
    return new NextResponse(response.body, {
      status: response.status,
      headers: {
        "content-type": contentType,
        "cache-control": "public, max-age=300",
        "x-lucid-proxy": "pass-through",
      },
    });
  }

  let html = await response.text();
  const finalUrl = response.url || target.toString();
  const finalUrlObj = new URL(finalUrl);
  const baseTag = `<base href="${escapeHtml(finalUrl)}">`;

  // Hace que la ruta del iframe refleje la ruta real del sitio destino.
  // Necesario para apps (p.ej. Next.js estático en GitHub Pages) cuyo router
  // hidrata según location.pathname: sin esto, la app nunca termina de montar.
  // Nota: se usa una URL absoluta de nuestro propio origen porque el <base>
  // apunta al sitio destino y una ruta relativa se resolvería contra él
  // (origen cruzado -> SecurityError).
  const targetPath = finalUrlObj.pathname + finalUrlObj.search;
  const pathScript = `<script>try{history.replaceState(null,"",${JSON.stringify(
    origin + targetPath
  )})}catch(e){}</script>`;

  // Parchea History.pushState/replaceState para que las URLs relativas se
  // resuelvan contra location (nuestro origen) y no contra el <base> del
  // sitio destino. Sin esto, el router de apps como Next.js lanza
  // SecurityError al hacer pushState de rutas relativas y la app no monta.
  const historyPatch = `<script>(function(){
"use strict";
function sameOrigin(u){
  if(u===null||u===undefined)return null;
  var v=String(u);
  if(!v||v.charAt(0)==="#")return null;
  try{
    var r=new URL(v,location.href);
    if(r.origin===location.origin)return r.href;
  }catch(e){}
  return null;
}
function wrap(m){
  var o=History.prototype[m];
  History.prototype[m]=function(s,t,u){
    try{
      if(u===null||u===undefined)return o.call(this,s,t);
      return o.call(this,s,t,sameOrigin(u)!==null?sameOrigin(u):String(u));
    }catch(e){
      return undefined;
    }
  };
}
wrap("pushState");
wrap("replaceState");
})();</script>`;

  // Reescribe los <a href> absolutos para seguir dentro del proxy.
  html = html.replace(
    /(<a\s[^>]*?href=)(["'])(https?:\/\/[^"']+)\2/gi,
    (_match: string, prefix: string, quote: string, href: string) =>
      `${prefix}${quote}${origin}${PROXY_PREFIX}${encodeURIComponent(href)}${quote}`
  );

  // Reescribe <a href> relativos (excepto #, javascript:, mailto:, etc.).
  html = html.replace(
    /(<a\s[^>]*?href=)(["'])((?!(?:https?:)?\/\/|#|javascript:|mailto:|tel:|data:)[^"']*)\2/gi,
    (
      _match: string,
      prefix: string,
      quote: string,
      href: string
    ): string => {
      if (!href.trim()) return `${prefix}${quote}${href}${quote}`;
      try {
        const absolute = new URL(href, finalUrl).toString();
        return `${prefix}${quote}${origin}${PROXY_PREFIX}${encodeURIComponent(absolute)}${quote}`;
      } catch {
        return `${prefix}${quote}${href}${quote}`;
      }
    }
  );

  // Inyecta <base> + parche de History + replaceState antes que nada en <head>.
  const headInjection = `${baseTag}${historyPatch}${pathScript}`;
  if (/<head[^>]*>/i.test(html)) {
    html = html.replace(/<head([^>]*)>/i, `<head$1>${headInjection}`);
  } else if (/<html[^>]*>/i.test(html)) {
    html = html.replace(/<html([^>]*)>/i, `<html$1><head>${headInjection}</head>`);
  } else {
    html = `${headInjection}${html}`;
  }

  const targetHost = escapeHtml(
    (() => {
      try {
        return new URL(target.toString()).hostname;
      } catch {
        return target.toString();
      }
    })()
  );

  const htmlResponse = new NextResponse(html, {
    status: response.status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-lucid-proxy": "intercepted",
      "x-lucid-target": targetHost,
    },
  });

  // Guarda el origen del último sitio interceptado. El middleware lo usa
  // para rescatar las navegaciones internas de los sitios (rutas que sus
  // routers resuelven contra nuestro origen y que antes terminaban en 404).
  htmlResponse.cookies.set("lucid-ctx", finalUrlObj.origin, {
    path: "/",
    sameSite: "lax",
    maxAge: 6 * 60 * 60,
  });

  return htmlResponse;
}
