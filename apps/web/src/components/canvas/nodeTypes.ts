import { DraggableEdge } from "@/components/canvas/DraggableEdge";
import { EngineeringNode } from "@/components/canvas/EngineeringNode";

// React Flow requires these registries to keep a stable identity: defining them
// inside a component recreates the object every render, which warns and remounts
// every node on the canvas. They stay at module scope for that reason.

export const nodeTypes = { engineering: EngineeringNode };
export const edgeTypes = { archly: DraggableEdge };
