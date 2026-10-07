import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

/**
 * Autenticación de Lucid: solo usuario y contraseña (sin correo).
 * - Hash con scrypt + sal aleatoria (sin dependencias externas).
 * - Sesiones con token aleatorio guardado en base de datos y cookie httpOnly.
 */

export const SESSION_COOKIE = "lucid_session";
const SESSION_DAYS = 30;

const AVATAR_PALETTE = [
  "violet",
  "fuchsia",
  "emerald",
  "amber",
  "rose",
  "cyan",
  "orange",
  "lime",
] as const;

export function pickAvatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 100000;
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  try {
    const expected = Buffer.from(hash, "hex");
    const actual = scryptSync(password, salt, expected.length);
    return timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  avatarColor: string;
}

export function publicUser(user: {
  id: string;
  username: string;
  displayName: string;
  avatarColor: string;
}): PublicUser {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarColor: user.avatarColor,
  };
}

export async function createSession(userId: string): Promise<{
  token: string;
  expiresAt: Date;
}> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.session.create({ data: { token, userId, expiresAt } });
  return { token, expiresAt };
}

export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
}

/** Devuelve el usuario autenticado por cookie, o null. */
export async function getSessionUser() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session) return null;

  if (session.expiresAt.getTime() < Date.now()) {
    await db.session
      .delete({ where: { id: session.id } })
      .catch(() => undefined);
    return null;
  }

  return session.user;
}
