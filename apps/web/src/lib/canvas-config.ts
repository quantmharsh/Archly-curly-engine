import type { Edge, Node } from "@xyflow/react";

// Pure configuration for the canvas: what component kinds exist, what
// connections can mean, and how they look. This module is a leaf — it must not
// import from components, so every part of the canvas can depend on it without
// creating an import cycle.

export type Kind = "service" | "database" | "api" | "queue" | "external" | "decision" | "worker" | "function";
export type ConnectionKind = "request" | "data" | "event";
export type NodeData = { label: string; description: string; color: string; kind: Kind };
export type FlowNode = Node<NodeData, "engineering">;
export type EdgeWaypoint = { x: number; y: number };
export type FlowEdge = Edge<{ waypoints?: EdgeWaypoint[]; connectionKind?: ConnectionKind }>;
export type Viewport = { x: number; y: number; zoom: number };
export type Snapshot = { nodes: FlowNode[]; edges: FlowEdge[] };

export const kindMeta: Record<Kind, { label: string; icon: string; className: string; hint: string; mapColor: string }> = {
  service: { label: "Service", icon: "◈", className: "kind-service", hint: "Business logic", mapColor: "#8094d3" },
  database: { label: "Database", icon: "▤", className: "kind-database", hint: "Persistent storage", mapColor: "#72a797" },
  api: { label: "API", icon: "↗", className: "kind-api", hint: "App or endpoint", mapColor: "#638bb0" },
  queue: { label: "Queue", icon: "⇢", className: "kind-queue", hint: "Async messaging", mapColor: "#c18b49" },
  external: { label: "External", icon: "◎", className: "kind-external", hint: "Third-party system", mapColor: "#9169ab" },
  decision: { label: "Decision", icon: "◆", className: "kind-decision", hint: "Branch or condition", mapColor: "#b5626f" },
  worker: { label: "Worker", icon: "⟳", className: "kind-worker", hint: "Background processing", mapColor: "#6b7789" },
  function: { label: "Function", icon: "λ", className: "kind-function", hint: "Serverless compute", mapColor: "#97893f" },
};

// Connection handles exist on all four sides so a flow can run left/right or
// up/down. All four are source handles: React Flow's loose connection mode lets
// any handle start or finish a connection, and the drag direction decides which
// node is the source. These two are the horizontal defaults that older edges
// without handle ids are resolved to (see document-codec.ts).
export const HANDLE_RIGHT = "right";
export const HANDLE_LEFT = "left";

export const connectionMeta: Record<ConnectionKind, { label: string; hint: string; animated: boolean; className: string }> = {
  request: { label: "HTTPS request", hint: "HTTP / API call", animated: true, className: "connection-request" },
  data: { label: "Data flow", hint: "Read / write", animated: false, className: "connection-data" },
  event: { label: "Event publish", hint: "Queue / async", animated: true, className: "connection-event" },
};

export const connectionStyle: Record<ConnectionKind, { stroke: string; strokeWidth: number; strokeDasharray?: string }> = {
  request: { stroke: "#3478c9", strokeWidth: 2.2 },
  data: { stroke: "#21866e", strokeWidth: 2.2, strokeDasharray: "9 6" },
  event: { stroke: "#d38a2c", strokeWidth: 2.4, strokeDasharray: "2 5" },
};

export const customConnectionStyle = { stroke: "#8290a6", strokeWidth: 2, strokeDasharray: undefined };
export const GRID_STEP = 22;
export const MIN_ZOOM = 0.2;
export const MAX_ZOOM = 2.5;
// React Flow's trackpad/touchpad pinch goes through a ctrl+wheel handler whose
// internal factor is 10x smaller on Windows than on macOS, making pinch feel
// sluggish. We intercept that gesture ourselves and amplify it; touchscreen
// pinch (real touch events) keeps React Flow's natural 1:1 ratio.
export const PINCH_WHEEL_INTENSITY = 0.02;
