import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { clearSessionCookie, SESSION_COOKIE } from "@/lib/auth";

/** Cierre de sesión: elimina la sesión de la base y limpia la cookie. */
export async function POST() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session
      .delete({ where: { token } })
      .catch(() => undefined);
  }
  await clearSessionCookie();
  return NextResponse.json({ success: true });
}
