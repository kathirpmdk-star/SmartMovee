export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Minimum distance in meters from point p to any vertex-segment of a polyline.
// Good enough approximation for "is this incident near this route" at city scale.
export function distanceToPolylineMeters(p: [number, number], line: [number, number][]): number {
  let min = Infinity;
  for (let i = 0; i < line.length - 1; i++) {
    const d = distanceToSegmentMeters(p, line[i], line[i + 1]);
    if (d < min) min = d;
  }
  if (line.length === 1) min = haversineMeters(p[0], p[1], line[0][0], line[0][1]);
  return min;
}

function distanceToSegmentMeters(p: [number, number], a: [number, number], b: [number, number]): number {
  // Project in a simple equirectangular approximation (fine at city scale).
  const latRef = (a[0] + b[0]) / 2;
  const mPerDegLat = 111320;
  const mPerDegLon = 111320 * Math.cos((latRef * Math.PI) / 180);

  const toXY = (pt: [number, number]) => [pt[1] * mPerDegLon, pt[0] * mPerDegLat];
  const [px, py] = toXY(p);
  const [ax, ay] = toXY(a);
  const [bx, by] = toXY(b);

  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}
