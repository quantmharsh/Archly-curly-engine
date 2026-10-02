import Dexie, { type EntityTable } from "dexie";
import { diagramDocumentSchema, type DiagramDocument } from "@/lib/graph-schema";

class CanvasDatabase extends Dexie {
  diagrams!: EntityTable<DiagramDocument, "id">;

  constructor() {
    super("archly-guest-canvas");
    this.version(1).stores({ diagrams: "id, title, updatedAt" });
  }
}

export const localDb = new CanvasDatabase();

export async function saveLocalDiagram(document: DiagramDocument) {
  const validated = diagramDocumentSchema.parse(document);
  await localDb.diagrams.put(validated);
}

export async function listLocalDiagrams() {
  return localDb.diagrams.orderBy("updatedAt").reverse().toArray();
}

export async function readLocalDiagram(id: string) {
  const stored = await localDb.diagrams.get(id);
  return stored ? diagramDocumentSchema.parse(stored) : undefined;
}
