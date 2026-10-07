"use client";

import { useMemo, useState } from "react";
import { Gamepad2, Play, Search, Star } from "lucide-react";
import { PanelShell } from "@/components/browser/panel-shell";
import { CATEGORIES, GAMES, hostnameOf, type Game } from "@/lib/games";
import { cn } from "@/lib/utils";

type Filter = "all" | "favorites" | (typeof CATEGORIES)[number]["id"];

interface GamesPanelProps {
  open: boolean;
  onClose: () => void;
  onOpenGame: (game: Game) => void;
  favorites: string[];
  onToggleFavorite: (gameId: string) => void;
}

/**
 * Apartado de Juegos: el único lugar donde aparecen los juegos.
 * Se abre con el botón del control en la barra izquierda.
 */
export function GamesPanel({
  open,
  onClose,
  onOpenGame,
  favorites,
  onToggleFavorite,
}: GamesPanelProps) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const visibleGames = useMemo(() => {
    const q = query.trim().toLowerCase();
    return GAMES.filter((game) => {
      const matchesFilter =
        filter === "all"
          ? true
          : filter === "favorites"
            ? favorites.includes(game.id)
            : game.category === filter;
      const matchesQuery =
        !q ||
        game.name.toLowerCase().includes(q) ||
        game.tagline.toLowerCase().includes(q);
      return matchesFilter && matchesQuery;
    });
  }, [filter, query, favorites]);

  if (!open) return null;

  return (
    <PanelShell
      title="Juegos"
      subtitle="Tu apartado de juegos"
      icon={Gamepad2}
      onClose={onClose}
      iconClass="from-violet-500 via-fuchsia-500 to-emerald-400 shadow-fuchsia-500/30"
      footer={
        <p className="px-1 text-center text-[11px] leading-relaxed text-zinc-600">
          Los juegos se abren en una pestaña del navegador Lucid, a través del
          proxy.
        </p>
      }
    >
      {/* Búsqueda dentro del panel */}
      <div className="px-3 pb-3 pt-3">
        <div className="group relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 transition-colors group-focus-within:text-fuchsia-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar juego..."
            aria-label="Buscar juego"
            className="h-10 w-full rounded-xl border border-white/[0.07] bg-white/[0.03] pl-9 pr-3 text-sm text-zinc-200 outline-none transition-all placeholder:text-zinc-600 focus:border-fuchsia-500/40 focus:bg-white/[0.05] focus:ring-2 focus:ring-fuchsia-500/20"
          />
        </div>
      </div>

      {/* Categorías */}
      <div className="flex flex-wrap gap-1.5 px-3 pb-3">
        {CATEGORIES.map((cat) => (
          <FilterChip
            key={cat.id}
            active={filter === cat.id}
            onClick={() => setFilter(cat.id)}
            count={
              cat.id === "all"
                ? GAMES.length
                : GAMES.filter((g) => g.category === cat.id).length
            }
          >
            {cat.name}
          </FilterChip>
        ))}
        <FilterChip
          active={filter === "favorites"}
          onClick={() => setFilter("favorites")}
          count={favorites.length}
          star
        >
          Favoritos
        </FilterChip>
      </div>

      {/* Lista de juegos */}
      <div className="flex flex-col gap-2.5 px-3 pb-4">
        {visibleGames.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-8 text-center">
            <Gamepad2 className="mx-auto mb-3 h-8 w-8 text-zinc-600" />
            <p className="text-[13px] font-medium text-zinc-300">
              {filter === "favorites" && !query
                ? "Aún no tienes favoritos"
                : "Sin resultados"}
            </p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-zinc-600">
              {filter === "favorites" && !query
                ? "Marca un juego con la estrella para verlo aquí."
                : query
                  ? `Nada coincide con "${query}".`
                  : "Prueba otra categoría."}
            </p>
          </div>
        ) : (
          visibleGames.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              isFavorite={favorites.includes(game.id)}
              onOpen={() => onOpenGame(game)}
              onToggleFavorite={() => onToggleFavorite(game.id)}
            />
          ))
        )}
      </div>
    </PanelShell>
  );
}

/* ------------------------------------------------------------------ */

function FilterChip({
  children,
  active,
  onClick,
  count,
  star,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  count: number;
  star?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11.5px] font-medium transition-all active:scale-95",
        active
          ? "border-fuchsia-500/30 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/10 text-white"
          : "border-white/[0.06] bg-white/[0.02] text-zinc-400 hover:border-white/10 hover:text-zinc-200"
      )}
    >
      {star && (
        <Star
          className={cn("h-3 w-3", active ? "fill-amber-400 text-amber-400" : "text-amber-500/70")}
        />
      )}
      {children}
      <span className={cn("text-[10px] tabular-nums", active ? "text-fuchsia-300/80" : "text-zinc-600")}>
        {count}
      </span>
    </button>
  );
}

function GameCard({
  game,
  isFavorite,
  onOpen,
  onToggleFavorite,
}: {
  game: Game;
  isFavorite: boolean;
  onOpen: () => void;
  onToggleFavorite: () => void;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] transition-all duration-300 hover:border-white/[0.14] hover:bg-white/[0.04] hover:shadow-xl hover:shadow-black/30">
      <div
        className={cn(
          "pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br opacity-[0.13] blur-3xl transition-opacity duration-300 group-hover:opacity-[0.22]",
          game.gradient
        )}
      />
      <button onClick={onOpen} className="flex w-full items-center gap-3.5 p-3.5 text-left">
        <span
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3",
            game.gradient,
            game.glow
          )}
        >
          <game.icon className="h-6 w-6 text-white drop-shadow-lg" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-[14px] font-semibold text-zinc-100">
              {game.name}
            </span>
            <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[9.5px] font-medium capitalize text-zinc-400">
              {game.category.replace("-", " ")}
            </span>
          </span>
          <span className="mt-0.5 block truncate text-[11.5px] text-zinc-500">
            {game.tagline}
          </span>
          <span className="mt-0.5 block truncate text-[10.5px] text-zinc-600">
            {hostnameOf(game.url)}
          </span>
        </span>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-zinc-400 transition-all duration-300 group-hover:border-fuchsia-400/40 group-hover:bg-gradient-to-br group-hover:from-violet-500 group-hover:to-fuchsia-500 group-hover:text-white group-hover:shadow-lg group-hover:shadow-fuchsia-500/30">
          <Play className="h-4 w-4 fill-current" />
        </span>
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite();
        }}
        title={isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}
        aria-label={isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}
        className={cn(
          "absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-lg transition-all",
          isFavorite
            ? "text-amber-400"
            : "text-zinc-600 opacity-0 hover:text-amber-400 group-hover:opacity-100 focus:opacity-100"
        )}
      >
        <Star className={cn("h-3.5 w-3.5", isFavorite && "fill-amber-400")} />
      </button>
    </div>
  );
}
