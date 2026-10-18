import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, useReactFlow, type EdgeProps } from "@xyflow/react";
import { useContext, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { customConnectionStyle, connectionStyle, type FlowEdge, type FlowNode } from "@/lib/canvas-config";
import { EdgeEditorContext, HistoryContext } from "@/components/canvas/contexts";
import { getRouteMidpoint, getWaypointEdgePath } from "@/components/canvas/edge-path";

// The arrow drawn between two components: its label, and the draggable bend
// points that let a user reshape the route. Bend points are optional graph data
// (edge `data.waypoints`) and persist with the diagram.
export function DraggableEdge({
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
  const labelPosition = getRouteMidpoint(source, target, waypoints, { x: defaultLabelX, y: defaultLabelY });
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
    }
  }, [editingLabel]);

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
