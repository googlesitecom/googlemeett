"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Loader2 } from "lucide-react";
import { Rail, type PanelKind } from "@/components/browser/rail";
import { GamesPanel } from "@/components/browser/games-panel";
import { ChatPanel } from "@/components/browser/chat-panel";
import { SettingsPanel } from "@/components/browser/settings-panel";
import { AuthScreen } from "@/components/browser/auth-screen";
import { TabStrip, Toolbar, type TabLite } from "@/components/browser/chrome";
import { StartPage, SearchPage } from "@/components/browser/pages";
import {
  NEW_TAB_URL,
  gameByUrl,
  hostnameOf,
  isLikelyUrl,
  makeSearchUrl,
  normalizeUrl,
  parseSearchUrl,
  type Game,
} from "@/lib/games";
import { useFriendsData, type Me } from "@/hooks/use-friends";
import { useAppearance } from "@/hooks/use-appearance";
import {
  persistSnapshot,
  subscribePersist,
  writePersist,
} from "@/lib/persist";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */

type TabKind = "newtab" | "search" | "web";

interface Tab {
  id: string;
  history: string[];
  index: number;
  title: string;
  loading: boolean;
  reloadKey: number;
}

let tabCounter = 0;

function createTab(url: string = NEW_TAB_URL): Tab {
  tabCounter += 1;
  return {
    id: `tab-${Date.now()}-${tabCounter}-${Math.random().toString(36).slice(2, 7)}`,
    history: [url],
    index: 0,
    title: titleFor(url),
    loading: false,
    reloadKey: 0,
  };
}

function urlKind(url: string): TabKind {
  if (url === NEW_TAB_URL) return "newtab";
  if (url.startsWith("lucid://search")) return "search";
  return "web";
}

function titleFor(url: string): string {
  const kind = urlKind(url);
  if (kind === "newtab") return "Nueva pestaña";
  if (kind === "search") {
    return `${parseSearchUrl(url) ?? ""} — Lucid`;
  }
  return gameByUrl(url)?.name ?? hostnameOf(url);
}

/* ------------------------------------------------------------------ */

