import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

/**
 * Chat 1 a 1 entre amigos.
 * GET  /api/chat?peer=<userId>&after=<ISO>  → mensajes (y marca como leídos)
 * POST /api/chat { peerId, content }        → enviar mensaje
 */

function serializeMessage(message: {
  id: string;
  senderId: string;
  content: string;
  createdAt: Date;
}) {
  return {
    id: message.id,
    senderId: message.senderId,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
  };
}

async function requireFriendship(meId: string, peerId: string) {
  const friendship = await db.friendship.findFirst({
    where: {
      status: "accepted",
      OR: [
        { fromUserId: meId, toUserId: peerId },
        { fromUserId: peerId, toUserId: meId },
      ],
    },
  });
  return friendship;
}

export async function GET(req: NextRequest) {
  const me = await getSessionUser();
  if (!me) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  const peerId = req.nextUrl.searchParams.get("peer") ?? "";
  const after = req.nextUrl.searchParams.get("after");

  if (!peerId) {
    return NextResponse.json(
      { success: false, error: "Falta el parámetro peer." },
      { status: 400 }
    );
  }

  const friendship = await requireFriendship(me.id, peerId);
  if (!friendship) {
    return NextResponse.json(
      { success: false, error: "No son amigos." },
      { status: 403 }
    );
  }

  const afterDate = after ? new Date(after) : null;
  const validAfter =
    afterDate && !Number.isNaN(afterDate.getTime()) ? afterDate : null;

  const messages = validAfter
    ? await db.message.findMany({
        where: {
          createdAt: { gt: validAfter },
          OR: [
            { senderId: me.id, receiverId: peerId },
            { senderId: peerId, receiverId: me.id },
          ],
        },
        orderBy: { createdAt: "asc" },
        take: 200,
      })
    : (await db.message.findMany({
        where: {
          OR: [
            { senderId: me.id, receiverId: peerId },
            { senderId: peerId, receiverId: me.id },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      })).reverse();

  // Marca como leídos los mensajes recibidos de este amigo.
  await db.message
    .updateMany({
      where: { senderId: peerId, receiverId: me.id, readAt: null },
      data: { readAt: new Date() },
    })
    .catch(() => undefined);

  return NextResponse.json({
    success: true,
    messages: messages.map(serializeMessage),
  });
}

export async function POST(req: NextRequest) {
  const me = await getSessionUser();
  if (!me) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    peerId?: unknown;
    content?: unknown;
  } | null;

  const peerId = String(body?.peerId ?? "");
  const content = String(body?.content ?? "").trim().slice(0, 2000);

  if (!peerId || !content) {
    return NextResponse.json(
      { success: false, error: "Mensaje vacío o destinatario faltante." },
      { status: 400 }
    );
  }

  const friendship = await requireFriendship(me.id, peerId);
  if (!friendship) {
    return NextResponse.json(
      { success: false, error: "No son amigos." },
      { status: 403 }
    );
  }

  const message = await db.message.create({
    data: { senderId: me.id, receiverId: peerId, content },
  });

  return NextResponse.json({
    success: true,
    message: serializeMessage(message),
  });
}
