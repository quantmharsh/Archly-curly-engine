"use client";

import {
  addEdge,
  Background,
  BackgroundVariant,
  BaseEdge,
  Controls,
  EdgeLabelRenderer,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  SelectionMode,
  applyEdgeChanges,
  applyNodeChanges,
  getSmoothStepPath,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
  useReactFlow,
} from "@xyflow/react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import { listLocalDiagrams, readLocalDiagram, saveLocalDiagram } from "@/lib/local-db";
import { diagramDocumentSchema, type DiagramDocument } from "@/lib/graph-schema";

type Kind = "service" | "database" | "api" | "queue" | "external";
type ConnectionKind = "request" | "data" | "event";
type NodeData = { label: string; description: string; color: string; kind: Kind };
type FlowNode = Node<NodeData, "engineering">;
type EdgeWaypoint = { x: number; y: number };
type FlowEdge = Edge<{ waypoints?: EdgeWaypoint[]; connectionKind?: ConnectionKind }>;
const HistoryContext = createContext<() => void>(() => undefined);
const EdgeEditorContext = createContext<{
  updateEdge: (id: string, updates: Partial<FlowEdge>) => void;
  selectEdge: (id: string) => void;
}>({ updateEdge: () => undefined, selectEdge: () => undefined });

const kindMeta: Record<Kind, { label: string; icon: string; className: string }> = {
  service: { label: "Service", icon: "◈", className: "kind-service" },
  database: { label: "Database", icon: "▤", className: "kind-database" },
  api: { label: "API", icon: "↗", className: "kind-api" },
  queue: { label: "Queue", icon: "⇢", className: "kind-queue" },
  external: { label: "External", icon: "◎", className: "kind-external" },
};

const connectionMeta: Record<ConnectionKind, { label: string; hint: string; animated: boolean; className: string }> = {
  request: { label: "HTTPS request", hint: "HTTP / API call", animated: true, className: "connection-request" },
  data: { label: "Data flow", hint: "Read / write", animated: false, className: "connection-data" },
  event: { label: "Event publish", hint: "Queue / async", animated: true, className: "connection-event" },
};

const connectionStyle: Record<ConnectionKind, { stroke: string; strokeWidth: number; strokeDasharray?: string }> = {
  request: { stroke: "#3478c9", strokeWidth: 2.2 },
  data: { stroke: "#21866e", strokeWidth: 2.2, strokeDasharray: "9 6" },
  event: { stroke: "#d38a2c", strokeWidth: 2.4, strokeDasharray: "2 5" },
};
const customConnectionStyle = { stroke: "#8290a6", strokeWidth: 2, strokeDasharray: undefined };

const seedNodes: FlowNode[] = [
  { id: "web-client", type: "engineering", position: { x: 70, y: 185 }, data: { label: "Web client", description: "Customer-facing app", color: "#ffffff", kind: "api" } },
  { id: "order-service", type: "engineering", position: { x: 380, y: 185 }, data: { label: "Order service", description: "Validates and routes orders", color: "#ffffff", kind: "service" } },
  { id: "orders-db", type: "engineering", position: { x: 705, y: 75 }, data: { label: "Orders DB", description: "Order and customer records", color: "#ffffff", kind: "database" } },
  { id: "events", type: "engineering", position: { x: 705, y: 300 }, data: { label: "Event queue", description: "Async order events", color: "#ffffff", kind: "queue" } },
];

const seedEdges: FlowEdge[] = [
  { id: "client-order", source: "web-client", target: "order-service", label: "HTTPS", type: "archly", animated: true, markerEnd: { type: MarkerType.ArrowClosed, color: "#8290a6" }, data: { connectionKind: "request" } },
  { id: "order-db", source: "order-service", target: "orders-db", label: "read / write", type: "archly", markerEnd: { type: MarkerType.ArrowClosed, color: "#8290a6" }, data: { connectionKind: "data" } },
  { id: "order-events", source: "order-service", target: "events", label: "publish", type: "archly", animated: true, markerEnd: { type: MarkerType.ArrowClosed, color: "#8290a6" }, data: { connectionKind: "event" } },
];

