"use client";

import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Globe,
  Home,
  Lock,
  Maximize,
  Plus,
  RotateCw,
  Search,
  Shield,
  ShieldOff,
  X,
} from "lucide-react";
import { faviconUrl, hostnameOf, parseSearchUrl } from "@/lib/games";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Barra de pestañas                                                   */
/* ------------------------------------------------------------------ */

export interface TabLite {
  id: string;
  title: string;
  url: string;
  kind: "newtab" | "web" | "search";
  loading: boolean;
}

interface TabStripProps {
  tabs: TabLite[];
  activeId: string;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onNew: () => void;
  onToggleSidebar: () => void;
  onFullscreen: () => void;
}

export function TabStrip({
  tabs,
  activeId,
  onSelect,
  onClose,
  onNew,
  onToggleSidebar,
  onFullscreen,
}: TabStripProps) {
  return (
    <div className="flex items-center gap-2 border-b border-white/[0.06] bg-[#0c0c14]/80 px-3 pb-0 pt-2.5 backdrop-blur-xl">
      {/* Luces de ventana estilo nativo (funcionales) */}
      <div className="hidden select-none items-center gap-2 pl-1 pr-2 sm:flex">
        <button
          onClick={() => activeId && onClose(activeId)}
          title="Cerrar pestaña actual"
          aria-label="Cerrar pestaña actual"
          className="group flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#ff5f57] transition-all hover:brightness-110"
        >
          <X className="h-2 w-2 text-black/60 opacity-0 transition-opacity group-hover:opacity-100" />
        </button>
        <button
          onClick={onToggleSidebar}
          title="Plegar barra lateral"
          aria-label="Plegar barra lateral"
          className="group flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#febc2e] transition-all hover:brightness-110"
        >
          <span className="h-1.5 w-[7px] rounded-[2px] bg-black/50 opacity-0 transition-opacity group-hover:opacity-100" />
        </button>
        <button
          onClick={onFullscreen}
          title="Pantalla completa"
          aria-label="Pantalla completa"
          className="group flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#28c840] transition-all hover:brightness-110"
        >
          <Maximize className="h-2 w-2 text-black/60 opacity-0 transition-opacity group-hover:opacity-100" />
        </button>
      </div>

      {/* Pestañas */}
      <div className="flex min-w-0 flex-1 items-end gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((tab) => {
          const active = tab.id === activeId;
          const searchQuery = parseSearchUrl(tab.url);
          return (
            <button
              key={tab.id}
              onClick={() => onSelect(tab.id)}
              onAuxClick={(e) => {
                if (e.button === 1) onClose(tab.id);
              }}
              title={tab.title}
              className={cn(
                "group relative flex h-9 min-w-0 shrink-0 select-none items-center gap-2 rounded-t-xl px-3 text-left transition-all",
                "w-[150px] sm:w-[190px]",
                active
                  ? "bg-[#14141f] text-zinc-100 shadow-[0_-1px_0_rgba(255,255,255,0.06)_inset]"
                  : "text-zinc-500 hover:bg-white/[0.03] hover:text-zinc-300"
              )}
            >
              {active && (
                <span className="absolute inset-x-3 top-0 h-[2px] rounded-full bg-gradient-to-r from-violet-400 via-fuchsia-400 to-emerald-400" />
              )}
              <span className="relative flex h-4 w-4 shrink-0 items-center justify-center">
                {tab.loading ? (
                  <span className="h-3 w-3 animate-spin rounded-full border-[1.5px] border-fuchsia-400/30 border-t-fuchsia-400" />
                ) : tab.kind === "newtab" ? (
                  <Plus className="h-3.5 w-3.5 text-zinc-500" />
                ) : tab.kind === "search" ? (
                  <Search className="h-3.5 w-3.5 text-fuchsia-400" />
                ) : (
                  <img
                    src={faviconUrl(tab.url)}
                    alt=""
                    aria-hidden="true"
                    className="h-3.5 w-3.5 rounded-sm"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                )}
              </span>
              <span className="min-w-0 flex-1 truncate text-[12px] font-medium">
                {searchQuery ? `${searchQuery} — Lucid` : tab.title}
              </span>
              <span
                role="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(tab.id);
                }}
                title="Cerrar pestaña"
                aria-label={`Cerrar pestaña ${tab.title}`}
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition-all hover:bg-white/10 hover:text-white",
                  active ? "opacity-60" : "opacity-0 group-hover:opacity-60"
                )}
              >
                <X className="h-3 w-3" />
              </span>
            </button>
          );
        })}

        <button
          onClick={onNew}
          title="Nueva pestaña (Alt+T)"
          aria-label="Nueva pestaña"
          className="mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition-all hover:bg-white/[0.06] hover:text-zinc-200"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Barra de herramientas (omnibox)                                     */
/* ------------------------------------------------------------------ */

interface ToolbarProps {
  url: string;
  canBack: boolean;
  canForward: boolean;
  proxyEnabled: boolean;
  onBack: () => void;
  onForward: () => void;
  onReload: () => void;
  onHome: () => void;
  onNavigate: (input: string) => void;
  onToggleProxy: () => void;
  onOpenExternal: () => void;
  onFullscreen: () => void;
  omniboxRef: React.RefObject<HTMLInputElement | null>;
}

