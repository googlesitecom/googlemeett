import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

/** Aceptar o rechazar una solicitud de amistad recibida. */
export async function POST(req: NextRequest) {
  const me = await getSessionUser();
  if (!me) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    requestId?: unknown;
    action?: unknown;
  } | null;

  const requestId = String(body?.requestId ?? "");
  const action = String(body?.action ?? "");

  if (!requestId || (action !== "accept" && action !== "decline")) {
    return NextResponse.json(
      { success: false, error: "Petición incompleta." },
      { status: 400 }
    );
  }

  const request = await db.friendship.findUnique({
    where: { id: requestId },
  });

  if (!request || request.toUserId !== me.id || request.status !== "pending") {
    return NextResponse.json(
      { success: false, error: "Esa solicitud ya no está disponible." },
      { status: 404 }
    );
  }

  if (action === "accept") {
    await db.friendship.update({
      where: { id: requestId },
      data: { status: "accepted" },
    });
    return NextResponse.json({ success: true, message: "Ahora son amigos." });
  }

  await db.friendship.delete({ where: { id: requestId } });
  return NextResponse.json({ success: true, message: "Solicitud rechazada." });
}
