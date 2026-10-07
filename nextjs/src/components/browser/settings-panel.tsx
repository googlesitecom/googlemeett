"use client";

import { useMemo, useRef, useState } from "react";
import {
  Link2,
  LogOut,
  RotateCcw,
  Settings2,
  Upload,
} from "lucide-react";
import { PanelShell } from "@/components/browser/panel-shell";
import { useToast } from "@/hooks/use-toast";
import { avatarGradient, type Me } from "@/hooks/use-friends";
import {
  APPEARANCE_FAVICON_MAX,
  APPEARANCE_TITLE_MAX,
  resolveFaviconHref,
  type Appearance,
} from "@/lib/appearance";
import { cn } from "@/lib/utils";

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  me: Me;
  appearance: Appearance;
  onChange: (next: Appearance) => void;
  onReset: () => void;
  onLogout: () => void;
}

/** Emojis disponibles como logo de la pestaña. */
const FAVICON_EMOJIS = [
  "🌐",
  "📄",
  "📊",
  "✉️",
  "🎓",
  "📁",
  "🎥",
  "📝",
  "📈",
  "📕",
  "📘",
  "📒",
  "🗒️",
  "📅",
  "🔒",
  "⭐",
  "🎮",
  "🏎️",
  "💬",
  "🎨",
  "🧮",
  "🗂️",
  "🗺️",
  "🖥️",
];

/** Combinaciones rápidas de nombre + logo. */
const PRESETS: { title: string; emoji: string }[] = [
  { title: "Google Docs", emoji: "📄" },
  { title: "Google Slides", emoji: "📊" },
  { title: "Gmail", emoji: "✉️" },
  { title: "Google Classroom", emoji: "🎓" },
  { title: "Google Drive", emoji: "📁" },
  { title: "Google Meet", emoji: "🎥" },
  { title: "Word", emoji: "📝" },
  { title: "Excel", emoji: "📈" },
  { title: "Canvas", emoji: "🎨" },
  { title: "Zoom", emoji: "📹" },
];

/** Límite práctico para imágenes subidas (bytes de archivo). */
const MAX_UPLOAD_BYTES = 100 * 1024;

/**
 * Apartado de Configuración: personaliza la página — nombre de la pestaña
 * real del navegador y su logo (favicon). Se guardan en la cuenta.
 */
