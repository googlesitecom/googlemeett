/* ============================================================
   Lucid · Motor proxy 100% cliente (Service Worker)
   ------------------------------------------------------------
   Replica el proxy del servidor: las páginas se sirven desde
   ESTE mismo origen, dentro de la app.
   - Ruta: {scope}p/{URL codificada}
   - 1er intento: fetch DIRECTO (GitHub Pages envía
     access-control-allow-origin: * -> los juegos cargan sin
     ningún servicio externo y con pathname fiel).
   - Si el sitio no permite CORS: se responde una página
     "delegada" que obtiene el HTML desde el propio marco
     (red del contexto de página) con una cadena de proveedores
     públicos, lo reescribe y lo monta con document.write.
   - HTML: inyecta <base>, reescribe <a>/<form> para que la
     navegación SIGA DENTRO del proxy, parchea History
     (pushState de apps Next.js) y fija location.pathname.
   - Nunca Google. Nunca pestañas externas. Todo aquí dentro.
   ============================================================ */
'use strict';

var VERSION = 'lucid-sw-v18';
var SCOPE   = new URL(self.registration.scope).pathname;   /* '/googlemeett/' o '/' */
var PRX     = SCOPE + 'p/';                                /* ruta del proxy        */
var CTX     = 'lucid-ctx-v1';                              /* cache KV auxiliar     */
var DIRECT_MS = 8000;                                      /* espera máx. fetch directo */

/* ---------- utilidades ---------- */
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function hdr(ct, cc) {
  var h = { 'content-type': ct, 'x-lucid-ver': VERSION };
  h['cache-control'] = cc || 'public, max-age=300';
  return h;
}
function RH(ct, cc, status) {   /* init correcto para new Response */
  return { status: status || 200, headers: hdr(ct, cc) };
}
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise(function (_, rej) { setTimeout(function () { rej(new Error('lucid-timeout')) }, ms) })
  ]);
}
function looksHtml(txt) { return /^\s*(?:<!doctype\s+html|<html)/i.test(String(txt || '')); }
function isChallenge(txt) {
  return /class="(?:anomaly|challenge|cf-)|unusually high amount|blocked ddos|verify you are a human/i.test(String(txt || ''));
}

