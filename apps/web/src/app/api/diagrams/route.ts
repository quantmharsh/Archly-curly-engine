import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { diagram } from "@/lib/db/schema";
import { diagramDocumentSchema } from "@/lib/graph-schema";

export const runtime = "nodejs";

async function signedInUser(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user;
}

export async function GET(request: Request) {
  try {
    const user = await signedInUser(request);
    if (!user) return NextResponse.json({ error: "Sign in to access account canvases." }, { status: 401 });
    const rows = await db.select().from(diagram).where(eq(diagram.userId, user.id)).orderBy(desc(diagram.updatedAt));
    return NextResponse.json({ diagrams: rows.map(({ document, revision }) => ({ document, revision })) });
  } catch {
    return NextResponse.json({ error: "Account storage is unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await signedInUser(request);
    if (!user) return NextResponse.json({ error: "Sign in to save account canvases." }, { status: 401 });
    const body: unknown = await request.json();
    const result = diagramDocumentSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: "The canvas document is invalid." }, { status: 400 });
    const document = result.data;
    const existing = await db.select({ document: diagram.document, revision: diagram.revision })
      .from(diagram).where(and(eq(diagram.userId, user.id), eq(diagram.id, document.id))).limit(1);
    if (existing[0]) {
      if (JSON.stringify(existing[0].document) === JSON.stringify(document)) {
        return NextResponse.json({ revision: existing[0].revision, alreadySaved: true });
      }
      return NextResponse.json({ error: "A canvas with this id already exists in the account.", current: existing[0] }, { status: 409 });
    }
    await db.insert(diagram).values({ id: document.id, userId: user.id, document, revision: 1, updatedAt: new Date(document.updatedAt) });
    return NextResponse.json({ revision: 1, alreadySaved: false }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "The canvas could not be saved." }, { status: 503 });
  }
}
