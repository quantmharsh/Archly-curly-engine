import { Handle, Position, useReactFlow, type NodeProps } from "@xyflow/react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { HANDLE_LEFT, HANDLE_RIGHT, kindMeta, type FlowEdge, type FlowNode } from "@/lib/canvas-config";

// The component card drawn on the canvas. Its shape, tint, and glyph all come
// from the node's `kind`, which is persisted graph data — no React Flow node
// type or schema value changes when a kind or a visual is added.
export function EngineeringNode({ id, data, selected }: NodeProps<FlowNode>) {
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
      {/* Right is declared first so an edge that somehow reaches the canvas
          without a handle id still leaves from the horizontal side. Edges from
          older documents are normalised to right/left in normalizeStoredEdges,
          because with every handle being a source the library's own fallback
          would otherwise pick the right side for both ends. */}
      <Handle type="source" id={HANDLE_RIGHT} position={Position.Right} />
      <Handle type="source" id="top" position={Position.Top} />
      <Handle type="source" id="bottom" position={Position.Bottom} />
      <Handle type="source" id={HANDLE_LEFT} position={Position.Left} />
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
