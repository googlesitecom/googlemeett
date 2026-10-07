"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Gamepad2,
  House,
  LogOut,
  Maximize,
  MessageSquare,
  Plus,
  Settings2,
  Shield,
  ShieldOff,
} from "lucide-react";
import { avatarGradient, type Me } from "@/hooks/use-friends";
import { cn } from "@/lib/utils";

export type PanelKind = "none" | "games" | "chat" | "settings";

interface RailProps {
  activePanel: PanelKind;
  onOpenPanel: (panel: Exclude<PanelKind, "none">) => void;
  onHome: () => void;
  onNewTab: () => void;
  onFullscreen: () => void;
  proxyEnabled: boolean;
  onToggleProxy: () => void;
  user: Me;
  onLogout: () => void;
  unread: number;
}

/**
 * Barra lateral izquierda estilo rail: navegación por apartados.
 * El botón del control (Gamepad2) abre el panel de Juegos.
 */
export function Rail({
  activePanel,
  onOpenPanel,
  onHome,
  onNewTab,
  onFullscreen,
  proxyEnabled,
  onToggleProxy,
  user,
  onLogout,
  unread,
}: RailProps) {
  return (
    <aside
      aria-label="Apartados de Lucid"
      className="relative z-30 flex h-full w-16 shrink-0 flex-col items-center border-r border-white/[0.06] bg-[#0d0d15]/90 py-4 backdrop-blur-2xl sm:w-[76px]"
    >
      {/* Marca */}
      <div className="relative mb-5" title="Lucid">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-emerald-400 shadow-lg shadow-fuchsia-500/30">
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
            <path
              d="M6 4h3.2v10.5H18V20H6V4z"
              fill="rgba(255,255,255,0.95)"
            />
          </svg>
        </div>
        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0d0d15]" />
      </div>

      {/* Navegación por apartados */}
      <nav className="flex flex-col items-center gap-1.5" aria-label="Apartados">
        <RailButton
          icon={House}
          label="Inicio"
          title="Ir al inicio"
          active={activePanel === "none"}
          onClick={onHome}
        />

        {/* Botón del control: abre el panel de Juegos */}
        <RailButton
          icon={Gamepad2}
          label="Juegos"
          title="Abrir el apartado de juegos"
          active={activePanel === "games"}
          highlight
          onClick={() => onOpenPanel("games")}
        />

        {/* Chat con amigos */}
        <div className="relative">
          <RailButton
            icon={MessageSquare}
            label="Chat"
            title="Abrir el chat con amigos"
            active={activePanel === "chat"}
            onClick={() => onOpenPanel("chat")}
          />
          {unread > 0 && (
            <span className="pointer-events-none absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-red-600 px-1 text-[10px] font-bold tabular-nums text-white shadow-lg shadow-rose-500/40 ring-2 ring-[#0d0d15]">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </div>

        {/* Configuración: personalizar la página (pestaña y logo) */}
        <RailButton
          icon={Settings2}
          label="Ajustes"
          title="Configuración: nombre y logo de tu página"
          active={activePanel === "settings"}
          onClick={() => onOpenPanel("settings")}
        />

        <RailButton
          icon={Plus}
          label="Pestaña"
          title="Nueva pestaña (Alt+T)"
          onClick={onNewTab}
        />
      </nav>

      <div className="flex-1" />

      {/* Utilidades */}
      <div className="flex flex-col items-center gap-1.5">
        <RailButton
          icon={proxyEnabled ? Shield : ShieldOff}
          label="Proxy"
          title={
            proxyEnabled
              ? "Proxy activado: el tráfico pasa por el servidor"
              : "Proxy desactivado: conexión directa"
          }
          active={proxyEnabled}
          activeClass="bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30"
          onClick={onToggleProxy}
        />
        <RailButton
          icon={Maximize}
          label="Pantalla"
          title="Pantalla completa"
          onClick={onFullscreen}
        />

        {/* Cuenta */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              title={`Tu cuenta: ${user.displayName}`}
              aria-label="Menú de cuenta"
              className={cn(
                "mt-1 flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br text-[14px] font-bold uppercase text-white shadow-lg transition-transform hover:scale-105 active:scale-95",
                avatarGradient(user.avatarColor)
              )}
            >
              {user.displayName.charAt(0)}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="right"
            align="end"
            className="w-52 border-white/[0.08] bg-[#14141f]/95 backdrop-blur-xl"
          >
            <DropdownMenuLabel className="font-normal">
              <p className="text-[13px] font-semibold text-zinc-100">
                {user.displayName}
              </p>
              <p className="text-[11px] text-zinc-500">@{user.username}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/[0.06]" />
            <DropdownMenuItem
              onClick={() => onOpenPanel("settings")}
              className="cursor-pointer focus:text-zinc-100"
            >
              <Settings2 className="h-4 w-4" />
              Configuración de la página
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onLogout}
              className="cursor-pointer text-rose-400 focus:text-rose-300"
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ */

interface RailButtonProps {
  icon: typeof House;
  label: string;
  title: string;
  onClick: () => void;
  active?: boolean;
  highlight?: boolean;
  activeClass?: string;
}

function RailButton({
  icon: Icon,
  label,
  title,
  onClick,
  active,
  highlight,
  activeClass,
}: RailButtonProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={cn(
        "flex h-[54px] w-[54px] flex-col items-center justify-center gap-1 rounded-2xl transition-all active:scale-95",
        active
          ? activeClass ??
              "bg-gradient-to-br from-violet-500/25 to-fuchsia-500/15 text-fuchsia-300 ring-1 ring-fuchsia-500/30"
          : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200"
      )}
    >
      <Icon
        className={cn(
          "h-[22px] w-[22px]",
          highlight && "h-6 w-6",
          highlight && !active && "text-zinc-300"
        )}
      />
      <span className="text-[9px] font-semibold uppercase tracking-wide">
        {label}
      </span>
    </button>
  );
}
