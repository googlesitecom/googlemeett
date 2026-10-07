import { NextResponse } from "next/server";
import { getSessionUser, publicUser } from "@/lib/auth";

/** Devuelve el usuario con sesión activa (o 401 si no hay). */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ success: false }, { status: 401 });
  }
  return NextResponse.json({ success: true, user: publicUser(user) });
}