function EngineeringNode({ id, data, selected }: NodeProps<FlowNode>) {
  const { updateNodeData } = useReactFlow<FlowNode, FlowEdge>();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(data.label);
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelEditRef = useRef(false);
  const meta = kindMeta[data.kind];

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const finishEditing = () => {
    if (cancelEditRef.current) {
      cancelEditRef.current = false;
      setEditing(false);
      return;
    }
    updateNodeData(id, { label: draft.trim() || "Untitled component" });
    setEditing(false);
  };

  const startEditing = () => {
    setDraft(data.label);
    setEditing(true);
  };

  return (
    <div className={`engineering-node ${meta.className} ${selected ? "is-selected" : ""}`} style={{ "--node-tint": data.color } as CSSProperties} onDoubleClick={(event) => {
      if ((event.target as HTMLElement).closest("input")) return;
      event.preventDefault();
      startEditing();
    }}>
      <Handle type="target" position={Position.Left} />
      <div className="node-glyph">{meta.icon}</div>
      <div className="node-copy">
        <span className="node-kind">{meta.label}</span>
        {editing ? <input ref={inputRef} className="node-label-input nodrag" aria-label="Component name" value={draft} maxLength={80}
          onPointerDown={(event) => event.stopPropagation()}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={finishEditing}
          onKeyDown={(event) => {
            if (event.key === "Enter") inputRef.current?.blur();
            if (event.key === "Escape") { cancelEditRef.current = true; setDraft(data.label); inputRef.current?.blur(); }
          }}
        /> : <strong title="Double-click to edit">{data.label}</strong>}
        <small>{data.description || "Add a short description"}</small>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

function getWaypointEdgePath(source: EdgeWaypoint, target: EdgeWaypoint, waypoints: EdgeWaypoint[]) {
  const points = [source, ...waypoints, target];
  return points.slice(0, -1).reduce((path, point, index) => {
    const previous = points[Math.max(0, index - 1)];
    const next = points[index + 1];
    const following = points[Math.min(points.length - 1, index + 2)];
    const firstControl = { x: point.x + (next.x - previous.x) / 6, y: point.y + (next.y - previous.y) / 6 };
    const secondControl = { x: next.x - (following.x - point.x) / 6, y: next.y - (following.y - point.y) / 6 };
    return `${path} C ${firstControl.x},${firstControl.y} ${secondControl.x},${secondControl.y} ${next.x},${next.y}`;
  }, `M ${source.x},${source.y}`);
}

function DraggableEdge({
  id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition,
  markerStart, markerEnd, style, selected, data, label,
  labelStyle, labelShowBg, labelBgStyle,
}: EdgeProps<FlowEdge>) {
  const { getEdge, screenToFlowPosition, updateEdgeData } = useReactFlow<FlowNode, FlowEdge>();
  const recordHistory = useContext(HistoryContext);
  const { updateEdge, selectEdge } = useContext(EdgeEditorContext);
  const dragIndexRef = useRef<number | null>(null);
  const labelInputRef = useRef<HTMLInputElement>(null);
  const cancelLabelEditRef = useRef(false);
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState(typeof label === "string" ? label : "");
  const waypoints = data?.waypoints ?? [];
  const source = { x: sourceX, y: sourceY };
  const target = { x: targetX, y: targetY };
  const [smoothStepPath, defaultLabelX, defaultLabelY] = getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, borderRadius: 12 });
  const path = waypoints.length ? getWaypointEdgePath(source, target, waypoints) : smoothStepPath;
  // For manually routed edges, anchor the label to the route itself so it follows
  // dragged bends and endpoint movement instead of staying on the default route.
  const labelPosition = waypoints.length ? (() => {
    const points = [source, ...waypoints, target];
    const lengths = points.slice(0, -1).map((point, index) => Math.hypot(points[index + 1].x - point.x, points[index + 1].y - point.y));
    const routeLength = lengths.reduce((total, length) => total + length, 0);
    let remaining = routeLength / 2;
    for (let index = 0; index < lengths.length; index += 1) {
      const length = lengths[index];
      if (remaining <= length || index === lengths.length - 1) {
        const start = points[index];
        const end = points[index + 1];
        const progress = length ? remaining / length : 0;
        return { x: start.x + (end.x - start.x) * progress, y: start.y + (end.y - start.y) * progress };
      }
      remaining -= length;
    }
    return { x: defaultLabelX, y: defaultLabelY };
  })() : { x: defaultLabelX, y: defaultLabelY };
  const centerX = labelPosition.x;
  const centerY = labelPosition.y;
  const categoryStyle = data?.connectionKind ? connectionStyle[data.connectionKind] : customConnectionStyle;
  const resolvedEdgeStyle = { ...categoryStyle, ...style };
  const isDashed = Boolean(resolvedEdgeStyle.strokeDasharray);
  const edgeStyle = isDashed ? { ...resolvedEdgeStyle, strokeWidth: Math.max(Number(resolvedEdgeStyle.strokeWidth) || 0, 2.5) } : resolvedEdgeStyle;

  useEffect(() => {
    if (editingLabel) {
      labelInputRef.current?.focus();
      labelInputRef.current?.select();
    } else {
      setLabelDraft(typeof label === "string" ? label : "");
    }
  }, [editingLabel, label]);

  const finishLabelEditing = () => {
    if (cancelLabelEditRef.current) {
      cancelLabelEditRef.current = false;
      setLabelDraft(typeof label === "string" ? label : "");
      setEditingLabel(false);
      return;
    }
    const nextLabel = labelDraft.trim();
    if (nextLabel !== (typeof label === "string" ? label : "")) {
      recordHistory();
      updateEdge(id, { label: nextLabel || undefined });
    }
    setEditingLabel(false);
  };

  const moveWaypoint = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const index = dragIndexRef.current;
    if (index === null) return;
    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    const current = getEdge(id)?.data?.waypoints ?? waypoints;
    const next = [...current];
    next[index] = position;
    updateEdgeData(id, { waypoints: next });
  };

  const startWaypointDrag = (event: ReactPointerEvent<HTMLButtonElement>, index: number) => {
    event.preventDefault();
    event.stopPropagation();
    recordHistory();
    dragIndexRef.current = index;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  return <>
    <BaseEdge
      id={id}
      path={path}
      markerStart={markerStart}
      markerEnd={markerEnd}
      style={edgeStyle}
      interactionWidth={24}
    />
    {(selected || Boolean(label) || editingLabel) && <EdgeLabelRenderer>
      {(Boolean(label) || selected || editingLabel) && <div
        className={`edge-label-anchor nodrag nopan ${selected ? "is-selected" : ""}`}
        style={{ ...labelStyle, ...(labelShowBg ? labelBgStyle : {}), transform: `translate(-50%,-50%) translate(${centerX}px,${centerY}px)` }}
        onDoubleClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          cancelLabelEditRef.current = false;
          setLabelDraft(typeof label === "string" ? label : "");
          setEditingLabel(true);
        }}
      >{editingLabel ? <input
        ref={labelInputRef}
        className="edge-label-input nodrag nopan"
        aria-label="Connection label"
        maxLength={100}
        value={labelDraft}
        onPointerDown={(event) => event.stopPropagation()}
        onChange={(event) => setLabelDraft(event.target.value)}
        onBlur={finishLabelEditing}
        onKeyDown={(event) => {
          if (event.key === "Enter") labelInputRef.current?.blur();
          if (event.key === "Escape") { cancelLabelEditRef.current = true; labelInputRef.current?.blur(); }
        }}
      /> : <button
        className="edge-label-text"
        type="button"
        title="Double-click to edit connection label"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => { event.stopPropagation(); selectEdge(id); }}
      >{typeof label === "string" && label ? label : "Add label"}</button>}</div>}
      <button
        className="edge-add-bend nodrag nopan"
        aria-label="Add a draggable bend to this arrow"
        title="Add bend"
        style={{ transform: `translate(-50%,-50%) translate(${centerX}px,${centerY - 22}px)` }}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          recordHistory();
          if (!waypoints.length) {
            updateEdgeData(id, { waypoints: [{ x: centerX, y: centerY }] });
            return;
          }
          const points = [source, ...waypoints, target];
          let longestSegment = 0;
          let longestLength = -1;
          points.slice(0, -1).forEach((point, index) => {
            const next = points[index + 1];
            const length = Math.hypot(next.x - point.x, next.y - point.y);
            if (length > longestLength) { longestLength = length; longestSegment = index; }
          });
          const start = points[longestSegment];
          const end = points[longestSegment + 1];
          const nextWaypoints = [...waypoints];
          nextWaypoints.splice(longestSegment, 0, { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 });
          updateEdgeData(id, { waypoints: nextWaypoints });
        }}
      >+</button>
      {waypoints.map((point, index) => <button
        key={`${id}-waypoint-${index}`}
        className="edge-waypoint nodrag nopan"
        aria-label={`Drag arrow bend ${index + 1}`}
        title="Drag to reshape; double-click to remove bend"
        style={{ transform: `translate(-50%,-50%) translate(${point.x}px,${point.y}px)` }}
        onPointerDown={(event) => startWaypointDrag(event, index)}
        onPointerMove={moveWaypoint}
        onPointerUp={() => { dragIndexRef.current = null; }}
        onLostPointerCapture={() => { dragIndexRef.current = null; }}
        onDoubleClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          recordHistory();
          updateEdgeData(id, { waypoints: waypoints.filter((_, waypointIndex) => waypointIndex !== index) });
        }}
      />)}
    </EdgeLabelRenderer>}
  </>;
}

