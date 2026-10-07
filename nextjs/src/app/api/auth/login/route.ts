import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  createSession,
  publicUser,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";

/** Inicio de sesión con usuario y contraseña (sin correo). */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    username?: unknown;
    password?: unknown;
  } | null;

  const username = String(body?.username ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");

  if (!username || !password) {
    return NextResponse.json(
      { success: false, error: "Escribe tu usuario y tu contraseña." },
      { status: 400 }
    );
  }

  const user = await db.user.findUnique({ where: { username } });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json(
      { success: false, error: "Usuario o contraseña incorrectos." },
      { status: 401 }
    );
  }

  await db.user
    .update({ where: { id: user.id }, data: { lastSeen: new Date() } })
    .catch(() => undefined);

  const { token, expiresAt } = await createSession(user.id);
  await setSessionCookie(token, expiresAt);

  return NextResponse.json({ success: true, user: publicUser(user) });
}
