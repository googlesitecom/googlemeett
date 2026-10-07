import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import {
  APPEARANCE_FAVICON_MAX,
  APPEARANCE_TITLE_MAX,
  type Appearance,
} from "@/lib/appearance";

/**
 * Configuración de la página del usuario (nombre de pestaña + logo).
 * GET  → devuelve la apariencia guardada (o los valores por defecto).
 * PUT  → valida y guarda la apariencia en la cuenta del usuario.
 */

const APPEARANCE_SCHEMA = z
  .object({
    title: z.string().trim().min(1).max(APPEARANCE_TITLE_MAX),
    faviconType: z.enum(["default", "emoji", "url", "image"]),
    faviconValue: z.string().max(APPEARANCE_FAVICON_MAX).default(""),
    updatedAt: z.number().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.faviconType === "emoji") {
      if (!value.faviconValue || value.faviconValue.length > 12) {
        ctx.addIssue({
          code: "custom",
          path: ["faviconValue"],
          message: "Emoji no válido",
        });
      }
    } else if (value.faviconType === "url") {
      if (!/^https?:\/\//i.test(value.faviconValue) || value.faviconValue.length > 2048) {
        ctx.addIssue({
          code: "custom",
          path: ["faviconValue"],
          message: "La URL del logo debe empezar por http(s)://",
        });
      }
    } else if (value.faviconType === "image") {
      if (
        !value.faviconValue.startsWith("data:image/") ||
        value.faviconValue.length > APPEARANCE_FAVICON_MAX
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["faviconValue"],
          message: "Imagen demasiado grande o no válida",
        });
      }
    }
  });

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ success: false }, { status: 401 });
  }
  const appearance = parseStored(user.appearance);
  return NextResponse.json({ success: true, appearance });
}

export async function PUT(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = APPEARANCE_SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Datos de configuración no válidos" },
      { status: 400 }
    );
  }

  const appearance = normalize(parsed.data);

  await db.user.update({
    where: { id: user.id },
    data: { appearance: JSON.stringify(appearance) },
  });

  return NextResponse.json({ success: true, appearance });
}

/* ------------------------------------------------------------------ */

function parseStored(raw: string | null): Appearance {
  if (!raw) {
    return {
      title: "Nueva pestaña",
      faviconType: "default",
      faviconValue: "",
    };
  }
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    return normalize({
      title: typeof data.title === "string" ? data.title : "",
      faviconType: data.faviconType,
      faviconValue: typeof data.faviconValue === "string" ? data.faviconValue : "",
      updatedAt: typeof data.updatedAt === "number" ? data.updatedAt : undefined,
    });
  } catch {
    return {
      title: "Nueva pestaña",
      faviconType: "default",
      faviconValue: "",
    };
  }
}

function normalize(value: {
  title: string;
  faviconType: unknown;
  faviconValue: string;
  updatedAt?: number;
}): Appearance {
  const title = value.title.trim().slice(0, APPEARANCE_TITLE_MAX) || "Nueva pestaña";
  const faviconType = (["default", "emoji", "url", "image"] as const).includes(
    value.faviconType as "default" | "emoji" | "url" | "image"
  )
    ? (value.faviconType as "default" | "emoji" | "url" | "image")
    : "default";
  return {
    title,
    faviconType,
    faviconValue: value.faviconValue,
    updatedAt: value.updatedAt,
  };
}
