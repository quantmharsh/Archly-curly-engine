import { createContext } from "react";
import type { FlowEdge } from "@/lib/canvas-config";

// React Flow renders custom nodes and edges outside the component that owns the
// canvas state, so the few callbacks they need are passed through context rather
// than as props. This module is a leaf so both renderers can import it without
// pulling in the canvas itself.

export const HistoryContext = createContext<() => void>(() => undefined);

export const EdgeEditorContext = createContext<{
  updateEdge: (id: string, updates: Partial<FlowEdge>) => void;
  selectEdge: (id: string) => void;
}>({ updateEdge: () => undefined, selectEdge: () => undefined });
