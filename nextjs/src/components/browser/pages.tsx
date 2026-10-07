"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  Gamepad2,
  Loader2,
  MessageSquare,
  Search,
  Settings2,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react";
import { GAMES, faviconUrl, hostnameOf } from "@/lib/games";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Reloj compartido vía useSyncExternalStore (sin setState en efectos)  */
/* ------------------------------------------------------------------ */

let clockSnapshot: number | null = null;

function getClockSnapshot(): number | null {
  if (clockSnapshot === null) clockSnapshot = Date.now();
  return clockSnapshot;
}

function getServerClockSnapshot(): number | null {
  return null;
}

function subscribeToClock(callback: () => void) {
  const timer = setInterval(() => {
    clockSnapshot = Date.now();
    callback();
  }, 1000);
  return () => clearInterval(timer);
}

function useClock(): Date | null {
  const timestamp = useSyncExternalStore(
    subscribeToClock,
    getClockSnapshot,
    getServerClockSnapshot
  );
  return timestamp === null ? null : new Date(timestamp);
}

/* ------------------------------------------------------------------ */
/* Página de inicio (nueva pestaña)                                    */
/* ------------------------------------------------------------------ */

interface StartPageProps {
  onSearch: (query: string) => void;
  onOpenGames: () => void;
  onOpenChat: () => void;
  onOpenSettings: () => void;
  proxyEnabled: boolean;
}

