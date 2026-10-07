"use client";

import type { LucideIcon } from "lucide-react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Armazón compartido de los paneles (Juegos / Chat).
 * Se muestra anclado a la izquierda del área de contenido,
 * sin tapar la barra de pestañas ni la omnibox.
 */
export function PanelShell({
  title,
  subtitle,
  icon: Icon,
  onClose,
  children,
  footer,
  iconClass,
}: {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  iconClass?: string;
}) {
  return (
    <section
      aria-label={title}
      className="lucid-panel absolute inset-y-0 left-0 z-30 flex w-full flex-col border-r border-white/[0.08] bg-[#0f0f1a]/[0.985] shadow-2xl shadow-black/60 backdrop-blur-2xl sm:w-[400px]"
    >
      <header className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3.5">
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br shadow-lg",
            iconClass ?? "from-violet-500 via-fuchsia-500 to-emerald-400 shadow-fuchsia-500/30"
          )}
        >
          <Icon className="h-5 w-5 text-white drop-shadow" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[15px] font-semibold tracking-tight text-white">
            {title}
          </h2>
          <p className="truncate text-[11px] text-zinc-500">{subtitle}</p>
        </div>
        <button
          onClick={onClose}
          title="Cerrar panel"
          aria-label={`Cerrar panel de ${title}`}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-zinc-500 transition-all hover:bg-white/[0.06] hover:text-white"
        >
          <X className="h-[18px] w-[18px]" />
        </button>
      </header>

      <div className="lucid-scroll flex min-h-0 flex-1 flex-col overflow-y-auto">
        {children}
      </div>

      {footer && (
        <div className="border-t border-white/[0.06] p-3">{footer}</div>
      )}
    </section>
  );
}