function parseFavorites(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

const EMPTY_FAVORITES: string[] = [];

function parseFlag(raw: string): boolean {
  return raw === "on";
}

/** Preferencia booleana persistida (proxy, rail...). */
function usePersistedFlag(
  key: string,
  fallback: boolean
): [boolean, (next: boolean) => void] {
  const value = useSyncExternalStore(
    subscribePersist,
    () => persistSnapshot(key, parseFlag, fallback),
    () => fallback
  );
  const setValue = useCallback(
    (next: boolean) => writePersist(key, next ? "on" : "off"),
    [key]
  );
  return [value, setValue];
}

/** Lista de juegos favoritos persistida. */
function useFavorites(): [
  string[],
  (updater: (prev: string[]) => string[]) => void,
] {
  const FAVS_KEY = "lucid-favs";
  const value = useSyncExternalStore(
    subscribePersist,
    () => persistSnapshot(FAVS_KEY, parseFavorites, EMPTY_FAVORITES),
    () => EMPTY_FAVORITES
  );
  const update = useCallback(
    (updater: (prev: string[]) => string[]) => {
      const current = persistSnapshot(FAVS_KEY, parseFavorites, EMPTY_FAVORITES);
      writePersist(FAVS_KEY, JSON.stringify(updater(current)));
    },
    []
  );
  return [value, update];
}

/** Pantalla de carga inicial mientras se comprueba la sesión. */
function SplashScreen() {
  return (
    <div className="flex h-dvh w-full items-center justify-center bg-[#0b0b12]">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-14 w-14 animate-pulse items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-emerald-400 shadow-xl shadow-fuchsia-500/25">
          <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden="true">
            <path
              d="M6 4h3.2v10.5H18V20H6V4z"
              fill="rgba(255,255,255,0.95)"
            />
          </svg>
        </div>
        <div className="flex items-center gap-2 text-[12px] text-zinc-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-fuchsia-400" />
          Abriendo Lucid...
        </div>
      </div>
    </div>
  );
}

export default function LucidBrowser() {
  /* ------------------------- Sesión ------------------------- */
  const [auth, setAuth] = useState<"loading" | null | Me>("loading");

  useEffect(() => {
    let alive = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!alive) return;
        setAuth(data?.success ? (data.user as Me) : null);
      })
      .catch(() => {
        if (alive) setAuth(null);
      });
    return () => {
      alive = false;
    };
  }, []);

  /* ------------------------- Estado del navegador ------------------------- */
  const [tabs, setTabs] = useState<Tab[]>(() => [createTab()]);
  const [activeId, setActiveId] = useState<string>(() => tabs[0]?.id ?? "");
  const [proxyEnabled, setProxyEnabled] = usePersistedFlag("lucid-proxy", true);
  const [favorites, updateFavorites] = useFavorites();
  const [railVisible, setRailVisible] = usePersistedFlag("lucid-rail", true);
  const [panel, setPanel] = useState<PanelKind>("none");

  /* Apariencia de la página: nombre de la pestaña y logo (favicon). */
  const {
    appearance,
    setAppearance,
    resetAppearance,
    clearAppearanceForLogout,
  } = useAppearance(auth);

  const handleLogout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    clearAppearanceForLogout();
    setAuth(null);
    setPanel("none");
  }, [clearAppearanceForLogout]);

  const omniboxRef = useRef<HTMLInputElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);

  const authenticated = auth !== "loading" && auth !== null;
  const { data: friendsData, refresh: refreshFriends } = useFriendsData(
    authenticated ? 8000 : null
  );

  const activeTab = useMemo(
    () => tabs.find((t) => t.id === activeId) ?? tabs[0],
    [tabs, activeId]
  );

  const currentUrl = activeTab
    ? activeTab.history[activeTab.index]
    : NEW_TAB_URL;
  const currentKind = urlKind(currentUrl);

  /* ------------------------- Navegación ------------------------- */

  const navigate = useCallback(
    (tabId: string, url: string) => {
      setTabs((prev) =>
        prev.map((tab) => {
          if (tab.id !== tabId) return tab;
          const kind = urlKind(url);
          const history = [...tab.history.slice(0, tab.index + 1), url];
          return {
            ...tab,
            history,
            index: history.length - 1,
            title: titleFor(url),
            loading: kind === "web",
            reloadKey: tab.reloadKey,
          };
        })
      );

      // Red de seguridad: nunca dejar el indicador de carga colgado.
      if (urlKind(url) === "web") {
        window.setTimeout(() => {
          setTabs((prev) =>
            prev.map((tab) =>
              tab.id === tabId && tab.loading ? { ...tab, loading: false } : tab
            )
          );
        }, 12000);
      }
    },
    []
  );

  const goBack = useCallback(() => {
    setTabs((prev) =>
      prev.map((tab) => {
        if (tab.id !== activeId || tab.index <= 0) return tab;
        const index = tab.index - 1;
        return {
          ...tab,
          index,
          title: titleFor(tab.history[index]),
          loading: urlKind(tab.history[index]) === "web",
        };
      })
    );
  }, [activeId]);

  const goForward = useCallback(() => {
    setTabs((prev) =>
      prev.map((tab) => {
        if (tab.id !== activeId || tab.index >= tab.history.length - 1)
          return tab;
        const index = tab.index + 1;
        return {
          ...tab,
          index,
          title: titleFor(tab.history[index]),
          loading: urlKind(tab.history[index]) === "web",
        };
      })
    );
  }, [activeId]);

  const reload = useCallback(() => {
    setTabs((prev) =>
      prev.map((tab) => {
        if (tab.id !== activeId) return tab;
        const url = tab.history[tab.index];
        return {
          ...tab,
          reloadKey: tab.reloadKey + 1,
          loading: urlKind(url) === "web",
        };
      })
    );
  }, [activeId]);

  const goHome = useCallback(() => {
    if (activeTab) navigate(activeTab.id, NEW_TAB_URL);
  }, [activeTab, navigate]);

  const handleOmniboxInput = useCallback(
    (input: string) => {
      const value = input.trim();
      if (!value || !activeTab) return;
      const url = isLikelyUrl(value)
        ? normalizeUrl(value)
        : makeSearchUrl(value);
      navigate(activeTab.id, url);
    },
    [activeTab, navigate]
  );

  const openGame = useCallback(
    (game: Game) => {
      if (activeTab) navigate(activeTab.id, game.url);
      setPanel("none");
    },
    [activeTab, navigate]
  );

  const doSearch = useCallback(
    (query: string) => {
      if (activeTab) navigate(activeTab.id, makeSearchUrl(query));
    },
    [activeTab, navigate]
  );

  /* ------------------------- Pestañas ------------------------- */

  const newTab = useCallback(() => {
    const tab = createTab();
    setTabs((prev) => [...prev, tab]);
    setActiveId(tab.id);
  }, []);

  const closeTab = useCallback(
    (id: string) => {
      const idx = tabs.findIndex((t) => t.id === id);
      if (idx === -1) return;
      if (tabs.length === 1) {
        const fresh = createTab();
        setTabs([fresh]);
        setActiveId(fresh.id);
        return;
      }
      const next = tabs.filter((t) => t.id !== id);
      if (id === activeId) {
        setActiveId(next[Math.min(idx, next.length - 1)].id);
      }
      setTabs(next);
    },
    [tabs, activeId]
  );

  /* ------------------------- Utilidades ------------------------- */

  const toggleProxy = useCallback(
    () => setProxyEnabled(!proxyEnabled),
    [proxyEnabled, setProxyEnabled]
  );

  const toggleFavorite = useCallback(
    (gameId: string) => {
      updateFavorites((prev) =>
        prev.includes(gameId)
          ? prev.filter((f) => f !== gameId)
          : [...prev, gameId]
      );
    },
    [updateFavorites]
  );

  const toggleFullscreen = useCallback(() => {
    const node = shellRef.current;
    if (!node) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => undefined);
    } else {
      node.requestFullscreen().catch(() => undefined);
    }
  }, []);

  const openExternal = useCallback(() => {
    if (currentUrl.startsWith("http")) {
      window.open(currentUrl, "_blank", "noopener,noreferrer");
    }
  }, [currentUrl]);

  const openPanel = useCallback((next: Exclude<PanelKind, "none">) => {
    setPanel((prev) => (prev === next ? "none" : next));
  }, []);

  const handleIframeLoad = useCallback(
    (tabId: string, event: React.SyntheticEvent<HTMLIFrameElement>) => {
      const iframe = event.target as HTMLIFrameElement;
      // Enfoca el iframe para que el juego responda al teclado de inmediato
      // (antes quedaba "trabado" hasta que hacías clic dentro).
      try {
        iframe.contentWindow?.focus();
      } catch {
        /* contenido de otro origen */
      }
      setTabs((prev) =>
        prev.map((tab) => {
          if (tab.id !== tabId) return tab;
          let title = tab.title;
          try {
            const doc = iframe.contentDocument;
            const docTitle = doc?.title?.trim();
            if (docTitle) title = docTitle.slice(0, 64);
          } catch {
            /* contenido de otro origen */
          }
          return { ...tab, loading: false, title: title || tab.title };
        })
      );
    },
    []
  );

  /* ------------------- Atajos de teclado ------------------- */

  useEffect(() => {
    function handler(event: KeyboardEvent) {
      if (!event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === "t") {
        event.preventDefault();
        newTab();
      } else if (key === "w") {
        event.preventDefault();
        closeTab(activeId);
      } else if (key === "l") {
        event.preventDefault();
        omniboxRef.current?.focus();
      } else if (key === "r") {
        event.preventDefault();
        reload();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        goBack();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        goForward();
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [newTab, closeTab, activeId, reload, goBack, goForward]);

  /* ------------------------- Render ------------------------- */

  if (auth === "loading") return <SplashScreen />;
  if (!auth) return <AuthScreen onAuthenticated={(user) => setAuth(user)} />;

  const tabLites: TabLite[] = tabs.map((tab) => {
    const url = tab.history[tab.index];
    return {
      id: tab.id,
      title: tab.title,
      url,
      kind: urlKind(url),
      loading: tab.loading,
    };
  });

  const unread =
    friendsData?.friends.reduce((total, friend) => total + friend.unread, 0) ??
    0;

  return (
    <div
      ref={shellRef}
      className="relative flex h-dvh w-full overflow-hidden bg-[#0b0b12] text-zinc-100"
    >
      {/* Resplandores de fondo */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[420px] w-[420px] rounded-full bg-violet-600/10 blur-[120px]" />
        <div className="absolute -bottom-40 -right-32 h-[420px] w-[420px] rounded-full bg-emerald-500/[0.07] blur-[120px]" />
        <div className="absolute left-1/2 top-1/3 h-[300px] w-[500px] -translate-x-1/2 rounded-full bg-fuchsia-600/[0.05] blur-[120px]" />
      </div>

      {railVisible && (
        <Rail
          activePanel={panel}
          onOpenPanel={openPanel}
          onHome={goHome}
          onNewTab={newTab}
          onFullscreen={toggleFullscreen}
          proxyEnabled={proxyEnabled}
          onToggleProxy={toggleProxy}
          user={auth}
          onLogout={() => void handleLogout()}
          unread={unread}
        />
      )}

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <TabStrip
          tabs={tabLites}
          activeId={activeTab?.id ?? ""}
          onSelect={setActiveId}
          onClose={closeTab}
          onNew={newTab}
          onToggleSidebar={() => setRailVisible(!railVisible)}
          onFullscreen={toggleFullscreen}
        />

        <Toolbar
          url={currentUrl}
          canBack={!!activeTab && activeTab.index > 0}
          canForward={
            !!activeTab && activeTab.index < activeTab.history.length - 1
          }
          proxyEnabled={proxyEnabled}
          onBack={goBack}
          onForward={goForward}
          onReload={reload}
          onHome={goHome}
          onNavigate={handleOmniboxInput}
          onToggleProxy={toggleProxy}
          onOpenExternal={openExternal}
          onFullscreen={toggleFullscreen}
          omniboxRef={omniboxRef}
        />

        {/* Zona de contenido: una vista por pestaña (conserva el estado) */}
        <main className="relative min-h-0 flex-1 bg-[#0b0b12]">
          {tabs.map((tab) => {
            const url = tab.history[tab.index];
            const kind = urlKind(url);
            const isActive = tab.id === (activeTab?.id ?? "");

            return (
              <div
                key={tab.id}
                aria-hidden={!isActive}
                className={cn(
                  "absolute inset-0",
                  !isActive && "hidden"
                )}
              >
                {kind === "newtab" && (
                  <StartPage
                    onSearch={doSearch}
                    onOpenGames={() => setPanel("games")}
                    onOpenChat={() => setPanel("chat")}
                    onOpenSettings={() => setPanel("settings")}
                    proxyEnabled={proxyEnabled}
                  />
                )}

                {kind === "search" && (
                  <SearchPage
                    query={parseSearchUrl(url) ?? ""}
                    onNavigate={(target) => {
                      if (activeTab) navigate(activeTab.id, target);
                    }}
                    onSearch={doSearch}
                  />
                )}

                {kind === "web" && (
                  <div className="relative h-full w-full">
                    {/* Carga no bloqueante: barra fina arriba + pastilla
                        flotante (antes el velo con blur interceptaba los
                        clics y el juego se sentía trabado). */}
                    {tab.loading && (
                      <>
                        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-[2px] overflow-hidden">
                          <div className="lucid-progress-bar h-full w-1/3 bg-gradient-to-r from-violet-400 via-fuchsia-400 to-emerald-400" />
                        </div>
                        <div className="pointer-events-none absolute bottom-3 left-3 z-20 flex items-center gap-2 rounded-full border border-white/[0.08] bg-[#14141f]/90 px-3.5 py-2 shadow-xl shadow-black/40">
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-fuchsia-400" />
                          <span className="text-[12px] text-zinc-300">
                            {proxyEnabled
                              ? "Cargando a través del proxy..."
                              : "Cargando sitio..."}
                          </span>
                        </div>
                      </>
                    )}
                    <iframe
                      key={`${tab.id}-${tab.reloadKey}`}
                      src={
                        proxyEnabled
                          ? `/api/proxy?url=${encodeURIComponent(url)}`
                          : url
                      }
                      onLoad={(event) => handleIframeLoad(tab.id, event)}
                      className="h-full w-full border-0 bg-white"
                      title={tab.title}
                      allow="fullscreen; autoplay; gamepad; clipboard-write; accelerometer; gyroscope"
                    />
                  </div>
                )}
              </div>
            );
          })}

          {/* Apartados: solo aquí aparecen los juegos y el chat */}
          <GamesPanel
            open={panel === "games"}
            onClose={() => setPanel("none")}
            onOpenGame={openGame}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
          />

          <ChatPanel
            open={panel === "chat"}
            onClose={() => setPanel("none")}
            me={auth}
            data={friendsData}
            refresh={refreshFriends}
          />

          {/* Configuración: personalizar el nombre y el logo de la página */}
          <SettingsPanel
            open={panel === "settings"}
            onClose={() => setPanel("none")}
            me={auth}
            appearance={appearance}
            onChange={setAppearance}
            onReset={resetAppearance}
            onLogout={() => void handleLogout()}
          />
        </main>
      </div>
    </div>
  );
}
