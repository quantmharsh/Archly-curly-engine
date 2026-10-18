import { useCallback, useRef } from "react";
import { GRID_STEP, MAX_ZOOM, MIN_ZOOM, type Viewport } from "@/lib/canvas-config";

type Point = { x: number; y: number };

// Owns the canvas element ref and every conversion between screen coordinates
// and canvas coordinates. The ref must stay a single shared object: fullscreen
// identity checks, viewport centring, menu placement, and drop handling all
// compare or read the same element.
export function useCanvasGeometry(
  screenToFlowPosition: (position: Point) => Point,
  getViewport: () => Viewport,
  setFlowViewport: (viewport: Viewport, options?: { duration?: number }) => unknown,
) {
  const flowRef = useRef<HTMLDivElement>(null);

  const snapToGridPoint = (point: Point) => ({
    x: Math.round(point.x / GRID_STEP) * GRID_STEP,
    y: Math.round(point.y / GRID_STEP) * GRID_STEP,
  });

  const viewportCenterFlow = () => {
    const rect = flowRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return screenToFlowPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  };

  const localMenuPoint = (clientX: number, clientY: number) => {
    const rect = flowRef.current?.getBoundingClientRect();
    if (!rect) return { left: clientX, top: clientY };
    return { left: clientX - rect.left, top: clientY - rect.top };
  };

  const zoomByPointer = useCallback((factor: number, clientX: number, clientY: number) => {
    const rect = flowRef.current?.getBoundingClientRect();
    if (!rect) return;
    const current = getViewport();
    const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current.zoom * factor));
    if (nextZoom === current.zoom) return;
    const point = screenToFlowPosition({ x: clientX, y: clientY });
    setFlowViewport({
      x: clientX - rect.left - point.x * nextZoom,
      y: clientY - rect.top - point.y * nextZoom,
      zoom: nextZoom,
    }, { duration: 0 });
  }, [getViewport, screenToFlowPosition, setFlowViewport]);

  return { flowRef, snapToGridPoint, viewportCenterFlow, localMenuPoint, zoomByPointer };
}
