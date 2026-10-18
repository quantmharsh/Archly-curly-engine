import { useCallback, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { FlowEdge, FlowNode, Snapshot } from "@/lib/canvas-config";

// In-memory undo/redo for canvas edits. Snapshots are capped at 40 so a long
// session cannot grow the stack without bound. This is deliberately not durable
// version history — see the phase plan.
export function useDiagramHistory(
  nodes: FlowNode[],
  edges: FlowEdge[],
  setNodes: Dispatch<SetStateAction<FlowNode[]>>,
  setEdges: Dispatch<SetStateAction<FlowEdge[]>>,
) {
  const pastRef = useRef<Snapshot[]>([]);
  const futureRef = useRef<Snapshot[]>([]);
  const [historyStatus, setHistoryStatus] = useState({ canUndo: false, canRedo: false });

  const recordHistory = useCallback(() => {
    pastRef.current = [...pastRef.current.slice(-39), { nodes: structuredClone(nodes), edges: structuredClone(edges) }];
    futureRef.current = [];
    setHistoryStatus({ canUndo: true, canRedo: false });
  }, [edges, nodes]);

  const undo = useCallback(() => {
    const previous = pastRef.current.pop();
    if (!previous) return;
    futureRef.current.push({ nodes: structuredClone(nodes), edges: structuredClone(edges) });
    setNodes(previous.nodes);
    setEdges(previous.edges);
    setHistoryStatus({ canUndo: pastRef.current.length > 0, canRedo: true });
  }, [edges, nodes, setEdges, setNodes]);

  const redo = useCallback(() => {
    const next = futureRef.current.pop();
    if (!next) return;
    pastRef.current.push({ nodes: structuredClone(nodes), edges: structuredClone(edges) });
    setNodes(next.nodes);
    setEdges(next.edges);
    setHistoryStatus({ canUndo: true, canRedo: futureRef.current.length > 0 });
  }, [edges, nodes, setEdges, setNodes]);

  // Stable identity on purpose. activateDocument calls this, and
  // activateDocument is a dependency of the startup-restore effect; an unstable
  // reset would re-run that effect and wipe the undo stack while the user edits.
  const resetHistory = useCallback(() => {
    pastRef.current = [];
    futureRef.current = [];
    setHistoryStatus({ canUndo: false, canRedo: false });
  }, []);

  return { recordHistory, undo, redo, resetHistory, historyStatus };
}
