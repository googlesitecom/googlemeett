"use client";

import { useState, type FormEvent } from "react";
import { KeyRound, Loader2, Shield, User, Zap } from "lucide-react";
import type { Me } from "@/hooks/use-friends";
import { cn } from "@/lib/utils";

interface AuthScreenProps {
  onAuthenticated: (user: Me) => void;
}

/**
 * Pantalla de cuenta obligatoria: iniciar sesión o crear cuenta
 * únicamente con usuario y contraseña (sin correo electrónico).
 */
export function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [mode, setMode] = useState<"login" | "register">("register");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function switchMode(next: "login" | "register") {
    setMode(next);
    setError(null);
    setConfirm("");
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;

    const user = username.trim().toLowerCase();
    setError(null);

    if (!/^[a-z0-9_]{3,20}$/.test(user)) {
      setError(
        "El usuario debe tener entre 3 y 20 caracteres: letras, números o guion bajo."
      );
      return;
    }
    if (password.length < 4) {
      setError("La contraseña debe tener al menos 4 caracteres.");
      return;
    }
    if (mode === "register" && password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: user, password }),
      });
      const json = (await res.json().catch(() => null)) as {
        success?: boolean;
        user?: Me;
        error?: string;
      } | null;

      if (res.ok && json?.success && json.user) {
        onAuthenticated(json.user);
      } else {
        setError(json?.error ?? "Algo salió mal. Inténtalo de nuevo.");
      }
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex h-dvh w-full items-center justify-center overflow-hidden bg-[#0b0b12] px-4 text-zinc-100">
      {/* Resplandores de fondo */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[420px] w-[420px] rounded-full bg-violet-600/15 blur-[120px]" />
        <div className="absolute -bottom-40 -right-32 h-[420px] w-[420px] rounded-full bg-emerald-500/10 blur-[120px]" />
        <div className="absolute left-1/2 top-1/3 h-[300px] w-[500px] -translate-x-1/2 rounded-full bg-fuchsia-600/[0.08] blur-[120px]" />
      </div>

      <div className="lucid-panel relative z-10 w-full max-w-sm">
        <div className="rounded-3xl border border-white/[0.08] bg-[#101018]/90 p-7 shadow-2xl shadow-black/50 backdrop-blur-2xl sm:p-8">
          {/* Marca */}
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-emerald-400 shadow-xl shadow-fuchsia-500/30">
              <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden="true">
                <path
                  d="M6 4h3.2v10.5H18V20H6V4z"
                  fill="rgba(255,255,255,0.95)"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              Lucid
            </h1>
            <p className="mt-1 text-[12.5px] leading-relaxed text-zinc-500">
              Navegador proxy para jugar, chatear con amigos y buscar sin
              Google.
            </p>
          </div>

          {/* Selector de modo */}
          <div
            role="tablist"
            aria-label="Iniciar sesión o crear cuenta"
            className="mb-5 grid grid-cols-2 gap-1 rounded-xl border border-white/[0.07] bg-white/[0.03] p-1"
          >
            <button
              role="tab"
              aria-selected={mode === "login"}
              onClick={() => switchMode("login")}
              className={cn(
                "h-9 rounded-lg text-[12.5px] font-semibold transition-all",
                mode === "login"
                  ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-md shadow-fuchsia-500/25"
                  : "text-zinc-400 hover:text-zinc-200"
              )}
            >
              Iniciar sesión
            </button>
            <button
              role="tab"
              aria-selected={mode === "register"}
              onClick={() => switchMode("register")}
              className={cn(
                "h-9 rounded-lg text-[12.5px] font-semibold transition-all",
                mode === "register"
                  ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-md shadow-fuchsia-500/25"
                  : "text-zinc-400 hover:text-zinc-200"
              )}
            >
              Crear cuenta
            </button>
          </div>

          <form onSubmit={submit} className="flex flex-col gap-3.5">
            {/* Usuario */}
            <label className="flex flex-col gap-1.5">
              <span className="px-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                Usuario
              </span>
              <div className="group relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 transition-colors group-focus-within:text-fuchsia-400" />
                <input
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setError(null);
                  }}
                  placeholder="tu_usuario"
                  autoComplete="username"
                  spellCheck={false}
                  maxLength={20}
                  className="h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] pl-9 pr-3 text-[14px] text-zinc-200 outline-none transition-all placeholder:text-zinc-600 focus:border-fuchsia-500/40 focus:bg-white/[0.05] focus:ring-2 focus:ring-fuchsia-500/20"
                />
              </div>
            </label>

            {/* Contraseña */}
            <label className="flex flex-col gap-1.5">
              <span className="px-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                Contraseña
              </span>
              <div className="group relative">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 transition-colors group-focus-within:text-fuchsia-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  placeholder="••••••••"
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  className="h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] pl-9 pr-3 text-[14px] text-zinc-200 outline-none transition-all placeholder:text-zinc-600 focus:border-fuchsia-500/40 focus:bg-white/[0.05] focus:ring-2 focus:ring-fuchsia-500/20"
                />
              </div>
            </label>

            {/* Confirmación (solo registro) */}
            {mode === "register" && (
              <label className="flex flex-col gap-1.5">
                <span className="px-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                  Confirmar contraseña
                </span>
                <div className="group relative">
                  <Shield className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 transition-colors group-focus-within:text-fuchsia-400" />
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => {
                      setConfirm(e.target.value);
                      setError(null);
                    }}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] pl-9 pr-3 text-[14px] text-zinc-200 outline-none transition-all placeholder:text-zinc-600 focus:border-fuchsia-500/40 focus:bg-white/[0.05] focus:ring-2 focus:ring-fuchsia-500/20"
                  />
                </div>
              </label>
            )}

            {error && (
              <p
                role="alert"
                className="rounded-xl border border-rose-500/25 bg-rose-500/[0.07] px-3.5 py-2.5 text-[12px] leading-relaxed text-rose-300"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="mt-1 flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-[14px] font-semibold text-white shadow-lg shadow-fuchsia-500/25 transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "login" ? "Entrar" : "Crear mi cuenta"}
            </button>
          </form>

          <div className="mt-5 flex items-center justify-center gap-2 text-[10.5px] text-zinc-600">
            <Zap className="h-3 w-3 text-fuchsia-400/70" />
            <span>Sin correo: solo usuario y contraseña.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
