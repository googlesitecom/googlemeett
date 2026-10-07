import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  createSession,
  hashPassword,
  pickAvatarColor,
  publicUser,
  setSessionCookie,
} from "@/lib/auth";

/** Registro de cuenta: solo usuario y contraseña, sin correo. */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    username?: unknown;
    password?: unknown;
    displayName?: unknown;
  } | null;

  const username = String(body?.username ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  const displayName =
    String(body?.displayName ?? "").trim().slice(0, 24) || username;

  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    return NextResponse.json(
      {
        success: false,
        error:
          "El usuario debe tener entre 3 y 20 caracteres (letras, números o guion bajo).",
      },
      { status: 400 }
    );
  }

  if (password.length < 4 || password.length > 72) {
    return NextResponse.json(
      { success: false, error: "La contraseña debe tener entre 4 y 72 caracteres." },
      { status: 400 }
    );
  }

  const existing = await db.user.findUnique({ where: { username } });
  if (existing) {
    return NextResponse.json(
      { success: false, error: "Ese nombre de usuario ya está en uso." },
      { status: 409 }
    );
  }

  const user = await db.user.create({
    data: {
      username,
      displayName,
      passwordHash: hashPassword(password),
      avatarColor: pickAvatarColor(username),
    },
  });

  const { token, expiresAt } = await createSession(user.id);
  await setSessionCookie(token, expiresAt);

  return NextResponse.json({ success: true, user: publicUser(user) });
}