export function StartPage({
  onSearch,
  onOpenGames,
  onOpenChat,
  onOpenSettings,
  proxyEnabled,
}: StartPageProps) {
  const [query, setQuery] = useState("");
  const now = useClock();

  const greeting = now
    ? now.getHours() < 6
      ? "Buena madrugada"
      : now.getHours() < 12
        ? "Buenos días"
        : now.getHours() < 19
          ? "Buenas tardes"
          : "Buenas noches"
    : "Hola";

  return (
    <div className="lucid-scroll h-full overflow-y-auto">
      <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col items-center px-6 py-10 sm:py-14">
        {/* Reloj */}
        <div className="mb-8 text-center">
          <p className="text-[13px] font-medium uppercase tracking-[0.2em] text-zinc-500">
            {greeting}
          </p>
          <p className="mt-1 text-4xl font-semibold tabular-nums tracking-tight text-white sm:text-5xl">
            {now
              ? now.toLocaleTimeString("es-MX", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "--:--"}
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            {now
              ? now.toLocaleDateString("es-MX", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })
              : ""}
          </p>
        </div>

        {/* Marca */}
        <div className="mb-7 flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-emerald-400 shadow-xl shadow-fuchsia-500/25">
            <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
              <path
                d="M6 4h3.2v10.5H18V20H6V4z"
                fill="rgba(255,255,255,0.95)"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              Lucid
            </h1>
            <p className="text-[12px] text-zinc-500">
              Navegación privada para jugar
            </p>
          </div>
        </div>

        {/* Buscador central */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (query.trim()) onSearch(query.trim());
          }}
          className="group relative mb-4 w-full max-w-xl"
        >
          <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-zinc-500 transition-colors group-focus-within:text-fuchsia-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Busca en la web con Lucid (sin Google)"
            aria-label="Buscar en la web"
            className="h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] pl-12 pr-28 text-[14px] text-zinc-200 shadow-lg shadow-black/20 placeholder:text-zinc-600 outline-none transition-all focus:border-fuchsia-500/40 focus:bg-white/[0.06] focus:ring-2 focus:ring-fuchsia-500/20 sm:pr-32"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 flex h-8 -translate-y-1/2 items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-3.5 text-[12px] font-semibold text-white shadow-md shadow-fuchsia-500/25 transition-all hover:brightness-110 active:scale-95"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Buscar</span>
          </button>
        </form>

        <div className="mb-10 flex flex-wrap items-center justify-center gap-2 text-[11px]">
          <span className="flex items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 text-zinc-400">
            <Zap className="h-3 w-3 text-fuchsia-400" />
            Motor propio
          </span>
          <span className="flex items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 text-zinc-400">
            <Shield
              className={cn(
                "h-3 w-3",
                proxyEnabled ? "text-emerald-400" : "text-zinc-500"
              )}
            />
            Proxy {proxyEnabled ? "activado" : "desactivado"}
          </span>
          <span className="flex items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 text-zinc-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            0 servicios de Google
          </span>
        </div>

        {/* Accesos a los apartados (los juegos viven solo en su panel) */}
        <div className="w-full">
          <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Apartados
          </h2>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <ShortcutCard
              onClick={onOpenGames}
              icon={Gamepad2}
              gradient="from-violet-500 to-fuchsia-600"
              glow="shadow-fuchsia-500/30"
              title="Juegos"
              description={`${GAMES.length} títulos listos: F1, Mario Kart, CS2 y Zona Cero.`}
              hint="Abrir con el control"
            />
            <ShortcutCard
              onClick={onOpenChat}
              icon={MessageSquare}
              gradient="from-cyan-500 to-sky-600"
              glow="shadow-sky-500/30"
              title="Chat y amigos"
              description="Agrega amigos con su usuario y chatea mientras juegas."
              hint="Abrir chat"
            />
            <ShortcutCard
              onClick={onOpenSettings}
              icon={Settings2}
              gradient="from-slate-500 to-zinc-600"
              glow="shadow-zinc-500/30"
              title="Personalizar página"
              description="Elige el nombre de la pestaña y su logo; se guarda en tu cuenta."
              hint="Abrir configuración"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ShortcutCard({
  onClick,
  icon: Icon,
  gradient,
  glow,
  title,
  description,
  hint,
}: {
  onClick: () => void;
  icon: typeof Gamepad2;
  gradient: string;
  glow: string;
  title: string;
  description: string;
  hint: string;
}) {
  return (
    <button
      onClick={onClick}
      className="group relative flex w-full items-center gap-4 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 text-left transition-all duration-300 hover:border-white/[0.14] hover:bg-white/[0.04] hover:shadow-xl hover:shadow-black/30"
    >
      <span
        className={cn(
          "pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br opacity-[0.1] blur-3xl transition-opacity duration-300 group-hover:opacity-[0.2]",
          gradient
        )}
      />
      <span
        className={cn(
          "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3",
          gradient,
          glow
        )}
      >
        <Icon className="h-7 w-7 text-white drop-shadow-lg" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-zinc-100">
          {title}
        </span>
        <span className="mt-0.5 block text-[12px] leading-relaxed text-zinc-500">
          {description}
        </span>
        <span className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-fuchsia-400/80 transition-colors group-hover:text-fuchsia-300">
          {hint}
          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </span>
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Página de resultados de búsqueda                                    */
/* ------------------------------------------------------------------ */

interface SearchResultItem {
  url: string;
  name: string;
  snippet: string;
  hostName: string;
  date: string;
}

interface SearchPageProps {
  query: string;
  onNavigate: (url: string) => void;
  onSearch: (query: string) => void;
}

export function SearchPage({ query, onNavigate, onSearch }: SearchPageProps) {
  const [input, setInput] = useState(query);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [status, setStatus] = useState<"loading" | "ok" | "error" | "empty">(
    "loading"
  );

  useEffect(() => {
    setInput(query);
  }, [query]);

  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading");
    setResults([]);

    fetch(`/api/search?q=${encodeURIComponent(query)}`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        if (controller.signal.aborted) return;
        if (data.success && Array.isArray(data.results)) {
          setResults(data.results);
          setStatus(data.results.length > 0 ? "ok" : "empty");
        } else {
          setStatus("error");
        }
      })
      .catch((err) => {
        if (controller.signal.aborted || err?.name === "AbortError") return;
        setStatus("error");
      });

    return () => controller.abort();
  }, [query]);

  return (
    <div className="lucid-scroll h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-2xl px-5 py-6 sm:px-8 sm:py-8">
        {/* Cabecera con refine */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim()) onSearch(input.trim());
          }}
          className="group relative mb-2"
        >
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 group-focus-within:text-fuchsia-400" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            aria-label="Refinar búsqueda"
            className="h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] pl-10 pr-4 text-[14px] text-zinc-200 outline-none transition-all focus:border-fuchsia-500/40 focus:ring-2 focus:ring-fuchsia-500/20"
          />
        </form>
        <p className="mb-6 px-1 text-[11px] text-zinc-600">
          {status === "ok"
            ? `Aproximadamente ${results.length} resultados para "${query}" · motor Lucid`
            : `Resultados para "${query}" · motor propio de Lucid`}
        </p>

        {status === "loading" && (
          <div className="flex flex-col gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex gap-3">
                <div className="h-8 w-8 shrink-0 animate-pulse rounded-lg bg-white/[0.05]" />
                <div className="flex-1 space-y-2 pt-1">
                  <div
                    className="h-3.5 animate-pulse rounded bg-white/[0.05]"
                    style={{ width: `${60 + ((i * 13) % 30)}%` }}
                  />
                  <div className="h-3 w-40 animate-pulse rounded bg-emerald-400/10" />
                  <div className="h-2.5 w-full animate-pulse rounded bg-white/[0.04]" />
                  <div className="h-2.5 w-4/5 animate-pulse rounded bg-white/[0.04]" />
                </div>
              </div>
            ))}
            <div className="flex items-center justify-center gap-2 pt-2 text-[12px] text-zinc-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Consultando el motor de Lucid...
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.05] p-6 text-center">
            <AlertCircle className="mx-auto mb-3 h-8 w-8 text-red-400" />
            <p className="text-[14px] font-medium text-zinc-200">
              La búsqueda de &quot;{query}&quot; falló
            </p>
            <p className="mx-auto mt-1 max-w-sm text-[12px] leading-relaxed text-zinc-500">
              Ningún motor respondió en esta ocasión. Revisa tu conexión e
              intenta de nuevo en unos segundos.
            </p>
            <button
              onClick={() => onSearch(query)}
              className="mt-4 rounded-xl bg-white/[0.06] px-4 py-2 text-[12px] font-medium text-zinc-200 transition-colors hover:bg-white/[0.1]"
            >
              Reintentar
            </button>
          </div>
        )}

        {status === "empty" && (
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-8 text-center">
            <Search className="mx-auto mb-3 h-7 w-7 text-zinc-600" />
            <p className="text-[14px] font-medium text-zinc-300">
              Sin resultados para &quot;{query}&quot;
            </p>
            <p className="mt-1 text-[12px] text-zinc-500">
              Prueba con otras palabras o revisa la ortografía.
            </p>
          </div>
        )}

        {status === "ok" && (
          <ol className="flex flex-col gap-6">
            {results.map((result, index) => (
              <li key={`${result.url}-${index}`} className="group">
                <button
                  onClick={() => onNavigate(result.url)}
                  className="w-full text-left"
                  title={result.url}
                >
                  <div className="mb-1 flex items-center gap-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/[0.07] bg-white/[0.04]">
                      <img
                        src={faviconUrl(result.url)}
                        alt=""
                        aria-hidden="true"
                        className="h-4 w-4"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display =
                            "none";
                        }}
                      />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[11px] text-zinc-500">
                      {result.hostName || hostnameOf(result.url)}
                      {result.date && result.date !== "N/A" ? (
                        <span className="text-zinc-600">
                          {" "}
                          · {result.date}
                        </span>
                      ) : null}
                    </span>
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-zinc-600 opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                  <p className="text-[15px] font-medium leading-snug text-zinc-100 decoration-fuchsia-400/60 underline-offset-2 group-hover:underline">
                    {result.name}
                  </p>
                  {result.snippet && (
                    <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-zinc-500">
                      {result.snippet}
                    </p>
                  )}
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
