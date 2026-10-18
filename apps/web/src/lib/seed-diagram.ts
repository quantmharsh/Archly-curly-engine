import { MarkerType } from "@xyflow/react";
import type { FlowEdge, FlowNode } from "@/lib/canvas-config";

// The starter diagram, written only when a visitor has no readable canvas at
// all. It must never overwrite an existing document.

export const seedNodes: FlowNode[] = [
  { id: "web-client", type: "engineering", position: { x: 70, y: 185 }, data: { label: "Web client", description: "Customer-facing app", color: "#ffffff", kind: "api" } },
  { id: "order-service", type: "engineering", position: { x: 380, y: 185 }, data: { label: "Order service", description: "Validates and routes orders", color: "#ffffff", kind: "service" } },
  { id: "orders-db", type: "engineering", position: { x: 705, y: 75 }, data: { label: "Orders DB", description: "Order and customer records", color: "#ffffff", kind: "database" } },
  { id: "events", type: "engineering", position: { x: 705, y: 300 }, data: { label: "Event queue", description: "Async order events", color: "#ffffff", kind: "queue" } },
];

export const seedEdges: FlowEdge[] = [
  { id: "client-order", source: "web-client", target: "order-service", label: "HTTPS", type: "archly", animated: true, markerEnd: { type: MarkerType.ArrowClosed, color: "#8290a6" }, data: { connectionKind: "request" } },
  { id: "order-db", source: "order-service", target: "orders-db", label: "read / write", type: "archly", markerEnd: { type: MarkerType.ArrowClosed, color: "#8290a6" }, data: { connectionKind: "data" } },
  { id: "order-events", source: "order-service", target: "events", label: "publish", type: "archly", animated: true, markerEnd: { type: MarkerType.ArrowClosed, color: "#8290a6" }, data: { connectionKind: "event" } },
];