/* ---------- reescritura del HTML (autocontenida, se serializa también al delegado) ---------- */
function rewriteCore(html, finalUrl, prx) {
  var final = new URL(finalUrl);
  function px(u) { return prx + encodeURIComponent(u); }

  var baseTag = '<base href="' + esc(finalUrl) + '">';

  var historyPatch = '<script>(function(){"use strict";' +
    'function so(u){if(u==null)return null;var v=String(u);if(!v||v.charAt(0)==="#")return null;' +
    'try{var r=new URL(v,location.href);if(r.origin===location.origin)return r.href}catch(e){}return null}' +
    'function w(m){var o=History.prototype[m];History.prototype[m]=function(s,t,u){' +
    'try{if(u==null)return o.call(this,s,t);var x=so(u);return o.call(this,s,t,x!==null?x:String(u))}' +
    'catch(e){return undefined}}}' +
    'w("pushState");w("replaceState")})();<' + '/script>';

  var pathScript = '<script>try{history.replaceState(null,"",' + JSON.stringify(final.pathname + final.search) + ')}catch(e){}<' + '/script>';

  var notify = '<script>try{parent.postMessage({lucidNav:1,lucidTitle:document.title,lucidHref:' + JSON.stringify(finalUrl) + '},"*")}catch(e){}<' + '/script>';

  html = String(html).replace(/(<a\s[^>]*?href=)(["'])(https?:\/\/[^"']+)\2/gi, function (m, p, q, h) {
    try { return p + q + px(new URL(h, finalUrl).href) + q; } catch (e) { return m; }
  });
  html = html.replace(/(<a\s[^>]*?href=)(["'])((?!(?:https?:)?\/\/|#|javascript:|mailto:|tel:|data:)[^"']*)\2/gi, function (m, p, q, h) {
    if (!h.trim()) return m;
    try { return p + q + px(new URL(h, finalUrl).href) + q; } catch (e) { return m; }
  });

  html = html.replace(/(<form\s[^>]*?action=)(["'])(https?:\/\/[^"']+)\2/gi, function (m, p, q, h) {
    try { return p + q + px(new URL(h, finalUrl).href) + q; } catch (e) { return m; }
  });
  html = html.replace(/(<form\s[^>]*?action=)(["'])((?!(?:https?:)?\/\/|#|javascript:)[^"']*)\2/gi, function (m, p, q, h) {
    if (!h.trim()) return m;
    try { return p + q + px(new URL(h, finalUrl).href) + q; } catch (e) { return m; }
  });
  html = html.replace(/(<form\s[^>]*?)\smethod=("|')post\2/gi, '$1');

  html = html.replace(/(<a\b[^>]*?)\starget=("|')_blank\2/gi, '$1');

  html = html.replace(/<meta\b[^>]*http-equiv=("|')?content-security-policy\1?[^>]*>/gi, '');

  var inject = baseTag + historyPatch + pathScript;
  if (/<head[^>]*>/i.test(html)) html = html.replace(/<head([^>]*)>/i, function (m, a) { return '<head' + a + '>' + inject });
  else if (/<html[^>]*>/i.test(html)) html = html.replace(/<html([^>]*)>/i, '<html$1><head>' + inject + '</head>');
  else html = inject + html;

  return html + notify;
}

/* ---------- página de error (estética Lucid) ---------- */
function errorPage(title, msg, target, detail) {
  var safe = String(target == null ? '' : target).replace(/<[^>]*>/g, '');
  return '<!DOCTYPE html><html lang="es" data-lucid-error="1"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc(title) + '</title><style>' +
    ':root{color-scheme:dark}*{margin:0;padding:0;box-sizing:border-box}' +
    'body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#000;color:#fff;' +
    'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;padding:24px}' +
    '.card{max-width:560px;width:100%;text-align:center;background:rgba(255,255,255,.045);' +
    'border:1px solid rgba(255,255,255,.12);border-radius:20px;padding:46px 30px}' +
    '.badge{display:inline-block;font-size:11px;letter-spacing:.16em;text-transform:uppercase;font-weight:700;' +
    'background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.22);padding:6px 14px;border-radius:999px;margin-bottom:22px}' +
    'h1{font-size:21px;margin-bottom:12px}p{color:rgba(255,255,255,.6);font-size:14px;line-height:1.65;margin-bottom:10px}' +
    'code{display:block;margin:18px 0;padding:12px 14px;border-radius:10px;background:rgba(255,255,255,.05);' +
    'border:1px solid rgba(255,255,255,.1);font-family:ui-monospace,Menlo,monospace;font-size:12px;' +
    'color:rgba(255,255,255,.75);word-break:break-all}' +
    '.b{display:inline-flex;align-items:center;gap:8px;margin:6px 4px 0;padding:11px 18px;border-radius:12px;' +
    'border:1px solid rgba(255,255,255,.28);background:#fff;color:#000;font-weight:600;font-size:13px;cursor:pointer}' +
    '.b.g{background:transparent;color:#fff}' +
    'small{display:block;margin-top:16px;color:rgba(255,255,255,.35);font-size:11px}' +
    '</style></head><body><div class="card"><div class="badge">Proxy Lucid</div>' +
    '<h1>' + esc(title) + '</h1><p>' + esc(msg) + '</p><code>' + esc(safe) + '</code>' +
    '<div><button class="b" onclick="location.reload()">Reintentar</button>' +
    '<button class="b g" id="opx">Abrir en pestaña real ↗</button></div>' +
    '<small>' + esc(detail || '') + '</small></div>' +
    '<script>var U=' + JSON.stringify(safe) + ';document.getElementById("opx").onclick=function(){window.open(U,"_blank","noopener")}<' + '/script>' +
    '</body></html>';
}

/* ---------- página delegada ---------- */
/* La cadena de proveedores corre dentro del propio marco (red del contexto
   de página) y monta el resultado con document.write. */
function delegatePage(target) {
  var host = '';
  try { host = new URL(target).hostname; } catch (e) {}
  return '<!DOCTYPE html><html lang="es" data-lucid-delegate="1"><head><meta charset="utf-8">' +
    '<title>Conectando…</title><style>' +
    ':root{color-scheme:dark}body{margin:0;background:#000;color:#fff;height:100vh;display:flex;flex-direction:column;' +
    'align-items:center;justify-content:center;gap:18px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif}' +
    '.sp{width:38px;height:38px;border-radius:50%;border:3px solid rgba(255,255,255,.15);border-top-color:#fff;' +
    'animation:rot 1s linear infinite}@keyframes rot{to{transform:rotate(360deg)}}' +
    '.t{font-size:13px;color:rgba(255,255,255,.55);letter-spacing:.04em}' +
    '</style></head><body><div class="sp"></div><div class="t">Conectando con ' + esc(host) + ' vía proxy…</div>' +
    '<scr' + 'ipt>\n' +
    'var TARGET=' + JSON.stringify(target) + ';\n' +
    'var PRX=' + JSON.stringify(PRX) + ';\n' +
    rewriteCore.toString() + '\n' +
    '(function(){\n' +
    'function wt(p,ms){return Promise.race([p,new Promise(function(_,rej){setTimeout(function(){rej(new Error("t"))},ms)})])}\n' +
    'var PROVS=[\n' +
    '  {u:"https://api.allorigins.win/raw?url="+encodeURIComponent(TARGET)},\n' +
    '  {u:"https://api.codetabs.com/v1/proxy?quest="+encodeURIComponent(TARGET)},\n' +
    '  {j:1,u:"https://api.allorigins.win/get?url="+encodeURIComponent(TARGET)}\n' +
    '];\n' +
    'function mount(html){\n' +
    '  try{navigator.serviceWorker.controller.postMessage({lucidCtx:new URL(TARGET).origin})}catch(e){}\n' +
    '  document.open();document.write(rewriteCore(html,TARGET,PRX));document.close();\n' +
    '}\n' +
    'function err(){location.replace(PRX+"error/"+encodeURIComponent(TARGET))}\n' +
    '(async function(){\n' +
    '  for(var i=0;i<PROVS.length;i++){\n' +
    '    try{\n' +
    '      var r=await wt(fetch(PROVS[i].u,{credentials:"omit"}),11000);\n' +
    '      if(!r.ok)continue;\n' +
    '      if(PROVS[i].j){\n' +
    '        var j=await r.json();\n' +
    '        if(!j||j.contents==null)continue;\n' +
    '        mount(j.contents);return;\n' +
    '      }\n' +
    '      var ct=r.headers.get("content-type")||"";\n' +
    '      if(ct.indexOf("html")===-1&&ct.indexOf("xhtml")===-1){\n' +
    '        if(ct.indexOf("text/")===0||!ct){var t=await r.text();mount(t);return}\n' +
    '        continue;\n' +
    '      }\n' +
    '      var txt=await r.text();\n' +
    '      if(/class="(?:anomaly|challenge|cf-)|unusually high amount|blocked ddos|verify you are a human/i.test(txt))continue;\n' +
    '      mount(txt);return;\n' +
    '    }catch(e){}\n' +
    '  }\n' +
    '  err();\n' +
    '})();\n' +
    '})();</scr' + 'ipt></body></html>';
}

/* ---------- memoria del último origen (rescate de rutas) ---------- */
function rememberOrigin(o) {
  try {
    caches.open(CTX).then(function (c) { c.put('/last-origin', new Response(o)) });
  } catch (e) {}
}
async function lastOrigin() {
  try {
    var c = await caches.open(CTX);
    var r = await c.match('/last-origin');
    if (r) return await r.text();
  } catch (e) {}
  return null;
}
self.addEventListener('message', function (e) {
  if (e.data && e.data.lucidCtx) rememberOrigin(String(e.data.lucidCtx));
});

/* ---------- manejo del proxy ---------- */
function targetOf(url) {
  var raw = url.pathname.substring(PRX.length);
  if (!raw) return '';
  var t = decodeURIComponent(raw);
  if (url.search) t += (t.indexOf('?') > -1 ? '&' : '?') + url.search.slice(1);
  return t;
}

async function handleProxy(url) {
  var raw = url.pathname.substring(PRX.length);
  /* ruta de error del delegado: /p/error/{URL} */
  if (/^error%2F/i.test(raw) || /^error\//i.test(decodeURIComponent(raw))) {
    var bad = decodeURIComponent(raw.replace(/^error%2F/i, '').replace(/^error\//i, ''));
    return new Response(
      errorPage('El sitio no respondió',
        'Ningún proveedor pudo obtener la página. Puede que el sitio bloquee proxies o que la red esté caída. Reintenta o ábrela en una pestaña real.',
        bad, 'Proveedores probados: allorigins, codetabs'),
      RH('text/html; charset=utf-8', 'no-store', 502));
  }
  var target = targetOf(url);
  if (!target) {
    return new Response('<meta http-equiv="refresh" content="0;url=' + esc(SCOPE) + '">', RH('text/html; charset=utf-8', 'no-store'));
  }
  if (!/^https?:\/\//i.test(target)) {
    return new Response(errorPage('URL no válida', 'El proxy necesita una dirección http(s) completa.', target), RH('text/html; charset=utf-8', 'no-store', 400));
  }

  /* 1) fetch directo (CORS) — github.io y cualquier host con ACAO:* */
  try {
    var r = await withTimeout(fetch(target, { credentials: 'omit' }), DIRECT_MS);
    if (r.ok) {
      var ctype = r.headers.get('content-type') || '';
      if (ctype.indexOf('html') > -1 || ctype.indexOf('xhtml') > -1 || (!ctype && looksHtml(await r.clone().text()))) {
        var txt = await r.text();
        if (!isChallenge(txt)) {
          var final = target;
          try { if (r.url && new URL(r.url).protocol.indexOf('http') === 0) final = r.url; } catch (e) {}
          rememberOrigin(new URL(final).origin);
          return new Response(rewriteCore(txt, final, PRX), RH('text/html; charset=utf-8', 'no-store'));
        }
      } else {
        var buf = await r.arrayBuffer();
        return new Response(buf, RH(ctype || 'application/octet-stream'));
      }
    }
  } catch (e) { /* sin CORS o sin red: se delega */ }

  /* 2) delegado: la cadena de proveedores corre dentro del marco */
  return new Response(delegatePage(target), RH('text/html; charset=utf-8', 'no-store'));
}

/* ---------- rescate de navegaciones internas ---------- */
async function rescue(req, url) {
  try {
    var r = await fetch(req);
    if (r.status !== 404) return r; /* era un archivo real */
  } catch (e) { /* sin red: sigue */ }

  var last = await lastOrigin();
  if (last) {
    var sitePath = url.pathname.indexOf(SCOPE) === 0 ? url.pathname.slice(SCOPE.length - 1) : url.pathname;
    var dest = sitePath + url.search;
    try { dest = new URL(dest, last).href; } catch (e) { dest = last; }
    var page = '<!DOCTYPE html><html><head><meta charset="utf-8">' +
      '<meta http-equiv="refresh" content="0;url=' + esc(PRX + encodeURIComponent(dest)) + '">' +
      '<title>Redirigiendo…</title></head>' +
      '<body style="background:#000;color:#fff;font-family:sans-serif;display:grid;place-items:center;height:100vh;margin:0">Redirigiendo…</body></html>';
    return new Response(page, RH('text/html; charset=utf-8', 'no-store'));
  }
  return new Response(errorPage('Página no encontrada', 'Esa ruta no existe aquí y no hay contexto de proxy para rescatarla.', url.pathname), RH('text/html; charset=utf-8', 'no-store', 404));
}

/* ---------- ciclo de vida ---------- */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil((async function () {
    try { await clients.claim(); } catch (err) {}
    try {
      var keys = await caches.keys();
      await Promise.all(keys.filter(function (k) { return k !== CTX }).map(function (k) { return caches.delete(k) }));
    } catch (err) {}
  })());
});

/* ---------- enrutador principal ---------- */
function isAppPath(p) {
  if (p === SCOPE || p === SCOPE + 'index.html' || p === SCOPE.slice(0, -1)) return true;
  var files = ['sw.js', 'README.md', '.nojekyll', 'favicon.ico', '404.html', 'LICENSE', 'blank.html'];
  return files.some(function (f) { return p === SCOPE + f });
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.mode !== 'navigate' && req.method !== 'GET') return;
  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== location.origin) return;              /* fuera de nuestro origen */
  if (url.pathname.indexOf(PRX) === 0) {                   /* ruta del proxy */
    e.respondWith(handleProxy(url).catch(function (err) {
      return new Response(errorPage('Error del proxy', 'El motor proxy encontró un error inesperado.', targetOf(url) || url.pathname, String(err && err.message || err)), RH('text/html; charset=utf-8', 'no-store', 500));
    }));
    return;
  }
  if (req.mode === 'navigate' && !isAppPath(url.pathname)) { /* posibles rutas de sitios */
    e.respondWith(rescue(req, url));
  }
});
