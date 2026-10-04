import { z } from "zod";

const pointSchema = z.object({ x: z.number().finite(), y: z.number().finite() });

const nodeDataSchema = z.object({
  label: z.string().min(1).max(80),
  description: z.string().max(280).default(""),
  color: z.string().regex(/^#[\da-fA-F]{6}$/).default("#ffffff"),
  kind: z.enum(["service", "database", "api", "queue", "external"]),
});

export const graphNodeSchema = z.object({
  id: z.string().min(1),
  type: z.literal("engineering"),
  position: pointSchema,
  data: nodeDataSchema,
}).passthrough();

export const graphEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  label: z.string().max(100).optional(),
  type: z.string().optional(),
  animated: z.boolean().optional(),
  markerEnd: z.object({ type: z.string(), color: z.string().optional() }).optional(),
  style: z.object({
    stroke: z.string().optional(),
    strokeWidth: z.union([z.number(), z.string()]).optional(),
    strokeDasharray: z.string().optional(),
  }).passthrough().optional(),
  data: z.object({
    waypoints: z.array(pointSchema).optional(),
    connectionKind: z.enum(["request", "data", "event"]).optional(),
  }).passthrough().optional(),
}).passthrough();

export const graphSchema = z.object({
  schemaVersion: z.literal(1),
  nodes: z.array(graphNodeSchema),
  edges: z.array(graphEdgeSchema),
  viewport: z.object({ x: z.number(), y: z.number(), zoom: z.number().positive() }),
  canvasColor: z.string().regex(/^#[\da-fA-F]{6}$/),
  showGrid: z.boolean().default(true),
}).superRefine((graph, context) => {
  const nodeIds = new Set(graph.nodes.map((node) => node.id));
  if (nodeIds.size !== graph.nodes.length) {
    context.addIssue({ code: "custom", path: ["nodes"], message: "Node IDs must be unique." });
  }
  const edgeIds = new Set(graph.edges.map((edge) => edge.id));
  if (edgeIds.size !== graph.edges.length) {
    context.addIssue({ code: "custom", path: ["edges"], message: "Edge IDs must be unique." });
  }
  for (const [index, edge] of graph.edges.entries()) {
    if (!nodeIds.has(edge.source)) {
      context.addIssue({ code: "custom", path: ["edges", index, "source"], message: "Edge source node does not exist." });
    }
    if (!nodeIds.has(edge.target)) {
      context.addIssue({ code: "custom", path: ["edges", index, "target"], message: "Edge target node does not exist." });
    }
  }
});

export const diagramDocumentSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(80),
  createdAt: z.number(),
  updatedAt: z.number(),
  graph: graphSchema,
});

export type Graph = z.infer<typeof graphSchema>;
export type GraphNode = z.infer<typeof graphNodeSchema>;
export type DiagramDocument = z.infer<typeof diagramDocumentSchema>;
