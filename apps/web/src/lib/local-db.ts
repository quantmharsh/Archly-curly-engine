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

// Which canvas was last open is a small UI pointer, not part of a diagram
// document, so it lives in localStorage next to the IndexedDB database rather
// than inside the versioned graph schema.
const LAST_OPEN_DIAGRAM_KEY = "archly-guest-canvas:last-open-diagram";

export function readLastOpenDiagramId() {
  try {
    return window.localStorage.getItem(LAST_OPEN_DIAGRAM_KEY) || undefined;
  } catch {
    return undefined;
  }
}

export function saveLastOpenDiagramId(id: string) {
  try {
    window.localStorage.setItem(LAST_OPEN_DIAGRAM_KEY, id);
  } catch {
    // Storage can be blocked or full; resuming the last canvas is best-effort.
  }
}
