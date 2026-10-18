import { useCallback, useRef, type Dispatch, type SetStateAction } from "react";
import type { FlowEdge, FlowNode, Snapshot } from "@/lib/canvas-config";

// Copy, paste, and duplicate for canvas components. Duplicating copies only the
// arrows whose source and target are both in the selection, and moves any bend
// points by the same offset as the nodes so a copied route keeps its shape.
export function useClipboard(
  nodes: FlowNode[],
  edges: FlowEdge[],
  setNodes: Dispatch<SetStateAction<FlowNode[]>>,
  setEdges: Dispatch<SetStateAction<FlowEdge[]>>,
  setSelectedNodeId: Dispatch<SetStateAction<string | null>>,
  setToast: Dispatch<SetStateAction<string>>,
  recordHistory: () => void,
) {
  const clipboardRef = useRef<Snapshot | null>(null);
  const pasteCountRef = useRef(0);

  const copySelection = useCallback(() => {
    const selectedNodes = nodes.filter((node) => node.selected);
    if (!selectedNodes.length) return;
    const selectedIds = new Set(selectedNodes.map((node) => node.id));
    clipboardRef.current = {
      nodes: structuredClone(selectedNodes),
      edges: structuredClone(edges.filter((edge) => selectedIds.has(edge.source) && selectedIds.has(edge.target))),
    };
    pasteCountRef.current = 0;
    setToast(selectedNodes.length + " component" + (selectedNodes.length === 1 ? "" : "s") + " copied");
  }, [edges, nodes, setToast]);

  const pasteSelection = useCallback(() => {
    const clipboard = clipboardRef.current;
    if (!clipboard?.nodes.length) return;
    recordHistory();
    pasteCountRef.current += 1;
    const offset = 44 * pasteCountRef.current;
    const idMap = new Map(clipboard.nodes.map((node) => [node.id, node.data.kind + "-" + crypto.randomUUID().slice(0, 7)]));
    const pastedNodes = clipboard.nodes.map((node) => ({
      ...structuredClone(node),
      id: idMap.get(node.id)!,
      position: { x: node.position.x + offset, y: node.position.y + offset },
      selected: true,
    }));
    const pastedEdges = clipboard.edges.map((edge) => ({
      ...structuredClone(edge),
      id: "connection-" + crypto.randomUUID(),
      source: idMap.get(edge.source)!,
      target: idMap.get(edge.target)!,
      selected: true,
      data: edge.data?.waypoints?.length ? {
        ...edge.data,
        waypoints: edge.data.waypoints.map((point) => ({ x: point.x + offset, y: point.y + offset })),
      } : edge.data,
    }));
    setNodes((current) => [...current.map((node) => ({ ...node, selected: false })), ...pastedNodes]);
    setEdges((current) => [...current.map((edge) => ({ ...edge, selected: false })), ...pastedEdges]);
    setSelectedNodeId(pastedNodes[0]?.id ?? null);
  }, [recordHistory, setEdges, setNodes, setSelectedNodeId]);

  const duplicateSelection = useCallback(() => {
    const selectedNodes = nodes.filter((node) => node.selected);
    if (!selectedNodes.length) return;
    const selectedIds = new Set(selectedNodes.map((node) => node.id));
    clipboardRef.current = {
      nodes: structuredClone(selectedNodes),
      edges: structuredClone(edges.filter((edge) => selectedIds.has(edge.source) && selectedIds.has(edge.target))),
    };
    pasteCountRef.current = 0;
    pasteSelection();
  }, [edges, nodes, pasteSelection]);

  const duplicateNode = useCallback((id: string) => {
    const node = nodes.find((candidate) => candidate.id === id);
    if (!node) return;
    clipboardRef.current = { nodes: structuredClone([node]), edges: [] };
    pasteCountRef.current = 0;
    pasteSelection();
  }, [nodes, pasteSelection]);

  const hasClipboard = () => Boolean(clipboardRef.current?.nodes.length);

  return { copySelection, pasteSelection, duplicateSelection, duplicateNode, hasClipboard };
}
