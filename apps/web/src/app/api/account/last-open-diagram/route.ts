import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { accountPreference, diagram } from "@/lib/db/schema";

export const runtime = "nodejs";

async function signedInUserId(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user.id;
}

export async function GET(request: Request) {
  try {
    const userId = await signedInUserId(request);
    if (!userId) return NextResponse.json({ error: "Sign in to access account preferences." }, { status: 401 });
    const [preference] = await db.select({ diagramId: accountPreference.lastOpenDiagramId })
      .from(accountPreference).where(eq(accountPreference.userId, userId)).limit(1);
    return NextResponse.json({ diagramId: preference?.diagramId ?? null });
  } catch {
    return NextResponse.json({ error: "Account preferences are unavailable." }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  try {
    const userId = await signedInUserId(request);
    if (!userId) return NextResponse.json({ error: "Sign in to update account preferences." }, { status: 401 });
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || !("diagramId" in body) || typeof body.diagramId !== "string" || !body.diagramId) {
      return NextResponse.json({ error: "A canvas id is required." }, { status: 400 });
    }
    const ownedDiagram = await db.select({ id: diagram.id }).from(diagram)
      .where(and(eq(diagram.userId, userId), eq(diagram.id, body.diagramId))).limit(1);
    if (!ownedDiagram[0]) return NextResponse.json({ error: "Canvas not found." }, { status: 404 });
    await db.insert(accountPreference).values({ userId, lastOpenDiagramId: body.diagramId })
      .onConflictDoUpdate({ target: accountPreference.userId, set: { lastOpenDiagramId: body.diagramId, updatedAt: new Date() } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Account preferences could not be saved." }, { status: 503 });
  }
}
