"use client";

import {
  addEdge,
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  applyEdgeChanges,
  applyNodeChanges,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
  useReactFlow,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from "react";
import { listLocalDiagrams, readLocalDiagram, saveLocalDiagram } from "@/lib/local-db";
import type { DiagramDocument } from "@/lib/graph-schema";

type Kind = "service" | "database" | "api" | "queue" | "external";
type ConnectionKind = "request" | "data" | "event";
type NodeData = { label: string; description: string; color: string; kind: Kind };
type FlowNode = Node<NodeData, "engineering">;
type FlowEdge = Edge;

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

const seedNodes: FlowNode[] = [
  { id: "web-client", type: "engineering", position: { x: 70, y: 185 }, data: { label: "Web client", description: "Customer-facing app", color: "#ffffff", kind: "api" } },
  { id: "order-service", type: "engineering", position: { x: 380, y: 185 }, data: { label: "Order service", description: "Validates and routes orders", color: "#ffffff", kind: "service" } },
  { id: "orders-db", type: "engineering", position: { x: 705, y: 75 }, data: { label: "Orders DB", description: "Order and customer records", color: "#ffffff", kind: "database" } },
  { id: "events", type: "engineering", position: { x: 705, y: 300 }, data: { label: "Event queue", description: "Async order events", color: "#ffffff", kind: "queue" } },
];

const seedEdges: FlowEdge[] = [
  { id: "client-order", source: "web-client", target: "order-service", label: "HTTPS", type: "smoothstep", animated: true, markerEnd: { type: MarkerType.ArrowClosed, color: "#8290a6" } },
  { id: "order-db", source: "order-service", target: "orders-db", label: "read / write", type: "smoothstep", markerEnd: { type: MarkerType.ArrowClosed, color: "#8290a6" } },
  { id: "order-events", source: "order-service", target: "events", label: "publish", type: "smoothstep", animated: true, markerEnd: { type: MarkerType.ArrowClosed, color: "#8290a6" } },
];

function EngineeringNode({ data, selected }: NodeProps<FlowNode>) {
  const meta = kindMeta[data.kind];
  return (
    <div className={`engineering-node ${meta.className} ${selected ? "is-selected" : ""}`} style={{ "--node-tint": data.color } as CSSProperties}>
      <Handle type="target" position={Position.Left} />
      <div className="node-glyph">{meta.icon}</div>
      <div className="node-copy">
        <span className="node-kind">{meta.label}</span>
        <strong>{data.label}</strong>
        <small>{data.description || "Add a short description"}</small>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

const nodeTypes = { engineering: EngineeringNode };

type Viewport = { x: number; y: number; zoom: number };
type Snapshot = { nodes: FlowNode[]; edges: FlowEdge[] };

function makeDocument(id: string, title: string, nodes: FlowNode[], edges: FlowEdge[], canvasColor: string, viewport: Viewport, showGrid: boolean): DiagramDocument {
  return {
    id,
    title,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    graph: {
      schemaVersion: 1,
      nodes: nodes.map(({ id: nodeId, position, data }) => ({ id: nodeId, type: "engineering" as const, position, data })),
      edges: edges.map(({ id: edgeId, source, target, label, type, animated, markerEnd }) => ({
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
      })),
      viewport,
      canvasColor,
      showGrid,
    },
  };
}

function StudioContent() {
  const { screenToFlowPosition } = useReactFlow<FlowNode, FlowEdge>();
  const [diagramId, setDiagramId] = useState("starter-flow");
  const [title, setTitle] = useState("Commerce service flow");
  const [nodes, setNodes] = useNodesState<FlowNode>(seedNodes);
  const [edges, setEdges] = useEdgesState<FlowEdge>(seedEdges);
  const [canvasColor, setCanvasColor] = useState("#f6f7fb");
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [diagrams, setDiagrams] = useState<DiagramDocument[]>([]);
  const [saveState, setSaveState] = useState<"saving" | "saved" | "error">("saved");
  const [showLibrary, setShowLibrary] = useState(false);
  const [showCanvasColors, setShowCanvasColors] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [connectionKind, setConnectionKind] = useState<ConnectionKind | null>(null);
  const [connectionSourceId, setConnectionSourceId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState("");
  const flowRef = useRef<HTMLDivElement>(null);
  const pastRef = useRef<Snapshot[]>([]);
  const futureRef = useRef<Snapshot[]>([]);
  const [historyStatus, setHistoryStatus] = useState({ canUndo: false, canRedo: false });
  const selectedNode = nodes.find((node) => node.id === selectedNodeId);

  const recordHistory = useCallback(() => {
    pastRef.current = [...pastRef.current.slice(-39), { nodes: structuredClone(nodes), edges: structuredClone(edges) }];
    futureRef.current = [];
    setHistoryStatus({ canUndo: true, canRedo: false });
  }, [edges, nodes]);

  const undo = () => {
    const previous = pastRef.current.pop();
    if (!previous) return;
    futureRef.current.push({ nodes: structuredClone(nodes), edges: structuredClone(edges) });
    setNodes(previous.nodes);
    setEdges(previous.edges);
    setHistoryStatus({ canUndo: pastRef.current.length > 0, canRedo: true });
  };

  const redo = () => {
    const next = futureRef.current.pop();
    if (!next) return;
    pastRef.current.push({ nodes: structuredClone(nodes), edges: structuredClone(edges) });
    setNodes(next.nodes);
    setEdges(next.edges);
    setHistoryStatus({ canUndo: true, canRedo: futureRef.current.length > 0 });
  };

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
          setEdges(existing.graph.edges as FlowEdge[]);
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

  const onConnect = useCallback((connection: Connection) => {
    recordHistory();
    setEdges((current) => addEdge({ ...connection, type: "smoothstep", markerEnd: { type: MarkerType.ArrowClosed, color: "#8290a6" } }, current));
  }, [recordHistory, setEdges]);

  const onNodeClick = useCallback((_: ReactMouseEvent, node: FlowNode) => {
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
      type: "smoothstep",
      animated: template.animated,
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
    setEdges(document.graph.edges as FlowEdge[]);
    setCanvasColor(document.graph.canvasColor);
    setViewport(document.graph.viewport);
    setShowGrid(document.graph.showGrid);
    pastRef.current = [];
    futureRef.current = [];
    setHistoryStatus({ canUndo: false, canRedo: false });
    setSelectedNodeId(null);
    setShowLibrary(false);
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

  const nodeCount = nodes.length;
  const activeDocumentTitle = useMemo(() => title.trim() || "Untitled flow", [title]);

  return (
    <main className="studio-shell">
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
            <div className="diagram-list">{diagrams.map((diagram) => <button key={diagram.id} className={`diagram-row ${diagram.id === diagramId ? "current" : ""}`} onClick={() => openDiagram(diagram.id)}><span className="diagram-row-icon">◈</span><span className="diagram-row-copy"><strong>{diagram.title || "Untitled flow"}</strong><small>{diagram.graph.nodes.length} components · Edited {new Date(diagram.updatedAt).toLocaleDateString()}</small></span>{diagram.id === diagramId && <span className="current-dot" />}</button>)}</div>
          </div>}
        </div>
        <div className="topbar-actions">
          <div className="save-indicator"><span className={`save-dot ${saveState}`} />{saveState === "saving" ? "Saving" : saveState === "error" ? "Save issue" : "All changes saved"}</div>
          <span className="guest-pill"><span className="guest-avatar">G</span><span>Guest</span></span>
          <button className="signin-button" onClick={() => setToast("Account sync is coming in the next phase")}>Sign in <span>↗</span></button>
        </div>
      </header>

      <div className="workspace">
        <aside className="left-sidebar">
          <div className="sidebar-label">BUILD</div>
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
        </aside>

        <section className="canvas-column">
          <div className="canvas-toolbar">
            <div className="canvas-heading"><span className="breadcrumb">Workspace</span><span className="breadcrumb-slash">/</span><input aria-label="Diagram name" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} /></div>
            <div className="toolbar-actions">
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
            <div className="context-caption">{connectionKind ? connectionSourceId ? "Now click the destination component." : `Choose a source for ${connectionMeta[connectionKind].label}.` : "Drag components in. Connect the dots."}</div>
            </div>
            <div className="canvas-count"><span className="count-icon">◈</span>{nodeCount} components <span className="count-divider">·</span> {edges.length} connections</div>
            {!nodeCount && <div className="empty-canvas"><div className="empty-orbit"><span>◈</span></div><h2>Start with a component</h2><p>Drag one from the left, or add a service to begin mapping your system.</p><button onClick={() => addNode("service")}>＋ Add your first component</button></div>}
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
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
              onNodeDragStart={recordHistory}
              onSelectionChange={({ nodes: selected }) => setSelectedNodeId(selected[0]?.id ?? null)}
              onPaneClick={() => setSelectedNodeId(null)}
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
              deleteKeyCode={["Backspace", "Delete"]}
              defaultEdgeOptions={{ type: "smoothstep" }}
            >
              {showGrid && <Background variant={BackgroundVariant.Dots} gap={22} size={1.1} color={canvasColor === "#1c2330" ? "#495363" : "#d8deea"} />}
              <Controls position="bottom-left" showInteractive={false} />
              <MiniMap position="bottom-right" pannable zoomable nodeColor={(node) => (node.data as NodeData).kind === "database" ? "#72a797" : (node.data as NodeData).kind === "service" ? "#8094d3" : "#cf9b6b"} maskColor="rgba(250,251,253,.72)" />
            </ReactFlow>
            <div className="canvas-bottom-hint"><span>⌘</span> + scroll to zoom <span className="hint-divider">·</span> Drag blank space to pan</div>
          </div>
          <div className="canvas-statusbar"><span><span className={`save-dot ${saveState}`} />{saveState === "saved" ? "Saved locally on this device" : saveState === "saving" ? "Saving to this browser" : "Local save issue"}</span><span className="statusbar-right">Autosave on <span className="status-check">✓</span></span></div>
        </section>

        <aside className="right-sidebar">
          {selectedNode ? <>
            <div className="inspector-header"><div><span className="sidebar-label">INSPECTOR</span><h2>Component details</h2></div><button className="icon-button" onClick={() => setSelectedNodeId(null)} aria-label="Close inspector">×</button></div>
            <div className="inspector-card"><div className={`inspector-kind-icon ${kindMeta[selectedNode.data.kind].className}`}>{kindMeta[selectedNode.data.kind].icon}</div><div><span className="node-kind">{kindMeta[selectedNode.data.kind].label}</span><strong>{selectedNode.data.label}</strong></div><button className="more-button" aria-label="Delete component" title="Delete component" onClick={removeSelectedNode}>×</button></div>
            <label className="field-label" htmlFor="node-name">Name</label><input id="node-name" className="text-field" value={selectedNode.data.label} onChange={(event) => updateSelected("label", event.target.value)} maxLength={80} />
            <label className="field-label spaced" htmlFor="node-description">Description</label><textarea id="node-description" className="text-field textarea" value={selectedNode.data.description} onChange={(event) => updateSelected("description", event.target.value)} placeholder="What does this component do?" maxLength={280} />
            <div className="field-label spaced">Component color</div><div className="swatch-row">{["#ffffff", "#e8efff", "#e2f4ee", "#fff0db", "#f7e8fa"].map((color) => <button key={color} aria-label={`Set component color ${color}`} className={`color-swatch ${selectedNode.data.color === color ? "picked" : ""}`} style={{ background: color }} onClick={() => updateSelected("color", color)} />)}<label className="custom-color"><span>＋</span><input type="color" aria-label="Custom component color" value={selectedNode.data.color} onChange={(event) => updateSelected("color", event.target.value)} /></label></div>
            <div className="inspector-divider" />
            <div className="inspector-section-title">CONNECTIONS <span>{edges.filter((edge) => edge.source === selectedNode.id || edge.target === selectedNode.id).length}</span></div>
            <div className="connection-list">{edges.filter((edge) => edge.source === selectedNode.id || edge.target === selectedNode.id).map((edge) => { const neighborId = edge.source === selectedNode.id ? edge.target : edge.source; const neighbor = nodes.find((node) => node.id === neighborId); return <div className="connection-row" key={edge.id}><span className="connection-line">↔</span><span>{neighbor?.data.label ?? "Component"}</span><small>{edge.label || "connected"}</small></div>; })}{!edges.some((edge) => edge.source === selectedNode.id || edge.target === selectedNode.id) && <p className="muted-note">Connect this component to show its relationships.</p>}</div>
          </> : <>
            <div className="inspector-header"><div><span className="sidebar-label">CANVAS</span><h2>Canvas settings</h2></div></div>
            <div className="settings-intro"><div className="settings-art"><span className="art-dot dot-one" /><span className="art-dot dot-two" /><span className="art-dot dot-three" /><span className="art-node">◈</span></div><strong>Make it yours</strong><p>Set the mood for your workspace. Your choices save with this canvas.</p></div>
            <div className="settings-section"><div className="settings-label-row"><div><strong>Canvas color</strong><small>Background behind your flow</small></div><button className="text-reset" onClick={() => setCanvasColor("#f6f7fb")}>Reset</button></div>
              <div className="canvas-swatch-grid">{[{ color: "#f6f7fb", label: "Cloud" }, { color: "#f0f5f2", label: "Sage" }, { color: "#f5f1eb", label: "Sand" }, { color: "#eff2f9", label: "Blue" }, { color: "#1c2330", label: "Midnight" }, { color: "#f8edf1", label: "Rose" }].map(({ color, label }) => <button key={color} className={`canvas-swatch ${canvasColor === color ? "picked" : ""}`} onClick={() => setCanvasColor(color)}><span style={{ background: color }}><i /></span><small>{label}</small></button>)}</div>
              <button className="custom-canvas-color" onClick={() => setShowCanvasColors((open) => !open)}><span className="custom-color-preview" style={{ background: canvasColor }}>◉</span> Choose a custom color <span className="custom-color-arrow">↗</span></button>
              {showCanvasColors && <div className="custom-color-picker"><input type="color" value={canvasColor} aria-label="Choose custom canvas color" onChange={(event) => setCanvasColor(event.target.value)} /><span>{canvasColor.toUpperCase()}</span><small>Choose any color</small></div>}
            </div>
            <div className="inspector-divider" />
            <div className="settings-section"><div className="settings-label-row"><div><strong>Canvas guide</strong><small>Subtle dots to help with alignment</small></div><button className={`toggle ${showGrid ? "on" : ""}`} role="switch" aria-checked={showGrid} aria-label="Toggle canvas guide" onClick={() => setShowGrid((visible) => !visible)}><i /></button></div></div>
            <div className="tips-card"><span className="tips-icon">✦</span><div><strong>Quick tip</strong><p>Select a component to edit its details and color. Choose a connection type in the left palette, then click a source and destination. You can also drag between node handles.</p></div></div>
          </>}
          <div className="right-footer"><span>Built for the way systems work</span><span>⌘ K</span></div>
        </aside>
      </div>
      {toast && <div className="toast"><span>✓</span>{toast}</div>}
      {saveState === "error" && <div className="storage-warning"><strong>Local saving is unavailable.</strong> Your browser may be blocking site storage. Export a JSON backup before leaving.</div>}
    </main>
  );
}

export default function Studio() {
  return <ReactFlowProvider><StudioContent /></ReactFlowProvider>;
}
