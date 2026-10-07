import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

/** Enviar solicitud de amistad por nombre de usuario. */
export async function POST(req: NextRequest) {
  const me = await getSessionUser();
  if (!me) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    username?: unknown;
  } | null;
  const username = String(body?.username ?? "").trim().toLowerCase();

  if (!username) {
    return NextResponse.json(
      { success: false, error: "Escribe un nombre de usuario." },
      { status: 400 }
    );
  }

  const target = await db.user.findUnique({ where: { username } });
  if (!target) {
    return NextResponse.json(
      { success: false, error: "No existe ningún usuario con ese nombre." },
      { status: 404 }
    );
  }

  if (target.id === me.id) {
    return NextResponse.json(
      { success: false, error: "No puedes agregarte a ti mismo." },
      { status: 400 }
    );
  }

  const existing = await db.friendship.findFirst({
    where: {
      OR: [
        { fromUserId: me.id, toUserId: target.id },
        { fromUserId: target.id, toUserId: me.id },
      ],
    },
  });

  if (existing) {
    if (existing.status === "accepted") {
      return NextResponse.json(
        { success: false, error: `Ya son amigos con ${target.displayName}.` },
        { status: 409 }
      );
    }
    if (existing.fromUserId === me.id) {
      return NextResponse.json(
        {
          success: false,
          error: `Ya enviaste una solicitud a ${target.displayName}. Está pendiente.`,
        },
        { status: 409 }
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: `${target.displayName} ya te envió una solicitud. Revísala arriba.`,
      },
      { status: 409 }
    );
  }

  await db.friendship.create({
    data: { fromUserId: me.id, toUserId: target.id, status: "pending" },
  });

  return NextResponse.json({
    success: true,
    message: `Solicitud enviada a ${target.displayName}.`,
  });
}
