import { describe, expect, it } from "vitest";
import { diagramDocumentSchema, graphSchema, type DiagramDocument, type Graph } from "@/lib/graph-schema";

function makeGraph(): Graph {
  return {
    schemaVersion: 1,
    nodes: [
      {
        id: "web",
        type: "engineering",
        position: { x: 20, y: 40 },
        data: { label: "Web app", description: "", color: "#ffffff", kind: "service" },
      },
      {
        id: "api",
        type: "engineering",
        position: { x: 240, y: 40 },
        data: { label: "API", description: "", color: "#ffffff", kind: "api" },
      },
    ],
    edges: [{ id: "web-api", source: "web", target: "api", label: "HTTPS request" }],
    viewport: { x: 0, y: 0, zoom: 1 },
    canvasColor: "#f8fafc",
    showGrid: true,
  };
}

function makeDocument(graph = makeGraph()): DiagramDocument {
  return {
    id: "diagram-1",
    title: "Commerce flow",
    createdAt: 1_791_000_000_000,
    updatedAt: 1_791_000_000_100,
    graph,
  };
}

describe("diagramDocumentSchema", () => {
  it("accepts a valid diagram document", () => {
    expect(diagramDocumentSchema.safeParse(makeDocument()).success).toBe(true);
  });

  it("rejects duplicate node IDs", () => {
    const graph = makeGraph();
    graph.nodes[1].id = graph.nodes[0].id;

    const result = graphSchema.safeParse(graph);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message === "Node IDs must be unique.")).toBe(true);
    }
  });

  it("rejects duplicate edge IDs", () => {
    const graph = makeGraph();
    graph.edges.push({ id: "web-api", source: "api", target: "web" });

    const result = graphSchema.safeParse(graph);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message === "Edge IDs must be unique.")).toBe(true);
    }
  });

  it("rejects edges that reference missing nodes", () => {
    const graph = makeGraph();
    graph.edges[0].target = "missing";

    const result = graphSchema.safeParse(graph);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message === "Edge target node does not exist.")).toBe(true);
    }
  });
});
