"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  ArrowLeft,
  Check,
  Loader2,
  MessageSquare,
  Send,
  UserMinus,
  UserPlus,
  X,
} from "lucide-react";
import { PanelShell } from "@/components/browser/panel-shell";
import {
  avatarGradient,
  type FriendEntry,
  type FriendsData,
  type Me,
} from "@/hooks/use-friends";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
}

interface ChatPanelProps {
  open: boolean;
  onClose: () => void;
  me: Me;
  data: FriendsData | null;
  refresh: () => Promise<FriendsData | null>;
}

/**
 * Apartado de Chat: agrega amigos por su nombre de usuario,
 * acepta solicitudes y conversa 1 a 1 con sondeo en tiempo casi real.
 */
export function ChatPanel({ open, onClose, me, data, refresh }: ChatPanelProps) {
  const [activePeerId, setActivePeerId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [addName, setAddName] = useState("");
  const [addBusy, setAddBusy] = useState(false);
  const [addFeedback, setAddFeedback] = useState<{
    kind: "ok" | "error";
    text: string;
  } | null>(null);

  const messagesRef = useRef<ChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const activeFriend: FriendEntry | null =
    data?.friends.find((f) => f.userId === activePeerId) ?? null;

  const applyMessages = useCallback((next: ChatMessage[]) => {
    messagesRef.current = next;
    setMessages(next);
  }, []);

  /* ---------- Carga y sondeo de la conversación ---------- */
  useEffect(() => {
    if (!open || !activePeerId) return;

    const controller = new AbortController();
    let stopped = false;

    async function load(initial: boolean) {
      try {
        const last = messagesRef.current[messagesRef.current.length - 1];
        const after = initial ? null : (last?.createdAt ?? null);
        const qs = new URLSearchParams({ peer: activePeerId as string });
        if (after) qs.set("after", after);

        const res = await fetch(`/api/chat?${qs.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (stopped) return;
        if (res.status === 403) {
          setActivePeerId(null);
          return;
        }
        if (!res.ok) return;
        const json = (await res.json()) as {
          success: boolean;
          messages?: ChatMessage[];
        };
        if (stopped || !json.success || !json.messages) return;
        if (initial) {
          applyMessages(json.messages);
        } else if (json.messages.length > 0) {
          applyMessages(mergeMessages(messagesRef.current, json.messages));
          void refresh();
        }
      } catch {
        /* sondeo interrumpido */
      }
    }

    messagesRef.current = [];
    setMessages([]);
    void load(true);

    const timer = setInterval(() => void load(false), 2500);

    return () => {
      stopped = true;
      controller.abort();
      clearInterval(timer);
    };
  }, [open, activePeerId, applyMessages, refresh]);

  /* ---------- Desplazamiento al último mensaje ---------- */
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, activePeerId, open]);

  /* ---------- Acciones ---------- */

  async function send() {
    const content = draft.trim();
    if (!content || !activePeerId || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ peerId: activePeerId, content }),
      });
      const json = (await res.json().catch(() => null)) as {
        success?: boolean;
        message?: ChatMessage;
      } | null;
      if (json?.success && json.message) {
        applyMessages(mergeMessages(messagesRef.current, [json.message]));
        setDraft("");
        void refresh();
      }
    } catch {
      /* error de red: se reintenta al escribir de nuevo */
    } finally {
      setSending(false);
    }
  }

  function submitMessage(e: FormEvent) {
    e.preventDefault();
    void send();
  }

  async function sendRequest(e: FormEvent) {
    e.preventDefault();
    const username = addName.trim().toLowerCase();
    if (!username || addBusy) return;
    setAddBusy(true);
    setAddFeedback(null);
    try {
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const json = (await res.json().catch(() => null)) as {
        success?: boolean;
        error?: string;
        message?: string;
      } | null;
      if (res.ok && json?.success) {
        setAddFeedback({
          kind: "ok",
          text: json.message ?? "Solicitud enviada.",
        });
        setAddName("");
        void refresh();
      } else {
        setAddFeedback({
          kind: "error",
          text: json?.error ?? "No se pudo enviar la solicitud.",
        });
      }
    } catch {
      setAddFeedback({ kind: "error", text: "Sin conexión con el servidor." });
    } finally {
      setAddBusy(false);
    }
  }

  async function respond(requestId: string, action: "accept" | "decline") {
    try {
      await fetch("/api/friends/respond", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ requestId, action }),
      });
    } catch {
      /* ignorar */
    }
    void refresh();
  }

  async function removeFriend() {
    if (!activePeerId) return;
    const name = activeFriend?.displayName ?? "este usuario";
    if (!window.confirm(`¿Eliminar a ${name} de tus amigos?`)) return;
    try {
      await fetch("/api/friends/remove", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: activePeerId }),
      });
    } catch {
      /* ignorar */
    }
    setActivePeerId(null);
    applyMessages([]);
    void refresh();
  }

  /* ---------- Render ---------- */

  if (!open) return null;

  const friends = data?.friends ?? [];
  const incoming = data?.incoming ?? [];
  const outgoing = data?.outgoing ?? [];

  return (
    <PanelShell
      title="Chat"
      subtitle={
        activeFriend
          ? `Conversando con ${activeFriend.displayName}`
          : "Amigos y mensajes"
      }
      icon={MessageSquare}
      onClose={onClose}
      iconClass="from-cyan-500 via-sky-500 to-violet-500 shadow-sky-500/30"
    >
      {activeFriend ? (
        /* ---------------- Conversación ---------------- */
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex items-center gap-2.5 border-b border-white/[0.06] px-3 py-2.5">
            <button
              onClick={() => setActivePeerId(null)}
              title="Volver a la lista"
              aria-label="Volver a la lista de amigos"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-zinc-400 transition-all hover:bg-white/[0.06] hover:text-white"
            >
              <ArrowLeft className="h-[18px] w-[18px]" />
            </button>
            <span
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-[13px] font-bold uppercase text-white shadow-md",
                avatarGradient(activeFriend.avatarColor)
              )}
            >
              {activeFriend.displayName.charAt(0)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-semibold text-zinc-100">
                {activeFriend.displayName}
              </p>
              <p className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    activeFriend.online
                      ? "bg-emerald-400"
                      : "bg-zinc-600"
                  )}
                />
                {activeFriend.online ? "En línea" : "Desconectado"}
              </p>
            </div>
            <button
              onClick={() => void removeFriend()}
              title="Eliminar de amigos"
              aria-label={`Eliminar a ${activeFriend.displayName} de amigos`}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-zinc-500 transition-all hover:bg-rose-500/10 hover:text-rose-400"
            >
              <UserMinus className="h-[17px] w-[17px]" />
            </button>
          </div>

          <div
            ref={scrollRef}
            className="lucid-scroll flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 py-4"
          >
            {messages.length === 0 && (
              <div className="my-auto rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 text-center">
                <MessageSquare className="mx-auto mb-2.5 h-7 w-7 text-zinc-600" />
                <p className="text-[13px] font-medium text-zinc-300">
                  Sin mensajes todavía
                </p>
                <p className="mt-1 text-[11.5px] text-zinc-500">
                  Escribe el primer mensaje para {activeFriend.displayName}.
                </p>
              </div>
            )}
            {messages.map((message) => {
              const mine = message.senderId === me.id;
              return (
                <div
                  key={message.id}
                  className={cn(
                    "flex w-full",
                    mine ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[82%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed shadow-sm",
                      mine
                        ? "rounded-br-md bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-fuchsia-900/30"
                        : "rounded-bl-md border border-white/[0.07] bg-white/[0.05] text-zinc-200"
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
                    <p
                      className={cn(
                        "mt-1 text-right text-[9.5px] tabular-nums",
                        mine ? "text-white/60" : "text-zinc-500"
                      )}
                    >
                      {formatTime(message.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <form
            onSubmit={submitMessage}
            className="flex items-center gap-2 border-t border-white/[0.06] p-3"
          >
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={`Mensaje para ${activeFriend.displayName}...`}
              aria-label="Escribir mensaje"
              maxLength={2000}
              className="h-10 min-w-0 flex-1 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3.5 text-[13px] text-zinc-200 outline-none transition-all placeholder:text-zinc-600 focus:border-fuchsia-500/40 focus:bg-white/[0.05] focus:ring-2 focus:ring-fuchsia-500/20"
            />
            <button
              type="submit"
              disabled={!draft.trim() || sending}
              aria-label="Enviar mensaje"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-lg shadow-fuchsia-600/30 transition-all hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </form>
        </div>
      ) : (
        /* ---------------- Lista de amigos ---------------- */
        <div className="flex flex-col gap-4 px-3 pb-4 pt-3">
          {/* Añadir amigo */}
          <form onSubmit={sendRequest} className="flex flex-col gap-1.5">
            <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
              Añadir amigo
            </p>
            <div className="flex gap-1.5">
              <div className="group relative min-w-0 flex-1">
                <UserPlus className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 transition-colors group-focus-within:text-fuchsia-400" />
                <input
                  value={addName}
                  onChange={(e) => {
                    setAddName(e.target.value);
                    setAddFeedback(null);
                  }}
                  placeholder="Nombre de usuario..."
                  aria-label="Nombre de usuario del amigo"
                  autoComplete="off"
                  spellCheck={false}
                  className="h-10 w-full rounded-xl border border-white/[0.07] bg-white/[0.03] pl-9 pr-3 text-sm text-zinc-200 outline-none transition-all placeholder:text-zinc-600 focus:border-fuchsia-500/40 focus:bg-white/[0.05] focus:ring-2 focus:ring-fuchsia-500/20"
                />
              </div>
              <button
                type="submit"
                disabled={!addName.trim() || addBusy}
                className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-3.5 text-[12px] font-semibold text-white shadow-md shadow-fuchsia-500/25 transition-all hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {addBusy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <UserPlus className="h-3.5 w-3.5" />
                )}
                <span className="hidden xs:inline sm:inline">Añadir</span>
              </button>
            </div>
            {addFeedback && (
              <p
                className={cn(
                  "px-1 text-[11.5px] leading-relaxed",
                  addFeedback.kind === "ok"
                    ? "text-emerald-400"
                    : "text-rose-400"
                )}
              >
                {addFeedback.text}
              </p>
            )}
          </form>

          {/* Solicitudes recibidas */}
          {incoming.length > 0 && (
            <section>
              <p className="px-1 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
                Solicitudes ({incoming.length})
              </p>
              <div className="flex flex-col gap-1.5">
                {incoming.map((request) => (
                  <div
                    key={request.requestId}
                    className="flex items-center gap-2.5 rounded-xl border border-white/[0.07] bg-white/[0.02] p-2.5"
                  >
                    <span
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-[13px] font-bold uppercase text-white shadow-md",
                        avatarGradient(request.user.avatarColor)
                      )}
                    >
                      {request.user.displayName.charAt(0)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-zinc-100">
                        {request.user.displayName}
                      </p>
                      <p className="truncate text-[11px] text-zinc-500">
                        @{request.user.username} quiere ser tu amigo
                      </p>
                    </div>
                    <button
                      onClick={() => void respond(request.requestId, "accept")}
                      title="Aceptar"
                      aria-label={`Aceptar a ${request.user.displayName}`}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30 transition-all hover:bg-emerald-500/25 active:scale-95"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => void respond(request.requestId, "decline")}
                      title="Rechazar"
                      aria-label={`Rechazar a ${request.user.displayName}`}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] text-zinc-400 ring-1 ring-white/[0.08] transition-all hover:bg-rose-500/10 hover:text-rose-400 active:scale-95"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Solicitudes enviadas */}
          {outgoing.length > 0 && (
            <section>
              <p className="px-1 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
                Enviadas ({outgoing.length})
              </p>
              <div className="flex flex-col gap-1.5">
                {outgoing.map((request) => (
                  <div
                    key={request.requestId}
                    className="flex items-center gap-2.5 rounded-xl border border-white/[0.05] bg-white/[0.015] p-2.5"
                  >
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-[12px] font-bold uppercase text-white shadow",
                        avatarGradient(request.user.avatarColor)
                      )}
                    >
                      {request.user.displayName.charAt(0)}
                    </span>
                    <p className="min-w-0 flex-1 truncate text-[12.5px] text-zinc-300">
                      {request.user.displayName}
                    </p>
                    <span className="shrink-0 rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400">
                      Pendiente
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Amigos */}
          <section>
            <p className="px-1 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
              Amigos ({friends.length})
            </p>
            {friends.length === 0 ? (
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 text-center">
                <MessageSquare className="mx-auto mb-2.5 h-7 w-7 text-zinc-600" />
                <p className="text-[13px] font-medium text-zinc-300">
                  Todavía no tienes amigos
                </p>
                <p className="mt-1 text-[11.5px] leading-relaxed text-zinc-500">
                  Añade a alguien con su nombre de usuario y chatea mientras
                  juegan.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {friends.map((friend) => (
                  <button
                    key={friend.userId}
                    onClick={() => {
                      setActivePeerId(friend.userId);
                      setMessages([]);
                      messagesRef.current = [];
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl p-2.5 text-left transition-colors hover:bg-white/[0.04]"
                  >
                    <span className="relative shrink-0">
                      <span
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-[14px] font-bold uppercase text-white shadow-md",
                          avatarGradient(friend.avatarColor)
                        )}
                      >
                        {friend.displayName.charAt(0)}
                      </span>
                      <span
                        className={cn(
                          "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-[#0f0f1a]",
                          friend.online ? "bg-emerald-400" : "bg-zinc-600"
                        )}
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-[13px] font-medium text-zinc-100">
                          {friend.displayName}
                        </span>
                        {friend.online && (
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                        )}
                      </span>
                      <span className="block truncate text-[11px] text-zinc-500">
                        {friend.lastMessage
                          ? `${friend.lastMessage.mine ? "Tú: " : ""}${friend.lastMessage.content}`
                          : `@${friend.username}`}
                      </span>
                    </span>
                    {friend.unread > 0 && (
                      <span className="flex h-[20px] min-w-[20px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-red-600 px-1.5 text-[10px] font-bold tabular-nums text-white shadow-lg shadow-rose-500/40">
                        {friend.unread > 99 ? "99+" : friend.unread}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </PanelShell>
  );
}

/* ------------------------------------------------------------------ */

function mergeMessages(
  prev: ChatMessage[],
  incoming: ChatMessage[]
): ChatMessage[] {
  const map = new Map<string, ChatMessage>();
  for (const message of prev) map.set(message.id, message);
  for (const message of incoming) {
    if (!map.has(message.id)) map.set(message.id, message);
  }
  return [...map.values()].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt)
  );
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