export function Toolbar({
  url,
  canBack,
  canForward,
  proxyEnabled,
  onBack,
  onForward,
  onReload,
  onHome,
  onNavigate,
  onToggleProxy,
  onOpenExternal,
  onFullscreen,
  omniboxRef,
}: ToolbarProps) {
  const isSearch = parseSearchUrl(url) !== null;
  const isWeb = url.startsWith("http");
  // Texto canónico: la consulta en búsquedas, la URL en webs y vacío en
  // páginas internas (antes se mostraba "lucid://newtab" a secas).
  const canonical = isSearch
    ? (parseSearchUrl(url) as string)
    : isWeb
      ? url
      : "";
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? canonical;

  function submit() {
    const query = shown.trim();
    if (!query) return;
    onNavigate(query);
    setDraft(null);
    omniboxRef?.current?.blur();
  }

  return (
    <div className="flex items-center gap-1.5 border-b border-white/[0.06] bg-[#101018]/85 px-2.5 py-2 backdrop-blur-xl sm:gap-2 sm:px-3">
      <nav
        aria-label="Navegación de la página"
        className="flex items-center gap-0.5"
      >
        <IconButton
          onClick={onBack}
          disabled={!canBack}
          title="Atrás (Alt+←)"
          label="Atrás"
        >
          <ArrowLeft className="h-[18px] w-[18px]" />
        </IconButton>
        <IconButton
          onClick={onForward}
          disabled={!canForward}
          title="Adelante (Alt+→)"
          label="Adelante"
        >
          <ArrowRight className="h-[18px] w-[18px]" />
        </IconButton>
        <IconButton
          onClick={onReload}
          title="Recargar (Alt+R)"
          label="Recargar"
        >
          <RotateCw className="h-4 w-4" />
        </IconButton>
        <IconButton onClick={onHome} title="Inicio" label="Inicio">
          <Home className="h-4 w-4" />
        </IconButton>
      </nav>

      {/* Omnibox */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="group relative min-w-0 flex-1"
      >
        <div
          className={cn(
            "flex h-10 items-center gap-2 rounded-xl border bg-white/[0.03] px-3 transition-all",
            "border-white/[0.07] focus-within:border-fuchsia-500/40 focus-within:bg-white/[0.05] focus-within:ring-2 focus-within:ring-fuchsia-500/20"
          )}
        >
          <span className="flex shrink-0 items-center">
            {isSearch ? (
              <Search className="h-4 w-4 text-fuchsia-400" />
            ) : isWeb ? (
              proxyEnabled ? (
                <Shield className="h-4 w-4 text-emerald-400" />
              ) : (
                <Lock className="h-3.5 w-3.5 text-zinc-500" />
              )
            ) : (
              <Globe className="h-4 w-4 text-zinc-500" />
            )}
          </span>
          <input
            ref={(node) => {
              if (omniboxRef) omniboxRef.current = node;
            }}
            value={shown}
            onChange={(e) => setDraft(e.target.value)}
            onFocus={(e) => e.target.select()}
            onBlur={() => setDraft(null)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setDraft(null);
                e.currentTarget.blur();
              }
            }}
            placeholder="Busca o escribe una dirección"
            aria-label="Barra de direcciones y búsqueda"
            spellCheck={false}
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-[13px] text-zinc-200 placeholder:text-zinc-600 outline-none"
          />
          {isWeb && (
            <span className="hidden shrink-0 items-center gap-1.5 sm:flex">
              {proxyEnabled ? (
                <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-400 ring-1 ring-emerald-500/25">
                  Proxy
                </span>
              ) : (
                <span className="rounded-md bg-white/[0.05] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 ring-1 ring-white/[0.08]">
                  Directo
                </span>
              )}
            </span>
          )}
        </div>
      </form>

      <div className="flex shrink-0 items-center gap-0.5">
        <IconButton
          onClick={onToggleProxy}
          title={
            proxyEnabled
              ? "Desactivar proxy (conexión directa)"
              : "Activar proxy (vía servidor)"
          }
          label="Alternar proxy"
          active={proxyEnabled}
          activeClass="text-emerald-400 bg-emerald-500/10"
        >
          {proxyEnabled ? (
            <Shield className="h-[18px] w-[18px]" />
          ) : (
            <ShieldOff className="h-[18px] w-[18px]" />
          )}
        </IconButton>
        {isWeb && (
          <IconButton
            onClick={onOpenExternal}
            title="Abrir en pestaña del sistema"
            label="Abrir fuera de Lucid"
          >
            <ExternalLink className="h-[18px] w-[18px]" />
          </IconButton>
        )}
        <IconButton
          onClick={onFullscreen}
          title="Pantalla completa"
          label="Pantalla completa"
        >
          <Maximize className="h-[18px] w-[18px]" />
        </IconButton>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

interface IconButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  label: string;
  disabled?: boolean;
  active?: boolean;
  activeClass?: string;
}

function IconButton({
  children,
  onClick,
  title,
  label,
  disabled,
  active,
  activeClass,
}: IconButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={label}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-xl text-zinc-400 transition-all",
        disabled
          ? "cursor-not-allowed opacity-30"
          : "hover:bg-white/[0.06] hover:text-white active:scale-95",
        active && !disabled && activeClass
      )}
    >
      {children}
    </button>
  );
}
