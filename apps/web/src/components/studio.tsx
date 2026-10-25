"use client";

import {
  addEdge,
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  SelectionMode,
  applyEdgeChanges,
  applyNodeChanges,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
} from "@xyflow/react";
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type CSSProperties, type MouseEvent as ReactMouseEvent } from "react";
import { clearGuestTransferPromptDismissal, deleteAccountDiagramCache, deleteLocalDiagram, getAccountDiagramCache, getGuestTransferPromptDismissal, getGuestTransferReceipt, listAccountDiagramCache, listLocalDiagrams, listQueuedDiagramSync, queueDiagramSync, readLastOpenAccountDiagramId, readLastOpenDiagramId, readLocalDiagram, removeQueuedDiagramSync, saveAccountDiagramCache, saveGuestTransferPromptDismissal, saveGuestTransferReceipt, saveLastOpenAccountDiagramId, saveLastOpenDiagramId, saveLocalDiagram } from "@/lib/local-db";
import { diagramDocumentSchema, type DiagramDocument } from "@/lib/graph-schema";
import { AccountDiagramError, createAccountDiagram, deleteAccountDiagram, flushQueuedAccountDiagrams, getLastOpenAccountDiagramId, listAccountDiagrams, sameDiagramContent, sameDiagramGraph, serializeDiagramWrite, setLastOpenAccountDiagramId, updateAccountDiagram, type VersionedDiagram } from "@/lib/account-diagrams";
import {
  GRID_STEP,
  HANDLE_LEFT,
  HANDLE_RIGHT,
  MAX_ZOOM,
  MIN_ZOOM,
  PINCH_WHEEL_INTENSITY,
  connectionMeta,
  connectionStyle,
  customConnectionStyle,
  kindMeta,
  type ConnectionKind,
  type FlowEdge,
  type FlowNode,
  type Kind,
  type NodeData,
  type Viewport,
} from "@/lib/canvas-config";
import { makeDocument, normalizeStoredEdges } from "@/lib/diagram-document";
import { seedEdges, seedNodes } from "@/lib/seed-diagram";
import { EdgeEditorContext, HistoryContext } from "@/components/canvas/contexts";
import { edgeTypes, nodeTypes } from "@/components/canvas/nodeTypes";
import { useCanvasGeometry } from "@/hooks/useCanvasGeometry";
import { useClipboard } from "@/hooks/useClipboard";
import { useDiagramHistory } from "@/hooks/useDiagramHistory";
import { AccountDialog } from "@/components/AccountDialog";
import { ConfirmCanvasDeleteDialog } from "@/components/ConfirmCanvasDeleteDialog";
import { authClient } from "@/lib/auth-client";

const deletionKey = (scope: "account" | "device", id: string, userId?: string | null) =>
  scope === "account" ? `account:${userId}:${id}` : `guest:${id}`;
type AccountSyncStatus = "synced" | "pending" | "issue";