export function SettingsPanel({
  open,
  onClose,
  me,
  appearance,
  onChange,
  onReset,
  onLogout,
}: SettingsPanelProps) {
  const { toast } = useToast();
  const [urlDraft, setUrlDraft] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const faviconHref = useMemo(
    () => resolveFaviconHref(appearance),
    [appearance]
  );

  if (!open) return null;

  function changeTitle(value: string) {
    const title = value.slice(0, APPEARANCE_TITLE_MAX);
    onChange({ ...appearance, title });
  }

  function pickEmoji(emoji: string) {
    onChange({ ...appearance, faviconType: "emoji", faviconValue: emoji });
  }

  function applyPreset(preset: { title: string; emoji: string }) {
    onChange({
      title: preset.title,
      faviconType: "emoji",
      faviconValue: preset.emoji,
    });
    toast({
      title: "Apariencia aplicada",
      description: `La pestaña ahora se llama "${preset.title}".`,
    });
  }

  function applyUrl() {
    const value = urlDraft.trim();
    if (!/^https?:\/\//i.test(value)) {
      toast({
        title: "URL no válida",
        description: "Escribe la dirección completa, empezando por https://",
        variant: "destructive",
      });
      return;
    }
    onChange({ ...appearance, faviconType: "url", faviconValue: value });
    toast({ title: "Logo actualizado", description: "Se usa la imagen de la URL." });
  }

  function applyUpload(file: File) {
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Archivo no válido",
        description: "Sube una imagen (PNG, JPG, SVG, WEBP...).",
        variant: "destructive",
      });
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toast({
        title: "Imagen demasiado grande",
        description: "Usa una imagen de menos de 100 KB.",
        variant: "destructive",
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? "");
      if (!dataUrl.startsWith("data:image/") || dataUrl.length > APPEARANCE_FAVICON_MAX) {
        toast({
          title: "Imagen no válida",
          description: "No se pudo usar esa imagen como logo.",
          variant: "destructive",
        });
        return;
      }
      onChange({ ...appearance, faviconType: "image", faviconValue: dataUrl });
      toast({ title: "Logo actualizado", description: "Imagen subida como favicon." });
    };
    reader.onerror = () => {
      toast({
        title: "No se pudo leer la imagen",
        description: "Inténtalo de nuevo con otro archivo.",
        variant: "destructive",
      });
    };
    reader.readAsDataURL(file);
  }

  function resetAll() {
    onReset();
    setUrlDraft("");
    toast({
      title: "Configuración restablecida",
      description: "La pestaña vuelve a su nombre y logo por defecto.",
    });
  }

  return (
    <PanelShell
      title="Configuración"
      subtitle="Personaliza tu página"
      icon={Settings2}
      onClose={onClose}
      iconClass="from-slate-500 via-zinc-500 to-neutral-400 shadow-zinc-500/30"
      footer={
        <p className="px-1 text-center text-[11px] leading-relaxed text-zinc-600">
          Los cambios se aplican al instante y se guardan en tu cuenta.
        </p>
      }
    >
      {/* ---------------- Nombre de la pestaña ---------------- */}
      <section className="border-b border-white/[0.06] px-4 py-4">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
          Pestaña del navegador
        </h3>

        {/* Vista previa de cómo se verá la pestaña real */}
        <div className="mt-3 rounded-xl border border-white/[0.07] bg-[#0c0c14] p-2.5">
          <p className="mb-1.5 px-1 text-[10px] font-medium uppercase tracking-wider text-zinc-600">
            Vista previa
          </p>
          <div className="flex items-center gap-1.5">
            <div className="flex h-8 min-w-0 max-w-full items-center gap-2 rounded-t-lg bg-[#14141f] px-3 shadow-[0_-1px_0_rgba(255,255,255,0.06)_inset]">
              <img
                src={faviconHref}
                alt=""
                aria-hidden="true"
                className="h-3.5 w-3.5 shrink-0 rounded-sm"
              />
              <span className="min-w-0 truncate text-[11.5px] font-medium text-zinc-200">
                {appearance.title || "Nueva pestaña"}
              </span>
            </div>
          </div>
        </div>

        <label
          htmlFor="lucid-tab-title"
          className="mt-3.5 block text-[12px] font-medium text-zinc-400"
        >
          Nombre de la pestaña
        </label>
        <input
          id="lucid-tab-title"
          value={appearance.title}
          onChange={(e) => changeTitle(e.target.value)}
          placeholder="Ej. Google Docs"
          maxLength={APPEARANCE_TITLE_MAX}
          className="mt-1.5 h-10 w-full rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 text-sm text-zinc-200 outline-none transition-all placeholder:text-zinc-600 focus:border-fuchsia-500/40 focus:bg-white/[0.05] focus:ring-2 focus:ring-fuchsia-500/20"
        />
        <p className="mt-1.5 text-[11px] text-zinc-600">
          {appearance.title.length}/{APPEARANCE_TITLE_MAX} caracteres · es el
          nombre que se ve en la pestaña del navegador.
        </p>
      </section>

      {/* ---------------- Logo (favicon) ---------------- */}
      <section className="border-b border-white/[0.06] px-4 py-4">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
          Logo de la pestaña
        </h3>

        <label className="mt-3 block text-[12px] font-medium text-zinc-400">
          Elige un emoji
        </label>
        <div className="mt-1.5 grid grid-cols-8 gap-1.5">
          {FAVICON_EMOJIS.map((emoji) => {
            const active =
              appearance.faviconType === "emoji" &&
              appearance.faviconValue === emoji;
            return (
              <button
                key={emoji}
                onClick={() => pickEmoji(emoji)}
                title={`Usar ${emoji} como logo`}
                aria-pressed={active}
                className={cn(
                  "flex aspect-square items-center justify-center rounded-lg border text-[17px] transition-all active:scale-90",
                  active
                    ? "border-fuchsia-500/50 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/10 shadow-inner"
                    : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.14] hover:bg-white/[0.05]"
                )}
              >
                {emoji}
              </button>
            );
          })}
        </div>

        <label className="mt-4 block text-[12px] font-medium text-zinc-400">
          Presets rápidos
        </label>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {PRESETS.map((preset) => (
            <button
              key={preset.title}
              onClick={() => applyPreset(preset)}
              title={`Nombre "${preset.title}" y logo ${preset.emoji}`}
              className="flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-[11.5px] font-medium text-zinc-300 transition-all hover:border-fuchsia-500/40 hover:bg-white/[0.05] hover:text-white active:scale-95"
            >
              <span aria-hidden="true">{preset.emoji}</span>
              {preset.title}
            </button>
          ))}
        </div>

        <label
          htmlFor="lucid-favicon-url"
          className="mt-4 block text-[12px] font-medium text-zinc-400"
        >
          Logo desde una URL
        </label>
        <div className="mt-1.5 flex gap-1.5">
          <div className="relative flex-1">
            <Link2 className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
            <input
              id="lucid-favicon-url"
              value={urlDraft}
              onChange={(e) => setUrlDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyUrl();
                }
              }}
              placeholder="https://ejemplo.com/logo.png"
              spellCheck={false}
              autoComplete="off"
              className="h-10 w-full rounded-xl border border-white/[0.07] bg-white/[0.03] pl-9 pr-3 text-[13px] text-zinc-200 outline-none transition-all placeholder:text-zinc-600 focus:border-fuchsia-500/40 focus:bg-white/[0.05] focus:ring-2 focus:ring-fuchsia-500/20"
            />
          </div>
          <button
            onClick={applyUrl}
            className="h-10 shrink-0 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 text-[12px] font-semibold text-zinc-200 transition-all hover:border-fuchsia-500/40 hover:bg-white/[0.08] active:scale-95"
          >
            Usar
          </button>
        </div>

        <label className="mt-4 block text-[12px] font-medium text-zinc-400">
          Subir una imagen
        </label>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="mt-1.5 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.14] bg-white/[0.02] text-[12.5px] font-medium text-zinc-400 transition-all hover:border-fuchsia-500/40 hover:bg-white/[0.04] hover:text-zinc-200 active:scale-[0.99]"
        >
          <Upload className="h-4 w-4" />
          Elegir imagen (máx. 100 KB)
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) applyUpload(file);
            e.target.value = "";
          }}
        />

        <div className="mt-4 flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-[11.5px] font-medium text-zinc-400">Logo actual</p>
            <p className="truncate text-[11px] text-zinc-600">
              {appearance.faviconType === "default"
                ? "Logo de Lucid"
                : appearance.faviconType === "emoji"
                  ? `Emoji ${appearance.faviconValue}`
                  : appearance.faviconType === "url"
                    ? "Imagen externa"
                    : "Imagen subida"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <img
              src={faviconHref}
              alt="Logo actual de la pestaña"
              className="h-7 w-7 rounded-md bg-white/[0.04] object-contain p-0.5"
            />
            <button
              onClick={resetAll}
              title="Restablecer nombre y logo"
              className="flex h-8 items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 text-[11.5px] font-medium text-zinc-400 transition-all hover:border-rose-500/40 hover:text-rose-300 active:scale-95"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restablecer
            </button>
          </div>
        </div>
      </section>

      {/* ---------------- Cuenta ---------------- */}
      <section className="px-4 py-4">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
          Cuenta
        </h3>
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[14px] font-bold uppercase text-white shadow-lg",
              avatarGradient(me.avatarColor)
            )}
          >
            {me.displayName.charAt(0)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13.5px] font-semibold text-zinc-100">
              {me.displayName}
            </p>
            <p className="truncate text-[11.5px] text-zinc-500">
              @{me.username}
            </p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="mt-2.5 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-rose-500/25 bg-rose-500/[0.08] text-[12.5px] font-semibold text-rose-300 transition-all hover:border-rose-500/40 hover:bg-rose-500/[0.14] active:scale-[0.99]"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </section>
    </PanelShell>
  );
}
