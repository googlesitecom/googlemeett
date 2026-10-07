import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

/** Eliminar a un amigo (y la amistad en ambas direcciones). */
export async function POST(req: NextRequest) {
  const me = await getSessionUser();
  if (!me) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    userId?: unknown;
  } | null;
  const userId = String(body?.userId ?? "");

  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Falta el usuario." },
      { status: 400 }
    );
  }

  await db.friendship.deleteMany({
    where: {
      OR: [
        { fromUserId: me.id, toUserId: userId },
        { fromUserId: userId, toUserId: me.id },
      ],
    },
  });

  return NextResponse.json({ success: true, message: "Amigo eliminado." });
}
