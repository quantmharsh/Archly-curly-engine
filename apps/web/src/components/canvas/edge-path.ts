import type { EdgeWaypoint } from "@/lib/canvas-config";

// Pure geometry for edges that carry user-placed bend points.

export function getWaypointEdgePath(source: EdgeWaypoint, target: EdgeWaypoint, waypoints: EdgeWaypoint[]) {
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

// For manually routed edges the label is anchored to the midpoint of the actual
// route, so it follows dragged bends and endpoint movement instead of staying on
// the default path. Falls back to the default route's label position when the
// edge has no bend points.
export function getRouteMidpoint(source: EdgeWaypoint, target: EdgeWaypoint, waypoints: EdgeWaypoint[], fallback: EdgeWaypoint): EdgeWaypoint {
  if (!waypoints.length) return fallback;
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
  return fallback;
}
