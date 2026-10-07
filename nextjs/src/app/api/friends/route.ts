import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

/**
 * Lista de amigos y solicitudes del usuario autenticado.
 * También actualiza lastSeen (para el indicador de en línea).
 */
export async function GET() {
  const me = await getSessionUser();
  if (!me) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  await db.user
    .update({ where: { id: me.id }, data: { lastSeen: new Date() } })
    .catch(() => undefined);

  const friendships = await db.friendship.findMany({
    where: {
      OR: [{ fromUserId: me.id }, { toUserId: me.id }],
    },
    include: {
      fromUser: true,
      toUser: true,
    },
  });

  const now = Date.now();
  const ONLINE_WINDOW_MS = 70_000;

  const friendEntries = await Promise.all(
    friendships
      .filter((f) => f.status === "accepted")
      .map(async (f) => {
        const friend = f.fromUserId === me.id ? f.toUser : f.fromUser;

        const [lastMessage] = await db.message.findMany({
          where: {
            OR: [
              { senderId: me.id, receiverId: friend.id },
              { senderId: friend.id, receiverId: me.id },
            ],
          },
          orderBy: { createdAt: "desc" },
          take: 1,
        });

        const unread = await db.message.count({
          where: {
            senderId: friend.id,
            receiverId: me.id,
            readAt: null,
          },
        });

        return {
          userId: friend.id,
          username: friend.username,
          displayName: friend.displayName,
          avatarColor: friend.avatarColor,
          lastSeen: friend.lastSeen.toISOString(),
          online:
            now - friend.lastSeen.getTime() < ONLINE_WINDOW_MS,
          lastMessage: lastMessage
            ? {
                content: lastMessage.content.slice(0, 90),
                createdAt: lastMessage.createdAt.toISOString(),
                mine: lastMessage.senderId === me.id,
              }
            : null,
          unread,
        };
      })
  );

  friendEntries.sort((a, b) => {
    const aTime = a.lastMessage ? Date.parse(a.lastMessage.createdAt) : 0;
    const bTime = b.lastMessage ? Date.parse(b.lastMessage.createdAt) : 0;
    return bTime - aTime;
  });

  const incoming = friendships
    .filter((f) => f.status === "pending" && f.toUserId === me.id)
    .map((f) => ({
      requestId: f.id,
      user: {
        userId: f.fromUser.id,
        username: f.fromUser.username,
        displayName: f.fromUser.displayName,
        avatarColor: f.fromUser.avatarColor,
      },
    }));

  const outgoing = friendships
    .filter((f) => f.status === "pending" && f.fromUserId === me.id)
    .map((f) => ({
      requestId: f.id,
      user: {
        userId: f.toUser.id,
        username: f.toUser.username,
        displayName: f.toUser.displayName,
        avatarColor: f.toUser.avatarColor,
      },
    }));

  return NextResponse.json({
    success: true,
    friends: friendEntries,
    incoming,
    outgoing,
  });
}