function StudioContent() {
  const { screenToFlowPosition, fitView, fitBounds, getNodesBounds, setViewport: setFlowViewport, getViewport, zoomIn, zoomOut } = useReactFlow<FlowNode, FlowEdge>();
  const authSession = authClient.useSession();
  const { flowRef, snapToGridPoint, viewportCenterFlow, localMenuPoint, zoomByPointer } = useCanvasGeometry(screenToFlowPosition, getViewport, setFlowViewport);
  const [diagramId, setDiagramId] = useState("starter-flow");
  const [title, setTitle] = useState("Commerce service flow");
  // Start empty rather than with the seeded starter graph: the stored canvas is
  // read from IndexedDB after mount, and painting the starter first would flash
  // the wrong diagram for a returning visitor.
  const [nodes, setNodes] = useNodesState<FlowNode>([]);
  const [edges, setEdges] = useEdgesState<FlowEdge>([]);
  const [canvasColor, setCanvasColor] = useState("#f6f7fb");
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [edgeLabelDraft, setEdgeLabelDraft] = useState("");
  const [leftPanelOpen, setLeftPanelOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [rightPanelMode, setRightPanelMode] = useState<"settings" | "inspector" | "edge-inspector">("settings");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [diagrams, setDiagrams] = useState<DiagramDocument[]>([]);
  const [saveState, setSaveState] = useState<"saving" | "saved" | "error">("saved");
  const [showLibrary, setShowLibrary] = useState(false);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [accountDiagrams, setAccountDiagrams] = useState<VersionedDiagram[]>([]);
  const [accountSyncStatuses, setAccountSyncStatuses] = useState<Record<string, AccountSyncStatus>>({});
  const [transferPrompt, setTransferPrompt] = useState<{ userId: string; documents: DiagramDocument[] } | null>(null);
  const [activeSource, setActiveSource] = useState<"guest" | "account">("guest");
  const [activeAccountUserId, setActiveAccountUserId] = useState<string | null>(null);
  const [accountSyncTick, setAccountSyncTick] = useState(0);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<{ document: DiagramDocument; fileName: string } | null>(null);
  const [importError, setImportError] = useState("");
  const [importBusy, setImportBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ scope: "account" | "device"; id: string; title: string } | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [showCanvasColors, setShowCanvasColors] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [connectionKind, setConnectionKind] = useState<ConnectionKind | null>(null);
  const [connectionSourceId, setConnectionSourceId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState("");
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [commandIndex, setCommandIndex] = useState(0);
  const [contextMenu, setContextMenu] = useState<{ left: number; top: number; type: "pane" | "node" | "edge"; id: string | null; flow: { x: number; y: number } } | null>(null);
  const [quickAdd, setQuickAdd] = useState<{ left: number; top: number; flow: { x: number; y: number } } | null>(null);
  const importFileRef = useRef<HTMLInputElement>(null);
  const cancelInspectorEdgeLabelRef = useRef(false);
  const fullscreenPreviousViewportRef = useRef<Viewport | null>(null);
  const nodeDragActiveRef = useRef(false);
  const activeRevisionRef = useRef(0);
  const accountSaveRedirectRef = useRef(new Map<string, string>());
  const deletingDiagramIdsRef = useRef(new Set<string>());
  const selectedNode = nodes.find((node) => node.id === selectedNodeId);
  const selectedEdge = edges.find((edge) => edge.id === selectedEdgeId);

  const { recordHistory, undo, redo, resetHistory, historyStatus } = useDiagramHistory(nodes, edges, setNodes, setEdges);
  const { copySelection, pasteSelection, duplicateSelection, duplicateNode, hasClipboard } = useClipboard(nodes, edges, setNodes, setEdges, setSelectedNodeId, setToast, recordHistory);

  const updateEdge = useCallback((id: string, updates: Partial<FlowEdge>) => {
    setEdges((current) => current.map((edge) => edge.id === id ? { ...edge, ...updates } : edge));
  }, [setEdges]);

  const selectEdge = useCallback((id: string) => {
    setNodes((current) => current.map((node) => ({ ...node, selected: false })));
    setEdges((current) => current.map((edge) => ({ ...edge, selected: edge.id === id })));
    setSelectedNodeId(null);
    setSelectedEdgeId(id);
    const edge = edges.find((candidate) => candidate.id === id);
    setEdgeLabelDraft(edge && typeof edge.label === "string" ? edge.label : "");
  }, [edges, setEdges, setNodes]);

  const selectNode = useCallback((id: string) => {
    setNodes((current) => current.map((node) => ({ ...node, selected: node.id === id })));
    setEdges((current) => current.map((edge) => ({ ...edge, selected: false })));
    setSelectedNodeId(id);
    setSelectedEdgeId(null);
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

  const removeNode = useCallback((id: string) => {
    recordHistory();
    setNodes((current) => current.filter((node) => node.id !== id));
    setEdges((current) => current.filter((edge) => edge.source !== id && edge.target !== id));
    setSelectedNodeId((current) => (current === id ? null : current));
  }, [recordHistory, setEdges, setNodes]);

  const removeEdge = useCallback((id: string) => {
    recordHistory();
    setEdges((current) => current.filter((edge) => edge.id !== id));
    setSelectedEdgeId((current) => (current === id ? null : current));
  }, [recordHistory, setEdges]);

  useEffect(() => {
    const handleCanvasShortcuts = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || target.closest("input, textarea, select, [contenteditable='true']"))) return;

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandQuery("");
        setCommandIndex(0);
        setCommandOpen((open) => !open);
        return;
      }

      if (!event.ctrlKey && !event.metaKey && !event.altKey && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
        if (!nodes.some((node) => node.selected)) return;
        event.preventDefault();
        const step = event.shiftKey ? GRID_STEP * 4 : GRID_STEP;
        const dx = event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
        const dy = event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;
        recordHistory();
        setNodes((current) => current.map((node) => node.selected ? { ...node, position: { x: node.position.x + dx, y: node.position.y + dy } } : node));
        return;
      }

      if (event.shiftKey && !event.ctrlKey && !event.metaKey && event.code === "Digit1") {
        event.preventDefault();
        void fitView({ padding: 0.16, duration: 220 });
        return;
      }

      if (event.defaultPrevented || event.altKey || !(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();
      if (key === "c") {
        if (!nodes.some((node) => node.selected)) return;
        event.preventDefault();
        copySelection();
      } else if (key === "v") {
        if (!hasClipboard()) return;
        event.preventDefault();
        pasteSelection();
      } else if (key === "d") {
        if (!nodes.some((node) => node.selected)) return;
        event.preventDefault();
        duplicateSelection();
      } else if (key === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      } else if (key === "y") {
        event.preventDefault();
        redo();
      } else if (key === "=" || key === "+") {
        event.preventDefault();
        void zoomIn({ duration: 120 });
      } else if (key === "-" || key === "_") {
        event.preventDefault();
        void zoomOut({ duration: 120 });
      }
    };
    window.addEventListener("keydown", handleCanvasShortcuts);
    return () => window.removeEventListener("keydown", handleCanvasShortcuts);
  }, [copySelection, duplicateSelection, fitView, hasClipboard, nodes, pasteSelection, redo, undo, recordHistory, setNodes, zoomIn, zoomOut]);

  const refreshLibrary = useCallback(async () => {
    setDiagrams(await listLocalDiagrams());
  }, []);

  // Makes a stored document the open canvas and remembers it, so returning to
  // the app resumes on the same diagram instead of the seeded starter. Edges
  // saved before four-way handles have no handle ids; they resolve to the
  // horizontal defaults so existing diagrams keep their routing.
  const activateDocument = useCallback((document: DiagramDocument, rememberGuestCanvas = true) => {
    setActiveSource("guest");
    setActiveAccountUserId(null);
    activeRevisionRef.current = 0;
    setDiagramId(document.id);
    setTitle(document.title);
    setNodes(document.graph.nodes as FlowNode[]);
    setEdges(normalizeStoredEdges(document.graph.edges));
    setCanvasColor(document.graph.canvasColor);
    setViewport(document.graph.viewport);
    setShowGrid(document.graph.showGrid);
    resetHistory();
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    if (rememberGuestCanvas) saveLastOpenDiagramId(document.id);
  }, [resetHistory, setEdges, setNodes]);

  const activateAccountDocument = useCallback((entry: VersionedDiagram, userId: string) => {
    activateDocument(entry.document, false);
    setActiveSource("account");
    setActiveAccountUserId(userId);
    activeRevisionRef.current = entry.revision;
    saveLastOpenAccountDiagramId(userId, entry.document.id);
    void setLastOpenAccountDiagramId(entry.document.id).catch(() => undefined);
  }, [activateDocument]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        // Resume the remembered canvas. When there is no pointer yet (first run
        // after this change, cleared storage, or a stale id) fall back to the
        // most recently edited canvas before seeding anything, so a returning
        // visitor never lands on the seeded starter by accident.
        const savedId = readLastOpenDiagramId();
        const stored = await listLocalDiagrams();
        const candidates = savedId ? [savedId, ...stored.map((diagram) => diagram.id)] : stored.map((diagram) => diagram.id);
        let document: DiagramDocument | undefined;
        for (const candidateId of candidates) {
          document = await readLocalDiagram(candidateId).catch(() => undefined);
          if (document) break;
        }
        if (!document) {
          document = makeDocument("starter-flow", "Commerce service flow", seedNodes, seedEdges, "#f6f7fb", { x: 0, y: 0, zoom: 1 }, true);
          await saveLocalDiagram(document);
        }
        if (!active) return;
        activateDocument(document);
        await refreshLibrary();
        if (active) setLoaded(true);
      } catch {
        if (active) {
          setSaveState("error");
          setLoaded(true);
        }
      }
    })();
    return () => { active = false; };
  }, [activateDocument, refreshLibrary]);

  const accountUserId = authSession.data?.user.id ?? null;

  useEffect(() => {
    if (authSession.isPending) return;
    if (!accountUserId) {
      setAccountDiagrams([]);
      setAccountSyncStatuses({});
      setTransferPrompt(null);
      return;
    }

    setAccountSyncStatuses({});
    let active = true;
    void (async () => {
      try {
        const guestDocuments = await listLocalDiagrams();
        const documentsToOffer: DiagramDocument[] = [];
        for (const document of guestDocuments) {
          const receipt = await getGuestTransferReceipt(accountUserId, document.id);
          if (!receipt || receipt.guestUpdatedAt !== document.updatedAt) {
            const dismissedAt = getGuestTransferPromptDismissal(accountUserId, document.id);
            if (dismissedAt !== document.updatedAt) documentsToOffer.push(document);
          }
        }

        let remote: VersionedDiagram[];
        try {
          remote = await listAccountDiagrams();
          if (navigator.onLine) {
            const conflicts = await serializeDiagramWrite(`account:${accountUserId}`, () => flushQueuedAccountDiagrams(accountUserId));
            if (conflicts.length) setToast("Offline edits were synced as conflict copies. Review both versions in your account canvases.");
            remote = await listAccountDiagrams();
          }
          for (const entry of remote) {
            const cached = await getAccountDiagramCache(accountUserId, entry.document.id);
            if (!cached?.dirty) {
              await saveAccountDiagramCache({ userId: accountUserId, diagramId: entry.document.id, document: entry.document, revision: entry.revision, updatedAt: entry.document.updatedAt, dirty: false });
            }
          }
        } catch {
          const cached = await listAccountDiagramCache(accountUserId);
          remote = cached.map(({ document, revision }) => ({ document, revision }));
        }
        const cachedRows = await listAccountDiagramCache(accountUserId);
        const queuedRows = await listQueuedDiagramSync(accountUserId);
        const queuedIds = new Set(queuedRows.map((entry) => entry.diagramId));
        const combined = new Map(remote.map((entry) => [entry.document.id, entry]));
        for (const cached of cachedRows) {
          if (cached.dirty) combined.set(cached.diagramId, { document: cached.document, revision: cached.revision });
        }
        remote = [...combined.values()].sort((a, b) => b.document.updatedAt - a.document.updatedAt);

        if (!active) return;
        setAccountDiagrams(remote);
        setAccountSyncStatuses(Object.fromEntries(remote.map((entry) => {
          const cache = cachedRows.find((row) => row.diagramId === entry.document.id);
          const hasPendingWork = Boolean(cache?.dirty || queuedIds.has(entry.document.id));
          return [entry.document.id, hasPendingWork ? navigator.onLine ? "issue" : "pending" : "synced"];
        })));
        if (documentsToOffer.length) setTransferPrompt({ userId: accountUserId, documents: documentsToOffer });
        if (remote.length) {
          let accountRememberedId: string | undefined;
          try {
            accountRememberedId = await getLastOpenAccountDiagramId();
          } catch {
            accountRememberedId = undefined;
          }
          const remembered = accountRememberedId ?? readLastOpenAccountDiagramId(accountUserId) ?? readLastOpenDiagramId();
          const next = remote.find((entry) => entry.document.id === remembered) ?? remote[0];
          activateAccountDocument(next, accountUserId);
        }
      } catch {
        if (active) setToast("Account canvases could not be loaded yet.");
      }
    })();
    return () => { active = false; };
  }, [accountUserId, activateAccountDocument, authSession.isPending]);

  useEffect(() => {
    if (authSession.isPending || authSession.data?.user || activeSource !== "account") return;
    setAccountDiagrams([]);
    void (async () => {
      const local = await listLocalDiagrams();
      const remembered = readLastOpenDiagramId();
      const next = (remembered ? await readLocalDiagram(remembered).catch(() => undefined) : undefined) ?? local[0];
      if (next) activateDocument(next);
    })();
  }, [activeSource, activateDocument, authSession.data?.user, authSession.isPending]);

  useEffect(() => {
    if (activeSource !== "account" || !accountUserId) return;
    const syncWhenOnline = () => {
      setAccountSyncTick((tick) => tick + 1);
      void serializeDiagramWrite(`account:${accountUserId}`, () => flushQueuedAccountDiagrams(accountUserId, diagramId)).then(async (conflicts) => {
        const remote = await listAccountDiagrams();
        const cachedRows = await listAccountDiagramCache(accountUserId);
        const queuedRows = await listQueuedDiagramSync(accountUserId);
        const queuedIds = new Set(queuedRows.map((entry) => entry.diagramId));
        const combined = new Map(remote.map((entry) => [entry.document.id, entry]));
        for (const cached of cachedRows) if (cached.dirty) combined.set(cached.diagramId, { document: cached.document, revision: cached.revision });
        const refreshed = [...combined.values()].sort((a, b) => b.document.updatedAt - a.document.updatedAt);
        setAccountDiagrams(refreshed);
        void setLastOpenAccountDiagramId(diagramId).catch(() => undefined);
        for (const entry of remote) {
          const cached = await getAccountDiagramCache(accountUserId, entry.document.id);
          if (!cached?.dirty) await saveAccountDiagramCache({ userId: accountUserId, diagramId: entry.document.id, document: entry.document, revision: entry.revision, updatedAt: entry.document.updatedAt, dirty: false });
        }
        setAccountSyncStatuses(Object.fromEntries(refreshed.map((entry) => {
          const cache = cachedRows.find((row) => row.diagramId === entry.document.id);
          const hasPendingWork = Boolean(cache?.dirty || queuedIds.has(entry.document.id));
          return [entry.document.id, hasPendingWork ? navigator.onLine ? "issue" : "pending" : "synced"];
        })));
        if (conflicts.length) setToast("Offline edits were synced as conflict copies. Review both versions in your account canvases.");
      }).catch(() => setToast("Some account canvases are still waiting to sync."));
    };
    window.addEventListener("online", syncWhenOnline);
    return () => window.removeEventListener("online", syncWhenOnline);
  }, [accountUserId, activeSource, diagramId]);

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
  }, [flowRef, setFlowViewport]);

  useEffect(() => {
    if (!loaded) return;
    const timer = window.setTimeout(async () => {
      setSaveState("saving");
      try {
        const document = makeDocument(diagramId, title.trim() || "Untitled flow", nodes, edges, canvasColor, viewport, showGrid);
        if (activeSource === "account" && activeAccountUserId) {
          await serializeDiagramWrite(`account:${activeAccountUserId}`, async () => {
            if (deletingDiagramIdsRef.current.has(deletionKey("account", diagramId, activeAccountUserId))) {
              setSaveState("saved");
              return;
            }
            let targetDiagramId = diagramId;
            const visited = new Set<string>();
            while (accountSaveRedirectRef.current.has(targetDiagramId) && !visited.has(targetDiagramId)) {
              visited.add(targetDiagramId);
              targetDiagramId = accountSaveRedirectRef.current.get(targetDiagramId)!;
            }
            if (deletingDiagramIdsRef.current.has(deletionKey("account", targetDiagramId, activeAccountUserId))) {
              setSaveState("saved");
              return;
            }
            document.id = targetDiagramId;
            const cached = await getAccountDiagramCache(activeAccountUserId, targetDiagramId);
            if (targetDiagramId !== diagramId && cached) document.title = cached.document.title;
            document.createdAt = cached?.document.createdAt ?? document.createdAt;
            if (cached && !cached.dirty && sameDiagramContent(cached.document, document)) {
              setAccountSyncStatuses((current) => ({ ...current, [targetDiagramId]: "synced" }));
              setSaveState("saved");
              return;
            }
            const expectedRevision = cached?.revision ?? activeRevisionRef.current;
            await saveAccountDiagramCache({ userId: activeAccountUserId, diagramId: targetDiagramId, document, revision: expectedRevision, updatedAt: document.updatedAt, dirty: true });
            await queueDiagramSync({ userId: activeAccountUserId, diagramId: targetDiagramId, document, expectedRevision, updatedAt: document.updatedAt });
            setAccountSyncStatuses((current) => ({ ...current, [targetDiagramId]: "pending" }));
            try {
              const result = expectedRevision > 0
                ? await updateAccountDiagram(document, expectedRevision)
                : await createAccountDiagram(document);
              activeRevisionRef.current = result.revision;
              await saveAccountDiagramCache({ userId: activeAccountUserId, diagramId: targetDiagramId, document, revision: result.revision, updatedAt: document.updatedAt, dirty: false });
              await removeQueuedDiagramSync(activeAccountUserId, targetDiagramId);
              setAccountDiagrams((current) => [{ document, revision: result.revision }, ...current.filter((entry) => entry.document.id !== targetDiagramId)]);
              setAccountSyncStatuses((current) => ({ ...current, [targetDiagramId]: "synced" }));
              saveLastOpenAccountDiagramId(activeAccountUserId, targetDiagramId);
              void setLastOpenAccountDiagramId(targetDiagramId).catch(() => undefined);
              setSaveState("saved");
            } catch (error) {
              if (error instanceof AccountDiagramError && error.status === 409) {
                if (error.current && sameDiagramContent(error.current.document, document)) {
                  activeRevisionRef.current = error.current.revision;
                  await saveAccountDiagramCache({ userId: activeAccountUserId, diagramId: targetDiagramId, document: error.current.document, revision: error.current.revision, updatedAt: error.current.document.updatedAt, dirty: false });
                  await removeQueuedDiagramSync(activeAccountUserId, targetDiagramId);
                  setAccountDiagrams((current) => [{ document: error.current!.document, revision: error.current!.revision }, ...current.filter((entry) => entry.document.id !== targetDiagramId)]);
                  setAccountSyncStatuses((current) => ({ ...current, [targetDiagramId]: "synced" }));
                  setSaveState("saved");
                  return;
                }
                const conflictCopy = { ...document, id: crypto.randomUUID(), title: `${document.title} (conflict copy)`, updatedAt: Date.now() };
                try {
                  if (error.current) await saveAccountDiagramCache({ userId: activeAccountUserId, diagramId: targetDiagramId, document: error.current.document, revision: error.current.revision, updatedAt: error.current.document.updatedAt, dirty: false });
                  const savedCopy = await createAccountDiagram(conflictCopy);
                  await saveAccountDiagramCache({ userId: activeAccountUserId, diagramId: conflictCopy.id, document: conflictCopy, revision: savedCopy.revision, updatedAt: conflictCopy.updatedAt, dirty: false });
                  await removeQueuedDiagramSync(activeAccountUserId, targetDiagramId);
                  for (const [sourceId, destinationId] of accountSaveRedirectRef.current) {
                    if (destinationId === targetDiagramId) accountSaveRedirectRef.current.set(sourceId, conflictCopy.id);
                  }
                  accountSaveRedirectRef.current.set(targetDiagramId, conflictCopy.id);
                  if (error.current) setAccountDiagrams((current) => [{ ...error.current!, revision: error.current!.revision }, { document: conflictCopy, revision: savedCopy.revision }, ...current.filter((entry) => entry.document.id !== targetDiagramId)]);
                  setAccountSyncStatuses((current) => ({ ...current, [targetDiagramId]: "synced", [conflictCopy.id]: "synced" }));
                  setDiagramId(conflictCopy.id);
                  setTitle(conflictCopy.title);
                  activeRevisionRef.current = savedCopy.revision;
                  saveLastOpenAccountDiagramId(activeAccountUserId, conflictCopy.id);
                  void setLastOpenAccountDiagramId(conflictCopy.id).catch(() => undefined);
                  setToast("Both edits were kept. Review the conflict copy in your account canvases.");
                  setSaveState("saved");
                } catch {
                  setAccountSyncStatuses((current) => ({ ...current, [targetDiagramId]: "issue" }));
                  setSaveState("saved");
                  setToast("A sync conflict needs attention. Your edited canvas is still saved on this device.");
                }
              } else {
                const offline = !navigator.onLine || error instanceof AccountDiagramError && error.status === 0;
                setAccountSyncStatuses((current) => ({ ...current, [targetDiagramId]: offline ? "pending" : "issue" }));
                setSaveState("saved");
              }
            }
          });
        } else {
          if (deletingDiagramIdsRef.current.has(deletionKey("device", diagramId))) {
            setSaveState("saved");
            return;
          }
          const previous = await readLocalDiagram(diagramId);
          document.createdAt = previous?.createdAt ?? document.createdAt;
          if (previous && sameDiagramContent(previous, document)) {
            setSaveState("saved");
            return;
          }
          await serializeDiagramWrite(`guest:${diagramId}`, async () => {
            if (!deletingDiagramIdsRef.current.has(deletionKey("device", diagramId))) await saveLocalDiagram(document);
          });
          await refreshLibrary();
          setSaveState("saved");
        }
      } catch {
        if (activeSource === "account" && diagramId) setAccountSyncStatuses((current) => ({ ...current, [diagramId]: navigator.onLine ? "issue" : "pending" }));
        setSaveState("error");
      }
    }, 450);
    return () => window.clearTimeout(timer);
  }, [activeAccountUserId, activeSource, accountSyncTick, canvasColor, diagramId, edges, loaded, nodes, refreshLibrary, showGrid, title, viewport]);

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

  useEffect(() => {
    if (!contextMenu && !quickAdd) return;
    const closeMenus = () => { setContextMenu(null); setQuickAdd(null); };
    window.addEventListener("pointerdown", closeMenus);
    return () => window.removeEventListener("pointerdown", closeMenus);
  }, [contextMenu, quickAdd]);

  useEffect(() => {
    const closeOverlays = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setContextMenu(null);
      setQuickAdd(null);
      setCommandOpen(false);
    };
    window.addEventListener("keydown", closeOverlays);
    return () => window.removeEventListener("keydown", closeOverlays);
  }, []);

  useEffect(() => {
    const element = flowRef.current;
    if (!element) return;
    const handlePinchWheel = (event: WheelEvent) => {
      // Trackpad / touchpad pinch arrives as a ctrl-modified wheel event.
      // Amplify it for smooth, responsive zoom and keep plain scroll panning.
      if (!event.ctrlKey) return;
      event.preventDefault();
      event.stopPropagation();
      zoomByPointer(Math.pow(2, -event.deltaY * PINCH_WHEEL_INTENSITY), event.clientX, event.clientY);
    };
    element.addEventListener("wheel", handlePinchWheel, { passive: false, capture: true });
    return () => element.removeEventListener("wheel", handlePinchWheel, { capture: true });
  }, [flowRef, zoomByPointer]);

  const onConnect = useCallback((connection: Connection) => {
    recordHistory();
    const templateKind: ConnectionKind = connectionKind ?? "request";
    const template = connectionMeta[templateKind];
    const style = { ...connectionStyle[templateKind] };
    const useTemplate = Boolean(connectionKind);
    setEdges((current) => addEdge({
      ...connection,
      id: `connection-${crypto.randomUUID()}`,
      type: "archly",
      label: useTemplate ? template.label : undefined,
      animated: useTemplate ? template.animated : undefined,
      data: { connectionKind: templateKind },
      style,
      markerEnd: { type: MarkerType.ArrowClosed, color: style.stroke },
    }, current));
    if (connectionKind) {
      setConnectionKind(null);
      setConnectionSourceId(null);
      setToast(`${template.label} connection added`);
    }
  }, [connectionKind, recordHistory, setEdges]);

  const onReconnect = useCallback((oldEdge: FlowEdge, newConnection: Connection) => {
    recordHistory();
    setEdges((current) => current.map((edge) => edge.id === oldEdge.id
      ? { ...edge, source: newConnection.source, target: newConnection.target, sourceHandle: newConnection.sourceHandle, targetHandle: newConnection.targetHandle }
      : edge));
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
      sourceHandle: HANDLE_RIGHT,
      targetHandle: HANDLE_LEFT,
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

  const addNode = (kind: Kind, position?: { x: number; y: number }) => {
    recordHistory();
    const id = `${kind}-${crypto.randomUUID().slice(0, 7)}`;
    const point = position ?? viewportCenterFlow();
    const node: FlowNode = {
      id,
      type: "engineering",
      position: snapToGridPoint(point),
      data: { label: `New ${kindMeta[kind].label.toLowerCase()}`, description: "Click to describe this component", kind, color: "#ffffff" },
    };
    setNodes((current) => [...current, node]);
    setSelectedNodeId(id);
    setToast(`${kindMeta[kind].label} added to canvas`);
  };

  const createDiagram = async () => {
    const id = crypto.randomUUID();
    const next = makeDocument(id, "Untitled flow", [], [], canvasColor, { x: 0, y: 0, zoom: 1 }, true);
    if (accountUserId) {
      let revision = 0;
      await saveAccountDiagramCache({ userId: accountUserId, diagramId: id, document: next, revision: 0, updatedAt: next.updatedAt, dirty: true });
      await queueDiagramSync({ userId: accountUserId, diagramId: id, document: next, expectedRevision: 0, updatedAt: next.updatedAt });
      try {
        const saved = await createAccountDiagram(next);
        revision = saved.revision;
        await saveAccountDiagramCache({ userId: accountUserId, diagramId: id, document: next, revision: saved.revision, updatedAt: next.updatedAt, dirty: false });
        await removeQueuedDiagramSync(accountUserId, id);
        setAccountDiagrams((current) => [{ document: next, revision: saved.revision }, ...current]);
        setAccountSyncStatuses((current) => ({ ...current, [id]: "synced" }));
      } catch {
        setAccountSyncStatuses((current) => ({ ...current, [id]: navigator.onLine ? "issue" : "pending" }));
        setToast("New account canvas saved on this device. It will sync when you reconnect.");
      }
      setAccountDiagrams((current) => [{ document: next, revision }, ...current.filter((entry) => entry.document.id !== id)]);
      activateAccountDocument({ document: next, revision }, accountUserId);
      setShowLibrary(false);
      return;
    }
    await saveLocalDiagram(next);
    activateDocument(next);
    setShowLibrary(false);
    await refreshLibrary();
    setToast("New local canvas created");
  };

  const openDiagram = async (id: string) => {
    const document = await readLocalDiagram(id);
    if (!document) return;
    activateDocument(document);
    setShowLibrary(false);
  };

  const openAccountDiagram = (entry: VersionedDiagram) => {
    if (!accountUserId) return;
    activateAccountDocument(entry, accountUserId);
    setShowLibrary(false);
  };

  const requestCanvasDelete = (scope: "account" | "device", id: string, canvasTitle: string) => {
    setDeleteError("");
    setDeleteTarget({ scope, id, title: canvasTitle || "Untitled flow" });
  };

  const confirmCanvasDelete = async () => {
    if (!deleteTarget || deleteBusy) return;
    const target = deleteTarget;
    const userId = accountUserId;
    if (target.scope === "account" && !userId) {
      setDeleteError("Sign in to delete this account canvas.");
      return;
    }
    setDeleteBusy(true);
    const deletedStorageKey = deletionKey(target.scope, target.id, userId);
    deletingDiagramIdsRef.current.add(deletedStorageKey);
    try {
      if (target.scope === "account") {
        await serializeDiagramWrite(`account:${userId}`, async () => {
          await deleteAccountDiagram(target.id);
          await deleteAccountDiagramCache(userId!, target.id);
        });
        const remaining = accountDiagrams.filter((entry) => entry.document.id !== target.id);
        setAccountDiagrams(remaining);
        setAccountSyncStatuses((current) => {
          const next = { ...current };
          delete next[target.id];
          return next;
        });
        if (activeSource === "account" && diagramId === target.id) {
          if (remaining[0]) activateAccountDocument(remaining[0], userId!);
          else {
            const fresh = makeDocument(crypto.randomUUID(), "Untitled flow", [], [], canvasColor, { x: 0, y: 0, zoom: 1 }, true);
            activateAccountDocument({ document: fresh, revision: 0 }, userId!);
          }
        }
      } else {
        await serializeDiagramWrite(`guest:${target.id}`, () => deleteLocalDiagram(target.id));
        const remaining = (await listLocalDiagrams()).filter((entry) => entry.id !== target.id);
        setDiagrams(remaining);
        if (activeSource === "guest" && diagramId === target.id) {
          if (remaining[0]) activateDocument(remaining[0]);
          else activateDocument(makeDocument(crypto.randomUUID(), "Untitled flow", [], [], canvasColor, { x: 0, y: 0, zoom: 1 }, true));
        }
      }
      setDeleteTarget(null);
      setToast("Canvas permanently deleted");
    } catch (error) {
      deletingDiagramIdsRef.current.delete(deletedStorageKey);
      setDeleteError(error instanceof Error ? error.message : "Could not delete this canvas. Please try again.");
    } finally {
      setDeleteBusy(false);
    }
  };

  const transferGuestCanvases = async () => {
    if (!transferPrompt) return;
    const { userId, documents } = transferPrompt;
    for (const document of documents) clearGuestTransferPromptDismissal(userId, document.id);
    setSaveState("saving");
    const imported: VersionedDiagram[] = [];
    const transferredByGuestId = new Map<string, VersionedDiagram>();
    let conflictCount = 0;
    try {
      for (const guestDocument of documents) {
        let accountDocument = guestDocument;
        let result: Awaited<ReturnType<typeof createAccountDiagram>>;
        try {
          result = await createAccountDiagram(accountDocument);
        } catch (error) {
          if (!(error instanceof AccountDiagramError) || error.status !== 409) throw error;
          if (error.current && sameDiagramGraph(error.current.document, guestDocument)) {
            accountDocument = error.current.document;
            result = { revision: error.current.revision, alreadySaved: true };
          } else {
            accountDocument = { ...guestDocument, id: crypto.randomUUID(), title: `${guestDocument.title} (local copy)`, updatedAt: Date.now() };
            result = await createAccountDiagram(accountDocument);
            conflictCount += 1;
          }
        }
        const transferred = { document: accountDocument, revision: result.revision };
        imported.push(transferred);
        transferredByGuestId.set(guestDocument.id, transferred);
        await saveAccountDiagramCache({ userId, diagramId: accountDocument.id, document: accountDocument, revision: result.revision, updatedAt: accountDocument.updatedAt, dirty: false });
        setAccountSyncStatuses((current) => ({ ...current, [accountDocument.id]: "synced" }));
        await saveGuestTransferReceipt({ userId, diagramId: guestDocument.id, guestUpdatedAt: guestDocument.updatedAt, accountDiagramId: accountDocument.id });
        clearGuestTransferPromptDismissal(userId, guestDocument.id);
      }
      const remote = await listAccountDiagrams();
      setAccountDiagrams(remote);
      const alreadyOnAccountCanvas = activeSource === "account" && activeAccountUserId === userId;
      const currentTransfer = transferredByGuestId.get(diagramId) ?? imported[0];
      if (!alreadyOnAccountCanvas && currentTransfer) activateAccountDocument(currentTransfer, userId);
      setTransferPrompt(null);
      setSaveState("saved");
      setToast(conflictCount ? `${imported.length} canvases transferred; ${conflictCount} conflict copy kept. Review both in your account.` : `${imported.length} canvases copied to your account. Local originals are still here.`);
    } catch (error) {
      setSaveState("saved");
      setToast(error instanceof AccountDiagramError ? error.message : "Transfer stopped. Your local canvases are still safe; try again when online.");
    }
  }; 

  const reviewGuestTransfer = async () => {
    if (!accountUserId) return;
    const local = await listLocalDiagrams();
    const documents: DiagramDocument[] = [];
    for (const document of local) {
      const receipt = await getGuestTransferReceipt(accountUserId, document.id);             
      if (!receipt || receipt.guestUpdatedAt !== document.updatedAt) documents.push (document);           
    }                 
    if (documents.length) setTransferPrompt({ userId: accountUserId, documents });
    else setToast("All canvases on this device have already been copied to your account.");
  };

  const dismissGuestTransferPrompt = () => {
    if (!transferPrompt) return;
    for (const document of transferPrompt.documents) {
      saveGuestTransferPromptDismissal(transferPrompt.userId, document.id, document.updatedAt);
    }
    setTransferPrompt(null);
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

      activateDocument(imported);
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

  const commandQueryLower = commandQuery.trim().toLowerCase();
  const commandItems = [
    ...(Object.keys(kindMeta) as Kind[]).map((kind) => ({ id: `add-${kind}`, icon: kindMeta[kind].icon, title: `Add ${kindMeta[kind].label}`, hint: "Component" })),
    { id: "new-canvas", icon: "＋", title: "Create new canvas", hint: "Canvas" },
    { id: "open-library", icon: "▦", title: "Open saved canvases", hint: "Canvas" },
    { id: "import", icon: "↑", title: "Import JSON backup", hint: "Canvas" },
    { id: "export", icon: "↓", title: "Export JSON backup", hint: "Canvas" },
    { id: "undo", icon: "↶", title: "Undo", hint: "Edit" },
    { id: "redo", icon: "↷", title: "Redo", hint: "Edit" },
    { id: "copy", icon: "⧉", title: "Copy selection", hint: "Edit" },
    { id: "paste", icon: "⎘", title: "Paste", hint: "Edit" },
    { id: "duplicate", icon: "❐", title: "Duplicate selection", hint: "Edit" },
    { id: "delete", icon: "✕", title: "Delete selection", hint: "Edit" },
    { id: "fit", icon: "⤢", title: "Fit view", hint: "View" },
    { id: "zoom-in", icon: "＋", title: "Zoom in", hint: "View" },
    { id: "zoom-out", icon: "－", title: "Zoom out", hint: "View" },
    { id: "reset-zoom", icon: "◎", title: "Reset zoom to 100%", hint: "View" },
    { id: "toggle-panels", icon: "☷", title: "Toggle components panel", hint: "View" },
    { id: "toggle-settings", icon: "⚙", title: "Toggle canvas settings", hint: "View" },
    { id: "toggle-grid", icon: "⋮", title: "Toggle canvas guide", hint: "View" },
    { id: "fullscreen", icon: "⛶", title: "Toggle full screen", hint: "View" },
  ];
  const filteredCommands = commandQueryLower ? commandItems.filter((command) => `${command.title} ${command.hint}`.toLowerCase().includes(commandQueryLower)) : commandItems;
  const activeCommandIndex = filteredCommands.length ? Math.min(commandIndex, filteredCommands.length - 1) : 0;

  const runCommand = (id: string) => {
    if (id.startsWith("add-")) { addNode(id.slice(4) as Kind); return; }
    switch (id) {
      case "new-canvas": void createDiagram(); break;
      case "open-library": setShowLibrary(true); break;
      case "import": beginImport(); break;
      case "export": exportDiagram(); break;
      case "undo": undo(); break;
      case "redo": redo(); break;
      case "copy": copySelection(); break;
      case "paste": pasteSelection(); break;
      case "duplicate": duplicateSelection(); break;
      case "delete": if (selectedNodeId) removeSelectedNode(); else if (selectedEdgeId) { removeEdge(selectedEdgeId); setRightPanelOpen(false); } break;
      case "fit": void fitView({ padding: 0.16, duration: 220 }); break;
      case "zoom-in": void zoomIn({ duration: 120 }); break;
      case "zoom-out": void zoomOut({ duration: 120 }); break;
      case "reset-zoom": void setFlowViewport({ ...viewport, zoom: 1 }, { duration: 150 }); break;
      case "toggle-panels": setLeftPanelOpen((open) => !open); break;
      case "toggle-settings": setRightPanelMode("settings"); setRightPanelOpen((open) => !open); break;
      case "toggle-grid": setShowGrid((visible) => !visible); break;
      case "fullscreen": void toggleFullscreen(); break;
      default: break;
    }
  };

  return (
    <main className="studio-shell">
      <input ref={importFileRef} type="file" accept="application/json,.json" aria-label="Choose an Archly JSON backup" hidden onChange={handleImportFile} />
      <div className={`workspace ${leftPanelOpen ? "has-left-panel" : "left-panel-closed"} ${rightPanelOpen ? "has-right-panel" : "right-panel-closed"}`}>
        {leftPanelOpen && <aside className="left-sidebar">
          <div className="sidebar-panel-heading"><span className="sidebar-label">BUILD</span><button className="panel-close-button" onClick={() => setLeftPanelOpen(false)} aria-label="Close components panel" title="Close components panel">‹</button></div>
          <button className="sidebar-tab active"><span className="tab-icon">◈</span><span>Components</span></button>
          <button className="sidebar-tab" onClick={() => setShowLibrary((open) => !open)}><span className="tab-icon">▦</span><span>My canvases</span><span className="tab-count">{diagrams.length}</span></button>
          <div className="sidebar-rule" />
          <div className="palette-heading"><div><span className="sidebar-label">COMPONENTS</span><span className="palette-hint">Drag onto canvas</span></div><span className="tiny-count">{String(Object.keys(kindMeta).length).padStart(2, "0")}</span></div>
          <div className="component-list">
            {(Object.keys(kindMeta) as Kind[]).map((kind) => <button key={kind} className="component-card" onClick={() => addNode(kind)} draggable onDragStart={(event) => event.dataTransfer.setData("application/archly-kind", kind)}><span className={`component-icon ${kindMeta[kind].className}`}>{kindMeta[kind].icon}</span><span className="component-copy"><strong>{kindMeta[kind].label}</strong><small>{kindMeta[kind].hint}</small></span><span className="add-hint">＋</span></button>)}
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
            <div className="canvas-heading">
              <button className="toolbar-button icon-only library-toggle" onClick={() => setShowLibrary((open) => !open)} aria-label="Open saved canvases" title="Saved canvases">▦</button>
              <input aria-label="Diagram name" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} />
              {showLibrary && <div className="library-popover">
                <div className="popover-heading"><div><strong>Your canvases</strong><small>Saved in this browser</small></div><button className="icon-button small" onClick={() => setShowLibrary(false)} aria-label="Close canvas list">×</button></div>
                <button className="new-diagram-button" onClick={createDiagram}><span>＋</span> Create a new canvas</button>
                <button className="import-backup-button" onClick={beginImport}><span>↑</span> Import JSON backup</button>
                {accountUserId && diagrams.length > 0 && <button className="import-backup-button" onClick={() => void reviewGuestTransfer()}><span>☁</span> Copy this device’s canvases to account</button>}
                {accountDiagrams.length > 0 && <><div className="diagram-section-label">ACCOUNT CANVASES</div><div className="diagram-list">{accountDiagrams.map((entry) => { const status = accountSyncStatuses[entry.document.id] ?? "synced"; return <div className="diagram-row-item" key={`account-${entry.document.id}`}><button className={`diagram-row ${entry.document.id === diagramId && activeSource === "account" ? "current" : ""}`} onClick={() => openAccountDiagram(entry)}><span className="diagram-row-icon">☁</span><span className="diagram-row-copy"><strong>{entry.document.title || "Untitled flow"}</strong><small>{entry.document.graph.nodes.length} components · <span className={`canvas-sync-status ${status}`}>{status === "pending" ? "Pending sync" : status === "issue" ? "Sync issue" : "Synced"}</span></small></span>{entry.document.id === diagramId && activeSource === "account" && <span className="current-dot" />}</button><button className="diagram-row-delete" aria-label={`Delete ${entry.document.title || "Untitled flow"}`} title="Delete canvas" onClick={() => requestCanvasDelete("account", entry.document.id, entry.document.title)}><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 4.5h10M6 4.5V3h4v1.5m2 0-.6 8H4.6l-.6-8M6.5 7v3.5M9.5 7v3.5" /></svg></button></div>; })}</div></>}
                <div className="diagram-section-label">THIS DEVICE</div><div className="diagram-list">{diagrams.map((diagram) => <div className="diagram-row-item" key={`guest-${diagram.id}`}><button className={`diagram-row ${diagram.id === diagramId && activeSource === "guest" ? "current" : ""}`} onClick={() => openDiagram(diagram.id)}><span className="diagram-row-icon">◈</span><span className="diagram-row-copy"><strong>{diagram.title || "Untitled flow"}</strong><small>{diagram.graph.nodes.length} components · Edited {new Date(diagram.updatedAt).toLocaleDateString()}</small></span>{diagram.id === diagramId && activeSource === "guest" && <span className="current-dot" />}</button><button className="diagram-row-delete" aria-label={`Delete ${diagram.title || "Untitled flow"}`} title="Delete canvas from this device" onClick={() => requestCanvasDelete("device", diagram.id, diagram.title)}><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 4.5h10M6 4.5V3h4v1.5m2 0-.6 8H4.6l-.6-8M6.5 7v3.5M9.5 7v3.5" /></svg></button></div>)}</div>
              </div>}
            </div>
            <div className="toolbar-actions">
              <span className="save-indicator" title="Saved in this browser"><span className={`save-dot ${saveState}`} />{saveState === "saving" ? "Saving" : saveState === "error" ? "Save issue" : "Saved"}</span>
              {authSession.data?.user ? <>
                <span className="account-user-label" title={authSession.data.user.email}>{authSession.data.user.name || authSession.data.user.email}</span>
                <button className="toolbar-button icon-only" onClick={() => { void authClient.signOut(); }} aria-label="Sign out" title="Sign out">↪</button>
              </> : <button className="account-open-button" onClick={() => setAccountDialogOpen(true)} disabled={authSession.isPending} title="Create an account or sign in">{authSession.isPending ? "…" : "Sign in"}</button>}
              <button className="toolbar-button icon-only panel-toggle" onClick={() => { if (rightPanelOpen && rightPanelMode === "settings") setRightPanelOpen(false); else { setRightPanelMode("settings"); setRightPanelOpen(true); } }} aria-label="Toggle canvas settings" title="Canvas settings">⚙</button>
              {selectedNode && <button className={`toolbar-button icon-only panel-toggle ${rightPanelOpen && rightPanelMode === "inspector" ? "is-active" : ""}`} onClick={() => { if (rightPanelOpen && rightPanelMode === "inspector") setRightPanelOpen(false); else { setRightPanelMode("inspector"); setRightPanelOpen(true); } }} aria-label="Toggle component details" title="Component details">☰</button>}
              {selectedEdge && <button className={`toolbar-button icon-only panel-toggle ${rightPanelOpen && rightPanelMode === "edge-inspector" ? "is-active" : ""}`} onClick={() => { if (rightPanelOpen && rightPanelMode === "edge-inspector") setRightPanelOpen(false); else { setRightPanelMode("edge-inspector"); setRightPanelOpen(true); } }} aria-label="Toggle connection details" title="Connection details">↔</button>}
              <button className="toolbar-button icon-only full-screen-toggle" onClick={toggleFullscreen} aria-label={isFullscreen ? "Exit full screen" : "Enter full screen"} aria-pressed={isFullscreen} title="Full screen">⛶</button>
              <button className="toolbar-button icon-only" onClick={exportDiagram} aria-label="Export JSON backup" title="Export JSON backup">↓</button>
              <span className="toolbar-separator" />
              <button className="toolbar-button icon-only" aria-label="Undo" title="Undo" disabled={!historyStatus.canUndo} onClick={undo}>↶</button>
              <button className="toolbar-button icon-only" aria-label="Redo" title="Redo" disabled={!historyStatus.canRedo} onClick={redo}>↷</button>
              <span className="toolbar-separator" />
              <button className="toolbar-button primary" onClick={() => addNode("service")}><span>＋</span> Add component</button>
            </div>
          </div>
          <button className={`canvas-edge-toggle canvas-left-toggle ${leftPanelOpen ? "is-active" : ""}`} onClick={() => setLeftPanelOpen((open) => !open)} aria-label={leftPanelOpen ? "Hide components panel" : "Show components panel"} title={leftPanelOpen ? "Hide components" : "Components"}><span>☷</span></button>
          <button className={`canvas-edge-toggle canvas-right-toggle ${rightPanelOpen ? "is-active" : ""}`} onClick={() => { if (rightPanelOpen && rightPanelMode === "settings") setRightPanelOpen(false); else { setRightPanelMode("settings"); setRightPanelOpen(true); } }} aria-label={rightPanelOpen && rightPanelMode === "settings" ? "Hide canvas settings" : "Show canvas settings"} title="Canvas settings"><span>⚙</span></button>
          <div className="canvas-workspace" ref={flowRef} style={{ "--canvas-color": canvasColor } as CSSProperties} onDoubleClick={(event) => {
            const element = event.target as HTMLElement;
            if (!element.classList.contains("react-flow__pane")) return;
            const point = screenToFlowPosition({ x: event.clientX, y: event.clientY });
            setContextMenu(null);
            setQuickAdd({ ...localMenuPoint(event.clientX, event.clientY), flow: snapToGridPoint(point) });
          }}>
            <div className="canvas-context">
              <div className="context-eyebrow"><span className="context-dot" /> YOUR SYSTEM, MAPPED</div>
            <div className="context-caption">{connectionKind ? connectionSourceId ? "Now click the destination component." : `Choose a source for ${connectionMeta[connectionKind].label}.` : selectedEdge ? "Double-click its label to edit; open Connection details to change its style." : "Drag on empty canvas to select components · Double-click a component to edit its name."}</div>
            </div>
            {loaded && <div className="canvas-count"><span className="count-icon">◈</span>{nodeCount} components <span className="count-divider">·</span> {edges.length} connections</div>}
            {isFullscreen && <div className="fullscreen-exit-hint"><kbd>Esc</kbd> to exit full screen</div>}
            {!loaded && <div className="canvas-loading">Opening your canvas…</div>}
            {loaded && !nodeCount && <div className="empty-canvas"><div className="empty-orbit"><span>◈</span></div><h2>Start with a component</h2><p>Drag one from the components panel, or add a service to begin mapping your system.</p><button onClick={() => addNode("service")}>＋ Add your first component</button></div>}
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
              onReconnect={onReconnect}
              onNodeClick={onNodeClick}
              onNodeContextMenu={(event, node) => {
                event.preventDefault();
                setQuickAdd(null);
                selectNode(node.id);
                setContextMenu({ ...localMenuPoint(event.clientX, event.clientY), type: "node", id: node.id, flow: snapToGridPoint(node.position) });
              }}
              onEdgeContextMenu={(event, edge) => {
                event.preventDefault();
                setQuickAdd(null);
                selectEdge(edge.id);
                setContextMenu({ ...localMenuPoint(event.clientX, event.clientY), type: "edge", id: edge.id, flow: { x: 0, y: 0 } });
              }}
              onPaneContextMenu={(event) => {
                event.preventDefault();
                setQuickAdd(null);
                setContextMenu({ ...localMenuPoint(event.clientX, event.clientY), type: "pane", id: null, flow: snapToGridPoint(screenToFlowPosition({ x: event.clientX, y: event.clientY })) });
              }}
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
                const selectedEdgeNode = selectedConnections[0] ?? null;
                setSelectedEdgeId(selectedEdgeNode?.id ?? null);
                setEdgeLabelDraft(selectedEdgeNode && typeof selectedEdgeNode.label === "string" ? selectedEdgeNode.label : "");
              }}
              onPaneClick={() => { setSelectedNodeId(null); setSelectedEdgeId(null); setContextMenu(null); setQuickAdd(null); }}
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
              minZoom={MIN_ZOOM}
              maxZoom={MAX_ZOOM}
              zoomOnDoubleClick={false}
              snapToGrid
              snapGrid={[GRID_STEP, GRID_STEP]}
              selectionOnDrag
              selectionMode={SelectionMode.Full}
              connectionMode={ConnectionMode.Loose}
              panOnDrag={[1, 2]}
              panOnScroll
              edgesReconnectable
              connectOnClick
              multiSelectionKeyCode={["Meta", "Control"]}
              deleteKeyCode={["Backspace", "Delete"]}
              defaultEdgeOptions={{ type: "archly" }}
            >
              {showGrid && <Background variant={BackgroundVariant.Dots} gap={22} size={1.1} color={canvasColor === "#1c2330" ? "#495363" : "#d8deea"} />}
              <Controls position="bottom-left" showInteractive={false} />
              <MiniMap position="bottom-right" pannable zoomable nodeColor={(node) => kindMeta[(node.data as NodeData).kind].mapColor} maskColor="rgba(250,251,253,.72)" />
            </ReactFlow>
            </EdgeEditorContext.Provider>
            </HistoryContext.Provider>
            {contextMenu && <div className="context-menu" style={{ left: contextMenu.left, top: contextMenu.top }} role="menu" onPointerDown={(event) => event.stopPropagation()}>
              {contextMenu.type === "pane" && <>
                <div className="context-menu-label">Add component</div>
                {(Object.keys(kindMeta) as Kind[]).map((kind) => <button key={kind} className="context-menu-item" onClick={() => { addNode(kind, contextMenu.flow); setContextMenu(null); }}><span className="context-menu-icon">{kindMeta[kind].icon}</span>{kindMeta[kind].label}</button>)}
                <div className="context-menu-sep" />
                <button className="context-menu-item" onClick={() => { pasteSelection(); setContextMenu(null); }}><span className="context-menu-icon">⎘</span>Paste</button>
                <button className="context-menu-item" onClick={() => { void fitView({ padding: 0.16, duration: 220 }); setContextMenu(null); }}><span className="context-menu-icon">⤢</span>Fit view</button>
              </>}
              {contextMenu.type === "node" && <>
                <div className="context-menu-label">Component</div>
                <button className="context-menu-item" onClick={() => { setRightPanelMode("inspector"); setRightPanelOpen(true); setContextMenu(null); }}><span className="context-menu-icon">⚙</span>Open details</button>
                <button className="context-menu-item" onClick={() => { if (contextMenu.id) duplicateNode(contextMenu.id); setContextMenu(null); }}><span className="context-menu-icon">❐</span>Duplicate</button>
                <div className="context-menu-label">Connect from here</div>
                {(Object.keys(connectionMeta) as ConnectionKind[]).map((kind) => <button key={kind} className="context-menu-item" onClick={() => { if (contextMenu.id) { setConnectionKind(kind); setConnectionSourceId(contextMenu.id); setToast(`Choose a destination for ${connectionMeta[kind].label}.`); } setContextMenu(null); }}><span className="context-menu-icon">→</span>{connectionMeta[kind].label}</button>)}
                <div className="context-menu-sep" />
                <button className="context-menu-item danger" onClick={() => { if (contextMenu.id) removeNode(contextMenu.id); setContextMenu(null); }}><span className="context-menu-icon">✕</span>Delete</button>
              </>}
              {contextMenu.type === "edge" && <>
                <div className="context-menu-label">Connection</div>
                <button className="context-menu-item" onClick={() => { if (contextMenu.id) selectEdge(contextMenu.id); setRightPanelMode("edge-inspector"); setRightPanelOpen(true); setContextMenu(null); }}><span className="context-menu-icon">⚙</span>Open details</button>
                <div className="context-menu-sep" />
                <button className="context-menu-item danger" onClick={() => { if (contextMenu.id) { removeEdge(contextMenu.id); setRightPanelOpen(false); } setContextMenu(null); }}><span className="context-menu-icon">✕</span>Delete</button>
              </>}
            </div>}
            {quickAdd && <div className="context-menu" style={{ left: quickAdd.left, top: quickAdd.top }} role="menu" aria-label="Add a component here" onPointerDown={(event) => event.stopPropagation()}>
              <div className="context-menu-label">Add here</div>
              {(Object.keys(kindMeta) as Kind[]).map((kind) => <button key={kind} className="context-menu-item" onClick={() => { addNode(kind, quickAdd.flow); setQuickAdd(null); }}><span className="context-menu-icon">{kindMeta[kind].icon}</span>{kindMeta[kind].label}</button>)}
            </div>}
            <div className="canvas-bottom-hint">Double-click the canvas to add a component <span className="hint-divider">·</span> Right-click for options <span className="hint-divider">·</span> Ctrl/⌘ K command palette <span className="hint-divider">·</span> Drag empty space to select <span className="hint-divider">·</span> Arrow keys nudge</div>
          </div>
          <div className="canvas-statusbar"><span><span className={`save-dot ${saveState}`} />{activeSource === "account" ? saveState === "saved" ? "Account canvas saved on this device" : saveState === "saving" ? "Syncing account canvas" : "Account sync issue · local copy kept" : saveState === "saved" ? "Saved locally on this device" : saveState === "saving" ? "Saving to this browser" : "Local save issue"}</span><span className="statusbar-right">{activeSource === "account" ? "Offline edits sync when you reconnect" : "Autosave on"} <span className="status-check">✓</span></span></div>
        </section>

        {rightPanelOpen && <aside className="right-sidebar">
          {rightPanelMode === "inspector" && selectedNode ? <>
            <div className="inspector-header"><div><span className="sidebar-label">INSPECTOR</span><h2>Component details</h2></div><button className="icon-button" onClick={() => setRightPanelOpen(false)} aria-label="Close inspector">×</button></div>
            <div className="inspector-card"><div className={`inspector-kind-icon ${kindMeta[selectedNode.data.kind].className}`}>{kindMeta[selectedNode.data.kind].icon}</div><div><span className="node-kind">{kindMeta[selectedNode.data.kind].label}</span><strong>{selectedNode.data.label}</strong></div><button className="more-button" aria-label="Delete component" title="Delete component" onClick={removeSelectedNode}>×</button></div>
            <label className="field-label" htmlFor="node-name">Name</label><input id="node-name" className="text-field" value={selectedNode.data.label} onFocus={() => recordHistory()} onChange={(event) => updateSelected("label", event.target.value)} maxLength={80} />
            <label className="field-label spaced" htmlFor="node-description">Description</label><textarea id="node-description" className="text-field textarea" value={selectedNode.data.description} onFocus={() => recordHistory()} onChange={(event) => updateSelected("description", event.target.value)} placeholder="What does this component do?" maxLength={280} />
            <div className="field-label spaced">Component color</div><div className="swatch-row">{["#ffffff", "#e8efff", "#e2f4ee", "#fff0db", "#f7e8fa"].map((color) => <button key={color} aria-label={`Set component color ${color}`} className={`color-swatch ${selectedNode.data.color === color ? "picked" : ""}`} style={{ background: color }} onClick={() => { recordHistory(); updateSelected("color", color); }} />)}<label className="custom-color"><span>＋</span><input type="color" aria-label="Custom component color" value={selectedNode.data.color} onFocus={() => recordHistory()} onChange={(event) => updateSelected("color", event.target.value)} /></label></div>
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
                ? { type: MarkerType.ArrowClosed, color: nextStyle.stroke }
                : { ...(selectedEdge.markerEnd ?? { type: MarkerType.ArrowClosed }), color: nextStyle.stroke };
              updateSelectedEdge({ data: nextData, style: nextStyle, animated: nextKind ? connectionMeta[nextKind].animated : false, markerEnd });
            }}>
              <option value="custom">Custom</option><option value="request">HTTPS request</option><option value="data">Data flow</option><option value="event">Event publish</option>
            </select>
            <div className="field-label spaced">Line color</div>
            <div className="edge-color-control"><input type="color" aria-label="Connection line color" value={typeof selectedEdge.style?.stroke === "string" ? selectedEdge.style.stroke : "#8290a6"} onFocus={() => recordHistory()} onChange={(event) => {
              const color = event.target.value;
              const currentMarker = selectedEdge.markerEnd;
              const markerEnd = typeof currentMarker === "string" ? { type: MarkerType.ArrowClosed, color } : currentMarker ? { ...currentMarker, color } : { type: MarkerType.ArrowClosed, color };
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
            <div className="tips-card"><span className="tips-icon">✦</span><div><strong>Quick tip</strong><p>Double-click empty canvas to add a component where you point, and right-click any component, arrow, or empty space for quick actions. Press Ctrl/⌘ K for the command palette. Select components and use Arrow keys to nudge, Ctrl/⌘ C, V, D to copy, paste, or duplicate, and Ctrl/⌘ Z to undo. Pan with a two-finger scroll, Space + drag, or the middle/right mouse button. Select an arrow and click + to add a bend, then drag the bend handle to route it.</p></div></div>
          </>}
          <div className="right-footer"><span>Built for the way systems work</span><button className="footer-command" onClick={() => { setCommandQuery(""); setCommandIndex(0); setCommandOpen(true); }} title="Open command palette">⌘ K</button></div>
        </aside>}
      </div>
      {transferPrompt && <div className="account-dialog-backdrop" role="presentation">
        <section className="account-dialog transfer-dialog" role="dialog" aria-modal="true" aria-labelledby="transfer-dialog-title">
          <span className="account-dialog-mark">☁</span>
          <h2 id="transfer-dialog-title">Copy your local canvases to your account?</h2>
          <p>{transferPrompt.documents.length} canvas{transferPrompt.documents.length === 1 ? "" : "es"} from this browser will be copied so you can open them on other devices. The local originals stay here. If an account canvas has the same id but different edits, both versions will be kept as separate canvases for you to review.</p>
          <div className="transfer-dialog-actions"><button className="transfer-later-button" onClick={dismissGuestTransferPrompt}>Not now</button><button className="account-dialog-submit" onClick={() => void transferGuestCanvases()}>Copy {transferPrompt.documents.length} canvas{transferPrompt.documents.length === 1 ? "" : "es"}</button></div>
        </section>
      </div>}
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
      {commandOpen && <div className="command-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setCommandOpen(false); }}>
        <div className="command-palette" role="dialog" aria-modal="true" aria-label="Command palette" onMouseDown={(event) => event.stopPropagation()}>
          <input autoFocus className="command-input" placeholder="Search components, canvases, and actions…" value={commandQuery} onChange={(event) => { setCommandQuery(event.target.value); setCommandIndex(0); }} onKeyDown={(event) => {
            if (event.key === "ArrowDown") { event.preventDefault(); setCommandIndex((index) => Math.min(index + 1, Math.max(filteredCommands.length - 1, 0))); }
            else if (event.key === "ArrowUp") { event.preventDefault(); setCommandIndex((index) => Math.max(index - 1, 0)); }
            else if (event.key === "Enter") { event.preventDefault(); const command = filteredCommands[activeCommandIndex]; if (command) runCommand(command.id); setCommandOpen(false); }
            else if (event.key === "Escape") { event.preventDefault(); setCommandOpen(false); }
          }} />
          <div className="command-list">
            {filteredCommands.map((command, index) => <button key={command.id} className={`command-item ${index === activeCommandIndex ? "is-active" : ""}`} onMouseEnter={() => setCommandIndex(index)} onClick={() => { runCommand(command.id); setCommandOpen(false); }}><span className="command-icon">{command.icon}</span><span className="command-title">{command.title}</span><span className="command-hint">{command.hint}</span></button>)}
            {!filteredCommands.length && <p className="command-empty">No matching commands</p>}
          </div>
        </div>
      </div>}
      {accountDialogOpen && <AccountDialog onClose={() => setAccountDialogOpen(false)} onSuccess={() => setAccountDialogOpen(false)} />}
      {deleteTarget && <ConfirmCanvasDeleteDialog title={deleteTarget.title} scope={deleteTarget.scope} busy={deleteBusy} error={deleteError} onCancel={() => { if (!deleteBusy) { setDeleteTarget(null); setDeleteError(""); } }} onConfirm={() => void confirmCanvasDelete()} />}
      {toast && <div className="toast"><span>✓</span>{toast}</div>}
      {saveState === "error" && <div className="storage-warning"><strong>Local saving is unavailable.</strong> Your browser may be blocking site storage. Export a JSON backup before leaving.</div>}
    </main>
  );
}

export default function Studio() {
  return <ReactFlowProvider><StudioContent /></ReactFlowProvider>;
}
