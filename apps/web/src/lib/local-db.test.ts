import "fake-indexeddb/auto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { localDb, readLocalDiagram, saveLocalDiagram } from "@/lib/local-db";
import { type DiagramDocument, type Graph } from "@/lib/graph-schema";

const graph: Graph = {
  schemaVersion: 1,
  nodes: [
    {
      id: "web",
      type: "engineering",
      position: { x: 20, y: 40 },
      data: { label: "Web app", description: "", color: "#ffffff", kind: "service" },
    },
  ],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
  canvasColor: "#f8fafc",
  showGrid: true,
};

const document: DiagramDocument = {
  id: "diagram-1",
  title: "Commerce flow",
  createdAt: 1_791_000_000_000,
  updatedAt: 1_791_000_000_100,
  graph,
};

describe("local diagram persistence", () => {
  beforeEach(async () => {
    await localDb.diagrams.clear();
  });

  afterAll(async () => {
    await localDb.delete();
  });

  it("round-trips a validated diagram through IndexedDB", async () => {
    await saveLocalDiagram(document);

    await expect(readLocalDiagram(document.id)).resolves.toEqual(document);
  });

  it("rejects invalid documents before saving", async () => {
    const invalidDocument = {
      ...document,
      graph: {
        ...graph,
        edges: [{ id: "broken", source: "web", target: "missing" }],
      },
    } as DiagramDocument;

    await expect(saveLocalDiagram(invalidDocument)).rejects.toThrow("Edge target node does not exist.");
    await expect(readLocalDiagram(document.id)).resolves.toBeUndefined();
  });
});
