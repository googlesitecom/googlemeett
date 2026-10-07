"use client";

import { useCallback, useEffect, useState } from "react";

/** Tipos compartidos de la sesión y de los amigos. */

export interface Me {
  id: string;
  username: string;
  displayName: string;
  avatarColor: string;
}

export interface FriendEntry {
  userId: string;
  username: string;
  displayName: string;
  avatarColor: string;
  lastSeen: string;
  online: boolean;
  lastMessage: {
    content: string;
    createdAt: string;
    mine: boolean;
  } | null;
  unread: number;
}

export interface RequestEntry {
  requestId: string;
  user: {
    userId: string;
    username: string;
    displayName: string;
    avatarColor: string;
  };
}

export interface FriendsData {
  success: true;
  friends: FriendEntry[];
  incoming: RequestEntry[];
  outgoing: RequestEntry[];
}

/**
 * Sondea /api/friends mientras el usuario está autenticado.
 * Sirve para la insignia de mensajes no leídos y para el panel de chat.
 */
export function useFriendsData(pollMs: number | null) {
  const [data, setData] = useState<FriendsData | null>(null);

  const refresh = useCallback(async (): Promise<FriendsData | null> => {
    try {
      const res = await fetch("/api/friends", { cache: "no-store" });
      if (!res.ok) return null;
      const json = (await res.json()) as FriendsData | { success: false };
      if (json && json.success === true) {
        setData(json);
        return json;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (pollMs === null) return;
    // Primera carga aplazada al siguiente tick para no llamar setState
    // de forma síncrona dentro del efecto.
    const kick = window.setTimeout(() => void refresh(), 0);
    const timer = setInterval(() => void refresh(), pollMs);
    return () => {
      window.clearTimeout(kick);
      clearInterval(timer);
    };
  }, [pollMs, refresh]);

  return { data, refresh };
}

/** Colores de avatar (mapa estático para que Tailwind los incluya). */
export const AVATAR_GRADIENTS: Record<string, string> = {
  violet: "from-violet-500 to-purple-600",
  fuchsia: "from-fuchsia-500 to-pink-600",
  emerald: "from-emerald-500 to-teal-600",
  amber: "from-amber-400 to-orange-500",
  rose: "from-rose-500 to-red-600",
  cyan: "from-cyan-500 to-sky-600",
  orange: "from-orange-400 to-amber-600",
  lime: "from-lime-400 to-green-600",
};

export function avatarGradient(color: string): string {
  return AVATAR_GRADIENTS[color] ?? AVATAR_GRADIENTS.violet;
}