const nodeTypes = { engineering: EngineeringNode };
const edgeTypes = { archly: DraggableEdge };

type Viewport = { x: number; y: number; zoom: number };
type Snapshot = { nodes: FlowNode[]; edges: FlowEdge[] };
type ClipboardSnapshot = { nodes: FlowNode[]; edges: FlowEdge[] };

function makeDocument(id: string, title: string, nodes: FlowNode[], edges: FlowEdge[], canvasColor: string, viewport: Viewport, showGrid: boolean): DiagramDocument {
  return {
    id,
    title,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    graph: {
      schemaVersion: 1,
      nodes: nodes.map(({ id: nodeId, position, data }) => ({ id: nodeId, type: "engineering" as const, position, data })),
      edges: edges.map(({ id: edgeId, source, target, label, type, animated, markerEnd, style, data }) => ({
        id: edgeId,
        source,
        target,
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

function StudioContent() {
  const { screenToFlowPosition, fitView, fitBounds, getNodesBounds, setViewport: setFlowViewport } = useReactFlow<FlowNode, FlowEdge>();
  const [diagramId, setDiagramId] = useState("starter-flow");
  const [title, setTitle] = useState("Commerce service flow");
  const [nodes, setNodes] = useNodesState<FlowNode>(seedNodes);
  const [edges, setEdges] = useEdgesState<FlowEdge>(seedEdges);
  const [canvasColor, setCanvasColor] = useState("#f6f7fb");
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [edgeLabelDraft, setEdgeLabelDraft] = useState("");
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [rightPanelMode, setRightPanelMode] = useState<"settings" | "inspector" | "edge-inspector">("settings");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [diagrams, setDiagrams] = useState<DiagramDocument[]>([]);
  const [saveState, setSaveState] = useState<"saving" | "saved" | "error">("saved");
  const [showLibrary, setShowLibrary] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<{ document: DiagramDocument; fileName: string } | null>(null);
  const [importError, setImportError] = useState("");
  const [importBusy, setImportBusy] = useState(false);
  const [showCanvasColors, setShowCanvasColors] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [connectionKind, setConnectionKind] = useState<ConnectionKind | null>(null);
  const [connectionSourceId, setConnectionSourceId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState("");
  const flowRef = useRef<HTMLDivElement>(null);
  const importFileRef = useRef<HTMLInputElement>(null);
  const cancelInspectorEdgeLabelRef = useRef(false);
  const fullscreenPreviousViewportRef = useRef<Viewport | null>(null);
  const pastRef = useRef<Snapshot[]>([]);
  const futureRef = useRef<Snapshot[]>([]);
  const clipboardRef = useRef<ClipboardSnapshot | null>(null);
  const pasteCountRef = useRef(0);
  const nodeDragActiveRef = useRef(false);
  const [historyStatus, setHistoryStatus] = useState({ canUndo: false, canRedo: false });
  const selectedNode = nodes.find((node) => node.id === selectedNodeId);
  const selectedEdge = edges.find((edge) => edge.id === selectedEdgeId);

  const recordHistory = useCallback(() => {
    pastRef.current = [...pastRef.current.slice(-39), { nodes: structuredClone(nodes), edges: structuredClone(edges) }];
    futureRef.current = [];
    setHistoryStatus({ canUndo: true, canRedo: false });
  }, [edges, nodes]);

  const updateEdge = useCallback((id: string, updates: Partial<FlowEdge>) => {
    setEdges((current) => current.map((edge) => edge.id === id ? { ...edge, ...updates } : edge));
  }, [setEdges]);

  const selectEdge = useCallback((id: string) => {
    setNodes((current) => current.map((node) => ({ ...node, selected: false })));
    setEdges((current) => current.map((edge) => ({ ...edge, selected: edge.id === id })));
    setSelectedNodeId(null);
    setSelectedEdgeId(id);
  }, [setEdges, setNodes]);

  const updateSelectedEdge = (updates: Partial<FlowEdge>, createHistory = true) => {
    if (!selectedEdgeId) return;
    if (createHistory) recordHistory();
    updateEdge(selectedEdgeId, updates);
  };

  const commitInspectorEdgeLabel = () => {
    if (!selectedEdge) return;
    if (cancelInspectorEdgeLabelRef.current) {
      cancelInspectorEdgeLabelRef.current = false;
      setEdgeLabelDraft(typeof selectedEdge.label === "string" ? selectedEdge.label : "");
      return;
    }
    const nextLabel = edgeLabelDraft.trim();
    const currentLabel = typeof selectedEdge.label === "string" ? selectedEdge.label : "";
    if (nextLabel !== currentLabel) updateSelectedEdge({ label: nextLabel || undefined });
  };

  useEffect(() => {
    setEdgeLabelDraft(typeof selectedEdge?.label === "string" ? selectedEdge.label : "");
  }, [selectedEdge?.id, selectedEdge?.label]);

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
  }, [edges, nodes]);

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
  }, [recordHistory, setEdges, setNodes]);

  useEffect(() => {
    const handleCanvasShortcuts = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || !(event.ctrlKey || event.metaKey)) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || target.closest("input, textarea, select, [contenteditable='true']"))) return;
      const key = event.key.toLowerCase();
      if (key === "c") {
        if (!nodes.some((node) => node.selected)) return;
        event.preventDefault();
        copySelection();
      } else if (key === "v") {
        if (!clipboardRef.current?.nodes.length) return;
        event.preventDefault();
        pasteSelection();
      } else if (key === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      } else if (key === "y") {
        event.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handleCanvasShortcuts);
    return () => window.removeEventListener("keydown", handleCanvasShortcuts);
  }, [copySelection, nodes, pasteSelection, redo, undo]);

  const refreshLibrary = useCallback(async () => {
    setDiagrams(await listLocalDiagrams());
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const existing = await readLocalDiagram("starter-flow");
        if (existing && active) {
          setTitle(existing.title);
          setNodes(existing.graph.nodes as FlowNode[]);
          setEdges(existing.graph.edges.map((edge) => ({ ...edge, type: "archly" })) as FlowEdge[]);
          setCanvasColor(existing.graph.canvasColor);
          setViewport(existing.graph.viewport);
          setShowGrid(existing.graph.showGrid);
        } else {
          const starter = makeDocument("starter-flow", "Commerce service flow", seedNodes, seedEdges, "#f6f7fb", { x: 0, y: 0, zoom: 1 }, true);
          await saveLocalDiagram(starter);
        }
        if (active) {
          await refreshLibrary();
          setLoaded(true);
        }
      } catch {
        if (active) {
          setSaveState("error");
          setLoaded(true);
        }
      }
    })();
    return () => { active = false; };
  }, [refreshLibrary, setEdges, setNodes]);

  useEffect(() => {
    const updateFullscreenState = () => {
      const fullscreen = document.fullscreenElement === flowRef.current;
      setIsFullscreen(fullscreen);
      if (!fullscreen && fullscreenPreviousViewportRef.current) {
        const previousViewport = fullscreenPreviousViewportRef.current;
        fullscreenPreviousViewportRef.current = null;
        setViewport(previousViewport);
        void setFlowViewport(previousViewport, { duration: 180 });
      }
    };
    document.addEventListener("fullscreenchange", updateFullscreenState);
    return () => document.removeEventListener("fullscreenchange", updateFullscreenState);
  }, [setFlowViewport]);

  useEffect(() => {
    if (!loaded) return;
    const timer = window.setTimeout(async () => {
      setSaveState("saving");
      try {
        const previous = await readLocalDiagram(diagramId);
        const document = makeDocument(diagramId, title.trim() || "Untitled flow", nodes, edges, canvasColor, viewport, showGrid);
        document.createdAt = previous?.createdAt ?? document.createdAt;
        await saveLocalDiagram(document);
        await refreshLibrary();
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, 450);
    return () => window.clearTimeout(timer);
  }, [canvasColor, diagramId, edges, loaded, nodes, refreshLibrary, showGrid, title, viewport]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2300);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!importDialogOpen) return;
    const closeImportOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !importBusy) setImportDialogOpen(false);
    };
    window.addEventListener("keydown", closeImportOnEscape);
    return () => window.removeEventListener("keydown", closeImportOnEscape);
  }, [importBusy, importDialogOpen]);

  const onConnect = useCallback((connection: Connection) => {
    recordHistory();
    setEdges((current) => addEdge({ ...connection, type: "archly", data: { connectionKind: "request" }, markerEnd: { type: MarkerType.ArrowClosed, color: "#8290a6" } }, current));
  }, [recordHistory, setEdges]);

  const onNodeClick = useCallback((event: ReactMouseEvent, node: FlowNode) => {
    if (event.detail > 1) return;
    if (!connectionKind) return;
    if (!connectionSourceId) {
      setConnectionSourceId(node.id);
      setToast(`Now choose a destination for ${connectionMeta[connectionKind].label}.`);
      return;
    }
    if (connectionSourceId === node.id) {
      setConnectionSourceId(null);
      setToast("Choose a different component as the destination.");
      return;
    }

    const template = connectionMeta[connectionKind];
    recordHistory();
    setEdges((current) => addEdge({
      id: `connection-${crypto.randomUUID()}`,
      source: connectionSourceId,
      target: node.id,
      label: template.label,
      type: "archly",
      animated: template.animated,
      data: { connectionKind },
      markerEnd: { type: MarkerType.ArrowClosed, color: "#8290a6" },
    }, current));
    setConnectionKind(null);
    setConnectionSourceId(null);
    setToast(`${template.label} connection added`);
  }, [connectionKind, connectionSourceId, recordHistory, setEdges]);

  const selectConnection = (kind: ConnectionKind) => {
    if (connectionKind === kind) {
      setConnectionKind(null);
      setConnectionSourceId(null);
      setToast("Connection mode canceled");
      return;
    }
    setConnectionKind(kind);
    setConnectionSourceId(null);
    setToast(`Select a source component for ${connectionMeta[kind].label}.`);
  };

  const addNode = (kind: Kind) => {
    recordHistory();
    const id = `${kind}-${crypto.randomUUID().slice(0, 7)}`;
    const node: FlowNode = {
      id,
      type: "engineering",
      position: { x: 210 + (nodes.length % 3) * 60, y: 130 + (nodes.length % 4) * 55 },
      data: { label: `New ${kindMeta[kind].label.toLowerCase()}`, description: "Click to describe this component", kind, color: "#ffffff" },
    };
    setNodes((current) => [...current, node]);
    setSelectedNodeId(id);
    setToast(`${kindMeta[kind].label} added to canvas`);
  };

  const createDiagram = async () => {
    const id = crypto.randomUUID();
    const next = makeDocument(id, "Untitled flow", [], [], canvasColor, { x: 0, y: 0, zoom: 1 }, showGrid);
    await saveLocalDiagram(next);
    setDiagramId(id);
    setTitle(next.title);
    setNodes([]);
    setEdges([]);
    setViewport({ x: 0, y: 0, zoom: 1 });
    setShowGrid(true);
    pastRef.current = [];
    futureRef.current = [];
    setHistoryStatus({ canUndo: false, canRedo: false });
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setShowLibrary(false);
    await refreshLibrary();
    setToast("New local canvas created");
  };

  const openDiagram = async (id: string) => {
    const document = await readLocalDiagram(id);
    if (!document) return;
    setDiagramId(document.id);
    setTitle(document.title);
    setNodes(document.graph.nodes as FlowNode[]);
    setEdges(document.graph.edges.map((edge) => ({ ...edge, type: "archly" })) as FlowEdge[]);
    setCanvasColor(document.graph.canvasColor);
    setViewport(document.graph.viewport);
    setShowGrid(document.graph.showGrid);
    pastRef.current = [];
    futureRef.current = [];
    setHistoryStatus({ canUndo: false, canRedo: false });
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setShowLibrary(false);
  };

  const beginImport = () => {
    if (!loaded) return;
    setShowLibrary(false);
    setImportPreview(null);
    setImportError("");
    setImportDialogOpen(true);
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setImportPreview(null);
    setImportError("");
    if (!file.name.toLowerCase().endsWith(".json")) {
      setImportError("Choose an Archly JSON backup file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setImportError("This backup is larger than the 10 MB import limit.");
      return;
    }

    let contents: unknown;
    try {
      contents = JSON.parse(await file.text());
    } catch {
      setImportError("This file is not valid JSON. Your existing canvases have not changed.");
      return;
    }
    const result = diagramDocumentSchema.safeParse(contents);
    if (!result.success) {
      setImportError("This file is not a valid Archly canvas backup: " + result.error.issues[0]?.message);
      return;
    }
    setImportPreview({ document: result.data, fileName: file.name });
  };

  const importBackupAsNewCanvas = async () => {
    if (!importPreview || importBusy) return;
    setImportBusy(true);
    setImportError("");
    try {
      const now = Date.now();
      const imported = {
        ...importPreview.document,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
      };

      // Flush the open canvas before switching so its latest edits survive the import.
      const current = makeDocument(diagramId, title.trim() || "Untitled flow", nodes, edges, canvasColor, viewport, showGrid);
      try {
        const existing = await readLocalDiagram(diagramId);
        current.createdAt = existing?.createdAt ?? current.createdAt;
      } catch {
        // Preserve the current in-memory canvas even if an older local record is invalid.
      }
      await saveLocalDiagram(current);
      await saveLocalDiagram(imported);

      setDiagramId(imported.id);
      setTitle(imported.title);
      setNodes(imported.graph.nodes as FlowNode[]);
      setEdges(imported.graph.edges.map((edge) => ({ ...edge, type: "archly" })) as FlowEdge[]);
      setCanvasColor(imported.graph.canvasColor);
      setViewport(imported.graph.viewport);
      setShowGrid(imported.graph.showGrid);
      pastRef.current = [];
      futureRef.current = [];
      setHistoryStatus({ canUndo: false, canRedo: false });
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      setSaveState("saved");
      setImportDialogOpen(false);
      await refreshLibrary().catch(() => undefined);
      setToast("Imported " + imported.title + " as a new canvas");
    } catch {
      setImportError("The backup could not be saved. Your open canvas has been preserved; try again.");
    } finally {
      setImportBusy(false);
    }
  };

  const updateSelected = (key: keyof NodeData, value: string) => {
    if (!selectedNodeId) return;
    setNodes((current) => current.map((node) => node.id === selectedNodeId ? { ...node, data: { ...node.data, [key]: value } } : node));
  };

  const removeSelectedNode = () => {
    if (!selectedNodeId) return;
    recordHistory();
    setNodes((current) => current.filter((node) => node.id !== selectedNodeId));
    setEdges((current) => current.filter((edge) => edge.source !== selectedNodeId && edge.target !== selectedNodeId));
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  };

  const exportDiagram = () => {
    const blob = new Blob([JSON.stringify(makeDocument(diagramId, title, nodes, edges, canvasColor, viewport, showGrid), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "diagram"}.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setToast("Diagram backup downloaded");
  };

  const toggleFullscreen = async () => {
    const canvas = flowRef.current;
    if (!canvas) return;
    try {
      if (document.fullscreenElement === canvas) await document.exitFullscreen();
      else {
        fullscreenPreviousViewportRef.current = viewport;
        await canvas.requestFullscreen({ navigationUI: "hide" });
        window.requestAnimationFrame(() => {
          if (!nodes.length) {
            void fitView({ padding: 0.16, duration: 220 });
            return;
          }
          const nodeBounds = getNodesBounds(nodes);
          const routePoints = edges.flatMap((edge) => edge.data?.waypoints ?? []);
          const minX = Math.min(nodeBounds.x, ...routePoints.map((point) => point.x));
          const minY = Math.min(nodeBounds.y, ...routePoints.map((point) => point.y));
          const maxX = Math.max(nodeBounds.x + nodeBounds.width, ...routePoints.map((point) => point.x));
          const maxY = Math.max(nodeBounds.y + nodeBounds.height, ...routePoints.map((point) => point.y));
          const margin = 60;
          void fitBounds({ x: minX - margin, y: minY - margin, width: maxX - minX + margin * 2, height: maxY - minY + margin * 2 }, { padding: 0.05, duration: 220 });
        });
      }
    } catch {
      fullscreenPreviousViewportRef.current = null;
      setToast("Full screen mode is unavailable in this browser");
    }
  };

  const nodeCount = nodes.length;
  const activeDocumentTitle = useMemo(() => title.trim() || "Untitled flow", [title]);

  return (
    <main className="studio-shell">
      <input ref={importFileRef} type="file" accept="application/json,.json" aria-label="Choose an Archly JSON backup" hidden onChange={handleImportFile} />
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark"><span /><span /><span /></div>
          <span className="brand-name">archly</span>
          <span className="brand-divider" />
          <span className="product-name">Engineering canvas</span>
        </div>
        <div className="topbar-center">
          <button className="diagram-title" onClick={() => setShowLibrary((open) => !open)} title="Open your canvases">
            <span className="title-icon">⌘</span><span>{activeDocumentTitle}</span><span className="chevron">⌄</span>
          </button>
          {showLibrary && <div className="library-popover">
            <div className="popover-heading"><div><strong>Your canvases</strong><small>Saved in this browser</small></div><button className="icon-button small" onClick={() => setShowLibrary(false)} aria-label="Close canvas list">×</button></div>
            <button className="new-diagram-button" onClick={createDiagram}><span>＋</span> Create a new canvas</button>
            <button className="import-backup-button" onClick={beginImport}><span>↑</span> Import JSON backup</button>
            <div className="diagram-list">{diagrams.map((diagram) => <button key={diagram.id} className={`diagram-row ${diagram.id === diagramId ? "current" : ""}`} onClick={() => openDiagram(diagram.id)}><span className="diagram-row-icon">◈</span><span className="diagram-row-copy"><strong>{diagram.title || "Untitled flow"}</strong><small>{diagram.graph.nodes.length} components · Edited {new Date(diagram.updatedAt).toLocaleDateString()}</small></span>{diagram.id === diagramId && <span className="current-dot" />}</button>)}</div>
          </div>}
        </div>
        <div className="topbar-actions">
          <div className="save-indicator"><span className={`save-dot ${saveState}`} />{saveState === "saving" ? "Saving" : saveState === "error" ? "Save issue" : "All changes saved"}</div>
          <span className="guest-pill"><span className="guest-avatar">G</span><span>Guest</span></span>
          <button className="signin-button" onClick={() => setToast("Account sync is coming in the next phase")}>Sign in <span>↗</span></button>
        </div>
      </header>

      <div className={`workspace ${leftPanelOpen ? "has-left-panel" : "left-panel-closed"} ${rightPanelOpen ? "has-right-panel" : "right-panel-closed"}`}>
        {leftPanelOpen && <aside className="left-sidebar">
          <div className="sidebar-panel-heading"><span className="sidebar-label">BUILD</span><button className="panel-close-button" onClick={() => setLeftPanelOpen(false)} aria-label="Close components panel" title="Close components panel">‹</button></div>
          <button className="sidebar-tab active"><span className="tab-icon">◈</span><span>Components</span></button>
          <button className="sidebar-tab" onClick={() => setShowLibrary((open) => !open)}><span className="tab-icon">▦</span><span>My canvases</span><span className="tab-count">{diagrams.length}</span></button>
          <div className="sidebar-rule" />
          <div className="palette-heading"><div><span className="sidebar-label">COMPONENTS</span><span className="palette-hint">Drag onto canvas</span></div><span className="tiny-count">05</span></div>
          <div className="component-list">
            {(Object.keys(kindMeta) as Kind[]).map((kind) => <button key={kind} className="component-card" onClick={() => addNode(kind)} draggable onDragStart={(event) => event.dataTransfer.setData("application/archly-kind", kind)}><span className={`component-icon ${kindMeta[kind].className}`}>{kindMeta[kind].icon}</span><span className="component-copy"><strong>{kindMeta[kind].label}</strong><small>{kind === "service" ? "Business logic" : kind === "database" ? "Persistent storage" : kind === "api" ? "App or endpoint" : kind === "queue" ? "Async messaging" : "Third-party system"}</small></span><span className="add-hint">＋</span></button>)}
          </div>
          <div className="palette-heading connection-palette-heading"><div><span className="sidebar-label">CONNECTIONS</span><span className="palette-hint">Choose a line, then click two components</span></div></div>
          <div className="component-list connection-list">
            {(Object.keys(connectionMeta) as ConnectionKind[]).map((kind) => <button key={kind} type="button" className={`component-card connection-card ${connectionKind === kind ? "is-active" : ""}`} aria-label={`Add ${connectionMeta[kind].label} connection`} aria-pressed={connectionKind === kind} title={`${connectionMeta[kind].label}: select a source and destination`} onClick={() => selectConnection(kind)}>
              <span className={`connection-icon ${connectionMeta[kind].className}`}>→</span>
              <span className="component-copy connection-copy"><strong>{connectionMeta[kind].label}</strong><small>{connectionMeta[kind].hint}</small></span>
              <span className="add-hint">＋</span>
            </button>)}
          </div>
          <div className="sidebar-spacer" />
          <div className="local-note"><div className="local-note-icon">⌂</div><div><strong>Local canvas</strong><p>Your work stays in this browser. Sign in later to sync across devices.</p><button onClick={() => setToast("Your diagrams are saved on this browser only")}>How local saving works <span>↗</span></button></div></div>
          <div className="sidebar-footer"><span className="status-orb" /> All systems ready <span className="footer-version">v0.1</span></div>
        </aside>}

        <section className="canvas-column">
          <div className="canvas-toolbar">
            <div className="canvas-heading"><span className="breadcrumb">Workspace</span><span className="breadcrumb-slash">/</span><input aria-label="Diagram name" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} /></div>
            <div className="toolbar-actions">
              <button className={`toolbar-button icon-only panel-toggle ${leftPanelOpen ? "is-active" : ""}`} onClick={() => setLeftPanelOpen((open) => !open)} aria-label={leftPanelOpen ? "Hide components panel" : "Show components panel"} title={leftPanelOpen ? "Hide components panel" : "Show components panel"}>☷</button>
              <button className={`toolbar-button icon-only panel-toggle ${rightPanelOpen && rightPanelMode === "settings" ? "is-active" : ""}`} onClick={() => { if (rightPanelOpen && rightPanelMode === "settings") setRightPanelOpen(false); else { setRightPanelMode("settings"); setRightPanelOpen(true); } }} aria-label="Toggle canvas settings" title="Canvas settings">⚙</button>
              {selectedNode && <button className={`toolbar-button icon-only panel-toggle ${rightPanelOpen && rightPanelMode === "inspector" ? "is-active" : ""}`} onClick={() => { if (rightPanelOpen && rightPanelMode === "inspector") setRightPanelOpen(false); else { setRightPanelMode("inspector"); setRightPanelOpen(true); } }} aria-label="Toggle component details" title="Component details">☰</button>}
              {selectedEdge && <button className={`toolbar-button icon-only panel-toggle ${rightPanelOpen && rightPanelMode === "edge-inspector" ? "is-active" : ""}`} onClick={() => { if (rightPanelOpen && rightPanelMode === "edge-inspector") setRightPanelOpen(false); else { setRightPanelMode("edge-inspector"); setRightPanelOpen(true); } }} aria-label="Toggle connection details" title="Connection details">↔</button>}
              <button className="toolbar-button icon-only full-screen-toggle" onClick={toggleFullscreen} aria-label={isFullscreen ? "Exit full screen" : "Enter full screen"} aria-pressed={isFullscreen} title="Full screen">⛶</button>
              <button className="toolbar-button" onClick={exportDiagram}><span>↓</span> Export</button>
              <span className="toolbar-separator" />
              <button className="toolbar-button icon-only" aria-label="Undo" title="Undo" disabled={!historyStatus.canUndo} onClick={undo}>↶</button>
              <button className="toolbar-button icon-only" aria-label="Redo" title="Redo" disabled={!historyStatus.canRedo} onClick={redo}>↷</button>
              <span className="toolbar-separator" />
              <button className="toolbar-button primary" onClick={() => addNode("service")}><span>＋</span> Add component</button>
            </div>
          </div>
          <div className="canvas-workspace" ref={flowRef} style={{ "--canvas-color": canvasColor } as CSSProperties}>
            <div className="canvas-context">
              <div className="context-eyebrow"><span className="context-dot" /> YOUR SYSTEM, MAPPED</div>
            <div className="context-caption">{connectionKind ? connectionSourceId ? "Now click the destination component." : `Choose a source for ${connectionMeta[connectionKind].label}.` : selectedEdge ? "Double-click its label to edit; open Connection details to change its style." : "Drag on empty canvas to select components · Double-click a component to edit its name."}</div>
            </div>
            <div className="canvas-count"><span className="count-icon">◈</span>{nodeCount} components <span className="count-divider">·</span> {edges.length} connections</div>
            {isFullscreen && <div className="fullscreen-exit-hint"><kbd>Esc</kbd> to exit full screen</div>}
            {!nodeCount && <div className="empty-canvas"><div className="empty-orbit"><span>◈</span></div><h2>Start with a component</h2><p>Drag one from the components panel, or add a service to begin mapping your system.</p><button onClick={() => addNode("service")}>＋ Add your first component</button></div>}
            <HistoryContext.Provider value={recordHistory}>
            <EdgeEditorContext.Provider value={{ updateEdge, selectEdge }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              onNodesChange={(changes) => {
                if (changes.some((change) => change.type === "remove")) recordHistory();
                setNodes((current) => applyNodeChanges(changes, current) as FlowNode[]);
              }}
              onEdgesChange={(changes) => {
                if (changes.some((change) => change.type === "remove")) recordHistory();
                setEdges((current) => applyEdgeChanges(changes, current));
              }}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              onNodeDoubleClick={() => {
                recordHistory();
                if (connectionKind) {
                  setConnectionKind(null);
                  setConnectionSourceId(null);
                }
              }}
              onNodeDragStart={() => {
                if (nodeDragActiveRef.current) return;
                nodeDragActiveRef.current = true;
                recordHistory();
              }}
              onNodeDragStop={() => { nodeDragActiveRef.current = false; }}
              onSelectionChange={({ nodes: selected, edges: selectedConnections }) => {
                setSelectedNodeId(selected[0]?.id ?? null);
                setSelectedEdgeId(selectedConnections[0]?.id ?? null);
              }}
              onPaneClick={() => { setSelectedNodeId(null); setSelectedEdgeId(null); }}
              onViewportChange={setViewport}
              onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }}
              onDrop={(event) => {
                event.preventDefault();
                const kind = event.dataTransfer.getData("application/archly-kind") as Kind;
                if (!kindMeta[kind] || !flowRef.current) return;
                const point = screenToFlowPosition({ x: event.clientX, y: event.clientY });
                const id = `${kind}-${crypto.randomUUID().slice(0, 7)}`;
                recordHistory();
                setNodes((current) => [...current, { id, type: "engineering", position: point, data: { label: `New ${kindMeta[kind].label.toLowerCase()}`, description: "Click to describe this component", kind, color: "#ffffff" } }]);
                setSelectedNodeId(id);
              }}
              viewport={viewport}
              minZoom={0.25}
              maxZoom={1.7}
              zoomOnDoubleClick={false}
              selectionOnDrag
              selectionMode={SelectionMode.Full}
              panOnDrag={[1, 2]}
              panOnScroll
              deleteKeyCode={["Backspace", "Delete"]}
              defaultEdgeOptions={{ type: "archly" }}
            >
              {showGrid && <Background variant={BackgroundVariant.Dots} gap={22} size={1.1} color={canvasColor === "#1c2330" ? "#495363" : "#d8deea"} />}
              <Controls position="bottom-left" showInteractive={false} />
              <MiniMap position="bottom-right" pannable zoomable nodeColor={(node) => (node.data as NodeData).kind === "database" ? "#72a797" : (node.data as NodeData).kind === "service" ? "#8094d3" : "#cf9b6b"} maskColor="rgba(250,251,253,.72)" />
            </ReactFlow>
            </EdgeEditorContext.Provider>
            </HistoryContext.Provider>
            <div className="canvas-bottom-hint">Drag empty space to select <span className="hint-divider">·</span> Two-finger scroll or Space + drag to pan <span className="hint-divider">·</span> Ctrl/⌘ C, V, Z to copy, paste, undo <span className="hint-divider">·</span> Select an arrow, click +, and drag its bend</div>
          </div>
          <div className="canvas-statusbar"><span><span className={`save-dot ${saveState}`} />{saveState === "saved" ? "Saved locally on this device" : saveState === "saving" ? "Saving to this browser" : "Local save issue"}</span><span className="statusbar-right">Autosave on <span className="status-check">✓</span></span></div>
        </section>

        {rightPanelOpen && <aside className="right-sidebar">
          {rightPanelMode === "inspector" && selectedNode ? <>
            <div className="inspector-header"><div><span className="sidebar-label">INSPECTOR</span><h2>Component details</h2></div><button className="icon-button" onClick={() => setRightPanelOpen(false)} aria-label="Close inspector">×</button></div>
            <div className="inspector-card"><div className={`inspector-kind-icon ${kindMeta[selectedNode.data.kind].className}`}>{kindMeta[selectedNode.data.kind].icon}</div><div><span className="node-kind">{kindMeta[selectedNode.data.kind].label}</span><strong>{selectedNode.data.label}</strong></div><button className="more-button" aria-label="Delete component" title="Delete component" onClick={removeSelectedNode}>×</button></div>
            <label className="field-label" htmlFor="node-name">Name</label><input id="node-name" className="text-field" value={selectedNode.data.label} onChange={(event) => updateSelected("label", event.target.value)} maxLength={80} />
            <label className="field-label spaced" htmlFor="node-description">Description</label><textarea id="node-description" className="text-field textarea" value={selectedNode.data.description} onChange={(event) => updateSelected("description", event.target.value)} placeholder="What does this component do?" maxLength={280} />
            <div className="field-label spaced">Component color</div><div className="swatch-row">{["#ffffff", "#e8efff", "#e2f4ee", "#fff0db", "#f7e8fa"].map((color) => <button key={color} aria-label={`Set component color ${color}`} className={`color-swatch ${selectedNode.data.color === color ? "picked" : ""}`} style={{ background: color }} onClick={() => updateSelected("color", color)} />)}<label className="custom-color"><span>＋</span><input type="color" aria-label="Custom component color" value={selectedNode.data.color} onChange={(event) => updateSelected("color", event.target.value)} /></label></div>
            <div className="inspector-divider" />
            <div className="inspector-section-title">CONNECTIONS <span>{edges.filter((edge) => edge.source === selectedNode.id || edge.target === selectedNode.id).length}</span></div>
            <div className="connection-list">{edges.filter((edge) => edge.source === selectedNode.id || edge.target === selectedNode.id).map((edge) => { const neighborId = edge.source === selectedNode.id ? edge.target : edge.source; const neighbor = nodes.find((node) => node.id === neighborId); return <div className="connection-row" key={edge.id}><span className="connection-line">↔</span><span>{neighbor?.data.label ?? "Component"}</span><small>{edge.label || "connected"}</small></div>; })}{!edges.some((edge) => edge.source === selectedNode.id || edge.target === selectedNode.id) && <p className="muted-note">Connect this component to show its relationships.</p>}</div>
          </> : rightPanelMode === "edge-inspector" && selectedEdge ? <>
            <div className="inspector-header"><div><span className="sidebar-label">CONNECTION</span><h2>Connection details</h2></div><button className="icon-button" onClick={() => setRightPanelOpen(false)} aria-label="Close connection details">×</button></div>
            <div className="edge-inspector-route"><span>{nodes.find((node) => node.id === selectedEdge.source)?.data.label ?? "Source"}</span><i>→</i><span>{nodes.find((node) => node.id === selectedEdge.target)?.data.label ?? "Destination"}</span></div>
            <label className="field-label" htmlFor="edge-label">Label</label>
            <input id="edge-label" className="text-field" value={edgeLabelDraft} onChange={(event) => setEdgeLabelDraft(event.target.value)} onBlur={commitInspectorEdgeLabel} onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
              if (event.key === "Escape") { cancelInspectorEdgeLabelRef.current = true; setEdgeLabelDraft(typeof selectedEdge.label === "string" ? selectedEdge.label : ""); event.currentTarget.blur(); }
            }} maxLength={100} placeholder="Add a connection label" />
            <label className="field-label spaced" htmlFor="edge-kind">Relationship</label>
            <select id="edge-kind" className="text-field" value={selectedEdge.data?.connectionKind ?? "custom"} onChange={(event) => {
              const nextData = { ...selectedEdge.data };
              const nextKind = event.target.value === "custom" ? undefined : event.target.value as ConnectionKind;
              if (nextKind) nextData.connectionKind = nextKind;
              else delete nextData.connectionKind;
              const nextStyle = nextKind ? { ...connectionStyle[nextKind] } : { ...customConnectionStyle };
              const markerEnd = typeof selectedEdge.markerEnd === "string"
                ? { type: selectedEdge.markerEnd, color: nextStyle.stroke }
                : { ...(selectedEdge.markerEnd ?? { type: MarkerType.ArrowClosed }), color: nextStyle.stroke };
              updateSelectedEdge({ data: nextData, style: nextStyle, animated: nextKind ? connectionMeta[nextKind].animated : false, markerEnd });
            }}>
              <option value="custom">Custom</option><option value="request">HTTPS request</option><option value="data">Data flow</option><option value="event">Event publish</option>
            </select>
            <div className="field-label spaced">Line color</div>
            <div className="edge-color-control"><input type="color" aria-label="Connection line color" value={typeof selectedEdge.style?.stroke === "string" ? selectedEdge.style.stroke : "#8290a6"} onFocus={() => recordHistory()} onChange={(event) => {
              const color = event.target.value;
              const currentMarker = selectedEdge.markerEnd;
              const markerEnd = typeof currentMarker === "string" ? { type: currentMarker, color } : currentMarker ? { ...currentMarker, color } : { type: MarkerType.ArrowClosed, color };
              updateSelectedEdge({ style: { ...selectedEdge.style, stroke: color }, markerEnd }, false);
            }} /><span>{typeof selectedEdge.style?.stroke === "string" ? selectedEdge.style.stroke.toUpperCase() : "#8290A6"}</span></div>
            <label className="field-label spaced" htmlFor="edge-line-style">Line style</label>
            <select id="edge-line-style" className="text-field" value={selectedEdge.style?.strokeDasharray ? "dashed" : "solid"} onChange={(event) => updateSelectedEdge({ style: { ...selectedEdge.style, strokeDasharray: event.target.value === "dashed" ? "10 7" : undefined } })}>
              <option value="solid">Solid</option><option value="dashed">Dashed</option>
            </select>
            <div className="settings-section edge-animation-setting"><div className="settings-label-row"><div><strong>Animate line</strong><small>Show movement along this connection</small></div><button className={`toggle ${selectedEdge.animated ? "on" : ""}`} role="switch" aria-checked={Boolean(selectedEdge.animated)} aria-label="Toggle connection animation" onClick={() => updateSelectedEdge({ animated: !selectedEdge.animated })}><i /></button></div></div>
            <button className="edge-delete-button" onClick={() => { recordHistory(); setEdges((current) => current.filter((edge) => edge.id !== selectedEdge.id)); setSelectedEdgeId(null); setRightPanelOpen(false); }}>Delete connection</button>
          </> : <>
            <div className="inspector-header"><div><span className="sidebar-label">CANVAS</span><h2>Canvas settings</h2></div><button className="icon-button" onClick={() => setRightPanelOpen(false)} aria-label="Close canvas settings">×</button></div>
            <div className="settings-intro"><div className="settings-art"><span className="art-dot dot-one" /><span className="art-dot dot-two" /><span className="art-dot dot-three" /><span className="art-node">◈</span></div><strong>Make it yours</strong><p>Set the mood for your workspace. Your choices save with this canvas.</p></div>
            <div className="settings-section"><div className="settings-label-row"><div><strong>Canvas color</strong><small>Background behind your flow</small></div><button className="text-reset" onClick={() => setCanvasColor("#f6f7fb")}>Reset</button></div>
              <div className="canvas-swatch-grid">{[{ color: "#f6f7fb", label: "Cloud" }, { color: "#f0f5f2", label: "Sage" }, { color: "#f5f1eb", label: "Sand" }, { color: "#eff2f9", label: "Blue" }, { color: "#1c2330", label: "Midnight" }, { color: "#f8edf1", label: "Rose" }].map(({ color, label }) => <button key={color} className={`canvas-swatch ${canvasColor === color ? "picked" : ""}`} onClick={() => setCanvasColor(color)}><span style={{ background: color }}><i /></span><small>{label}</small></button>)}</div>
              <button className="custom-canvas-color" onClick={() => setShowCanvasColors((open) => !open)}><span className="custom-color-preview" style={{ background: canvasColor }}>◉</span> Choose a custom color <span className="custom-color-arrow">↗</span></button>
              {showCanvasColors && <div className="custom-color-picker"><input type="color" value={canvasColor} aria-label="Choose custom canvas color" onChange={(event) => setCanvasColor(event.target.value)} /><span>{canvasColor.toUpperCase()}</span><small>Choose any color</small></div>}
            </div>
            <div className="inspector-divider" />
            <div className="settings-section"><div className="settings-label-row"><div><strong>Canvas guide</strong><small>Subtle dots to help with alignment</small></div><button className={`toggle ${showGrid ? "on" : ""}`} role="switch" aria-checked={showGrid} aria-label="Toggle canvas guide" onClick={() => setShowGrid((visible) => !visible)}><i /></button></div></div>
            <div className="tips-card"><span className="tips-icon">✦</span><div><strong>Quick tip</strong><p>Drag empty canvas to select components together. Pan the canvas with a two-finger scroll, Space + drag, or the middle/right mouse button. Use Ctrl/⌘ C and V to copy and paste, Ctrl/⌘ Z to undo, and Ctrl/⌘ Shift Z to redo. Double-click a component to edit its name. Select an arrow and click + to add a bend, then drag the bend handle to route it. Press Esc to leave full screen.</p></div></div>
          </>}
          <div className="right-footer"><span>Built for the way systems work</span><span>⌘ K</span></div>
        </aside>}
      </div>
      {importDialogOpen && <div className="import-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !importBusy) setImportDialogOpen(false); }}>
        <section className="import-dialog" role="dialog" aria-modal="true" aria-labelledby="import-dialog-title">
          <div className="import-dialog-heading"><div><span className="sidebar-label">LOCAL BACKUP</span><h2 id="import-dialog-title">Import a canvas</h2></div><button className="icon-button" onClick={() => setImportDialogOpen(false)} aria-label="Close import dialog" disabled={importBusy}>×</button></div>
          <p className="import-dialog-copy">Choose an Archly JSON backup. We validate it before saving, and import it as a new canvas so existing canvases are never replaced.</p>
          {importPreview ? <div className="import-preview-card">
            <span className="import-preview-icon">◈</span>
            <div className="import-preview-copy"><strong>{importPreview.document.title}</strong><small>{importPreview.fileName}</small><small>{importPreview.document.graph.nodes.length} components · {importPreview.document.graph.edges.length} connections</small></div>
            <span className="import-valid-mark" aria-label="Backup validated">✓</span>
          </div> : <div className="import-file-prompt"><span>↑</span><strong>Select a backup file</strong><small>Archly JSON files up to 10 MB</small></div>}
          {importError && <p className="import-error" role="alert">{importError}</p>}
          <div className="import-dialog-actions">
            <button className="import-choose-button" onClick={() => importFileRef.current?.click()} disabled={importBusy}>Choose JSON file</button>
            <span />
            <button className="import-cancel-button" onClick={() => setImportDialogOpen(false)} disabled={importBusy}>Cancel</button>
            <button className="import-confirm-button" onClick={importBackupAsNewCanvas} disabled={!importPreview || importBusy}>{importBusy ? "Importing..." : "Import as new canvas"}</button>
          </div>
        </section>
      </div>}
      {toast && <div className="toast"><span>✓</span>{toast}</div>}
      {saveState === "error" && <div className="storage-warning"><strong>Local saving is unavailable.</strong> Your browser may be blocking site storage. Export a JSON backup before leaving.</div>}
    </main>
  );
}

export default function Studio() {
  return <ReactFlowProvider><StudioContent /></ReactFlowProvider>;
}
