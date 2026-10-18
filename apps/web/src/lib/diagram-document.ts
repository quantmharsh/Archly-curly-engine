import type { DiagramDocument } from "@/lib/graph-schema";
import { HANDLE_LEFT, HANDLE_RIGHT, type FlowEdge, type FlowNode, type Viewport } from "@/lib/canvas-config";

// Translates between the live canvas state (React Flow nodes and edges) and the
// persisted, Zod-validated DiagramDocument. Kept separate from the canvas so the
// autosave, export, and import paths all share one definition of the stored
// shape.

export function makeDocument(id: string, title: string, nodes: FlowNode[], edges: FlowEdge[], canvasColor: string, viewport: Viewport, showGrid: boolean): DiagramDocument {
  return {
    id,
    title,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    graph: {
      schemaVersion: 1,
      nodes: nodes.map(({ id: nodeId, position, data }) => ({ id: nodeId, type: "engineering" as const, position, data })),
      edges: edges.map(({ id: edgeId, source, target, sourceHandle, targetHandle, label, type, animated, markerEnd, style, data }) => ({
        id: edgeId,
        source,
        target,
        sourceHandle: sourceHandle ?? HANDLE_RIGHT,
        targetHandle: targetHandle ?? HANDLE_LEFT,
        label: typeof label === "string" ? label : undefined,
        type,
        animated,
        markerEnd: markerEnd
          ? typeof markerEnd === "string"
            ? { type: markerEnd }
            : { type: String(markerEnd.type), color: markerEnd.color ?? undefined }
          : undefined,
        style: style ? { ...style } : undefined,
        data: data && (data.waypoints?.length || data.connectionKind) ? {
          ...(data.waypoints?.length ? { waypoints: data.waypoints } : {}),
          ...(data.connectionKind ? { connectionKind: data.connectionKind } : {}),
        } : undefined,
      })),
      viewport,
      canvasColor,
      showGrid,
    },
  };
}

// Edges saved before four-way handles exist have no handle ids. Because every
// handle is a source handle, React Flow's own fallback would attach both ends to
// the right side, so missing handles are resolved to the horizontal defaults
// here rather than left to the library.
export function normalizeStoredEdges(edges: DiagramDocument["graph"]["edges"]): FlowEdge[] {
  return edges.map((edge) => ({
    ...edge,
    type: "archly",
    sourceHandle: edge.sourceHandle ?? HANDLE_RIGHT,
    targetHandle: edge.targetHandle ?? HANDLE_LEFT,
  })) as FlowEdge[];
}
