import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { diagram } from "@/lib/db/schema";
import { diagramDocumentSchema } from "@/lib/graph-schema";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

async function userIdFor(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user.id;
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const userId = await userIdFor(request);
    if (!userId) return NextResponse.json({ error: "Sign in to save account canvases." }, { status: 401 });
    const { id } = await context.params;
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || !("document" in body) || !("expectedRevision" in body)
      || typeof body.expectedRevision !== "number" || !Number.isInteger(body.expectedRevision)) {
      return NextResponse.json({ error: "A document and expected revision are required." }, { status: 400 });
    }
    const parsed = diagramDocumentSchema.safeParse(body.document);
    if (!parsed.success || parsed.data.id !== id) return NextResponse.json({ error: "The canvas document is invalid." }, { status: 400 });
    const result = await db.update(diagram).set({ document: parsed.data, revision: body.expectedRevision + 1, updatedAt: new Date(parsed.data.updatedAt) })
      .where(and(eq(diagram.userId, userId), eq(diagram.id, id), eq(diagram.revision, body.expectedRevision))).returning({ revision: diagram.revision });
    if (result[0]) return NextResponse.json({ revision: result[0].revision });
    const current = await db.select({ document: diagram.document, revision: diagram.revision }).from(diagram)
      .where(and(eq(diagram.userId, userId), eq(diagram.id, id))).limit(1);
    if (!current[0]) return NextResponse.json({ error: "Canvas not found." }, { status: 404 });
    return NextResponse.json({ error: "This canvas changed on another device.", current: current[0] }, { status: 409 });
  } catch {
    return NextResponse.json({ error: "The canvas could not be saved." }, { status: 503 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const userId = await userIdFor(request);
    if (!userId) return NextResponse.json({ error: "Sign in to delete account canvases." }, { status: 401 });
    const { id } = await context.params;
    await db.delete(diagram).where(and(eq(diagram.userId, userId), eq(diagram.id, id)));
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "The canvas could not be deleted." }, { status: 503 });
  }
}
