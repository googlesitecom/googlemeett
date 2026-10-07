"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_APPEARANCE,
  appearanceLooksValid,
  parseAppearance,
  resolveFaviconHref,
  type Appearance,
} from "@/lib/appearance";
import type { Me } from "@/hooks/use-friends";

/**
 * Apariencia de la página: nombre de la pestaña real (document.title) y
 * favicon del navegador.
 *
 * - Al montar se aplica la caché de localStorage (instantáneo).
 * - Al iniciar sesión se recupera la apariencia guardada en la cuenta,
 *   pero SOLO si el servidor tiene algo más reciente que la caché local
 *   (marcas de tiempo `updatedAt`): así nunca se pierde una personalización
 *   cuyo guardado no llegó a completarse.
 * - Cada cambio se aplica en vivo, se cachea localmente y se guarda en el
 *   servidor (con un pequeño retardo mientras se escribe).
 * - Al ocultar o cerrar la pestaña se vuelca el guardado pendiente con
 *   `keepalive`, de modo que ningún cambio se pierda.
 *
 * `auth` es el estado de sesión de page.tsx ("loading" | null | Me).
 */

const CACHE_KEY = "lucid-appearance";
const SAVE_DEBOUNCE_MS = 600;

function readCachedAppearance(): Appearance {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) return parseAppearance(raw);
  } catch {
    /* almacenamiento no disponible */
  }
  return { ...DEFAULT_APPEARANCE };
}

function cacheAppearance(next: Appearance): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(next));
  } catch {
    /* almacenamiento no disponible */
  }
}

/** Reemplaza los <link rel=icon> existentes por el favicon elegido. */
function applyAppearanceToDocument(appearance: Appearance): void {
  if (typeof document === "undefined") return;

  document.title = appearance.title || DEFAULT_APPEARANCE.title;

  const href = resolveFaviconHref(appearance);
  const head = document.head;

  // Next inyecta su propio <link rel="icon"> en el <head>: hay que
  // retirarlo para que el navegador no lo prefiera sobre el nuestro.
  head
    .querySelectorAll('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]')
    .forEach((node) => node.remove());

  const link = document.createElement("link");
  link.rel = "icon";
  link.href = href;
  if (href.startsWith("data:image/svg+xml")) {
    link.type = "image/svg+xml";
  } else if (href.startsWith("data:image/png")) {
    link.type = "image/png";
  } else if (href.startsWith("data:image/")) {
    link.type = "image";
  }
  head.appendChild(link);
}

export function useAppearance(auth: "loading" | null | Me) {
  // Lectura perezosa de la caché: no afecta al HTML renderizado (solo
  // cambia document.title y el <link> del <head>), así que no rompe la
  // hidratación.
  const [appearance, setAppearanceState] = useState<Appearance>(() =>
    typeof window === "undefined"
      ? { ...DEFAULT_APPEARANCE }
      : readCachedAppearance()
  );

  const saveTimer = useRef<number | null>(null);
  const latestRef = useRef<Appearance>(appearance);
  const authRef = useRef<"loading" | null | Me>(auth);

  const sendToServer = useCallback(
    (next: Appearance, keepalive: boolean) => {
      fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
        keepalive,
      }).catch(() => undefined);
    },
    []
  );

  useEffect(() => {
    authRef.current = auth;
  }, [auth]);

  /** Envía ya el guardado pendiente (si lo hay y es válido). */
  const flushPending = useCallback(() => {
    if (saveTimer.current === null) return;
    window.clearTimeout(saveTimer.current);
    saveTimer.current = null;
    const next = latestRef.current;
    const current = authRef.current;
    if (!current || current === "loading" || !appearanceLooksValid(next)) {
      return;
    }
    sendToServer(next, true);
  }, [sendToServer]);

  /* Aplicar en vivo cada cambio. */
  useEffect(() => {
    latestRef.current = appearance;
    applyAppearanceToDocument(appearance);
  }, [appearance]);

  /* Volcado de seguridad: al ocultar o cerrar la pestaña nunca se pierde
     un cambio que estuviera esperando el retardo de guardado. */
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flushPending();
    };
    window.addEventListener("pagehide", flushPending);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", flushPending);
      document.removeEventListener("visibilitychange", onVisibility);
      flushPending();
    };
  }, [flushPending]);

  /* Recuperar la apariencia de la cuenta al iniciar sesión — sin perder
     cambios locales más recientes que los del servidor. */
  useEffect(() => {
    if (!auth || auth === "loading") return;

    let alive = true;
    // Aplazado al siguiente tick para no llamar setState de forma
    // síncrona dentro del efecto.
    const kick = window.setTimeout(() => {
      fetch("/api/settings", { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!alive || !data?.success) return;
          const server = parseAppearance(JSON.stringify(data.appearance));
          const local = readCachedAppearance();
          const serverTime = server.updatedAt ?? 0;
          const localTime = local.updatedAt ?? 0;

          if (localTime > serverTime && appearanceLooksValid(local)) {
            // La caché local es más reciente (un guardado que no llegó al
            // servidor): se conserva y se vuelve a enviar.
            setAppearanceState(local);
            sendToServer(local, false);
            return;
          }

          setAppearanceState(server);
          cacheAppearance(server);
        })
        .catch(() => undefined);
    }, 0);

    return () => {
      alive = false;
      window.clearTimeout(kick);
    };
  }, [auth, sendToServer]);

  /** Cambiar la apariencia: aplica, cachea y guarda en el servidor. */
  const setAppearance = useCallback(
    (next: Appearance) => {
      // Marca de tiempo: garantiza que la versión más reciente gane.
      const stamped: Appearance = { ...next, updatedAt: Date.now() };
      setAppearanceState(stamped);
      latestRef.current = stamped;
      cacheAppearance(stamped);

      const current = authRef.current;
      if (!current || current === "loading" || !appearanceLooksValid(stamped)) {
        return;
      }

      if (saveTimer.current !== null) {
        window.clearTimeout(saveTimer.current);
      }
      saveTimer.current = window.setTimeout(() => {
        saveTimer.current = null;
        sendToServer(stamped, false);
      }, SAVE_DEBOUNCE_MS);
    },
    [sendToServer]
  );

  /** Volver a los valores por defecto (título y logo de Lucid). */
  const resetAppearance = useCallback(() => {
    setAppearance({ ...DEFAULT_APPEARANCE });
  }, [setAppearance]);

  /** Al cerrar sesión: volcar lo pendiente, limpiar caché y volver al
      aspecto por defecto. Debe llamarse ANTES de cerrar la sesión. */
  const clearAppearanceForLogout = useCallback(() => {
    flushPending();
    if (saveTimer.current !== null) {
      window.clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch {
      /* almacenamiento no disponible */
    }
    setAppearanceState({ ...DEFAULT_APPEARANCE });
  }, [flushPending]);

  return { appearance, setAppearance, resetAppearance, clearAppearanceForLogout };
}
