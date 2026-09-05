export type LatLng = { lat: number; lng: number }

export function haversineKm(a: LatLng, b: LatLng) {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function bearingDegrees(a: LatLng, b: LatLng) {
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const y = Math.sin(dLng) * Math.cos(lat2)
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

/** Smallest signed angle from `fromDeg` to `toDeg` in (-180, 180]. */
export function angleDeltaDegrees(fromDeg: number, toDeg: number) {
  return ((toDeg - fromDeg + 540) % 360) - 180
}

export function absoluteAngleDelta(fromDeg: number, toDeg: number) {
  return Math.abs(angleDeltaDegrees(fromDeg, toDeg))
}

export function buildRouteMetrics(waypoints: LatLng[]) {
  const segLens: number[] = []
  let total = 0
  for (let i = 0; i < waypoints.length - 1; i++) {
    const len = haversineKm(waypoints[i], waypoints[i + 1])
    segLens.push(len)
    total += len
  }
  return { segLens, total }
}

export function interpolateRoute(
  waypoints: LatLng[],
  segLens: number[],
  total: number,
  progress: number,
): LatLng & { bearing: number } {
  const p = Math.min(1, Math.max(0, progress))
  if (waypoints.length === 0) return { lat: 0, lng: 0, bearing: 0 }
  if (p <= 0) {
    const bearing =
      waypoints.length > 1 ? bearingDegrees(waypoints[0], waypoints[1]) : 0
    return { ...waypoints[0], bearing }
  }
  if (p >= 1) {
    const a = waypoints[waypoints.length - 2] ?? waypoints[0]
    const b = waypoints[waypoints.length - 1]
    return { ...b, bearing: bearingDegrees(a, b) }
  }

  let remain = total * p
  for (let i = 0; i < segLens.length; i++) {
    const len = segLens[i]
    if (remain > len) {
      remain -= len
      continue
    }
    const t = len === 0 ? 0 : remain / len
    const a = waypoints[i]
    const b = waypoints[i + 1]
    return {
      lat: a.lat + (b.lat - a.lat) * t,
      lng: a.lng + (b.lng - a.lng) * t,
      bearing: bearingDegrees(a, b),
    }
  }
  return { ...waypoints[waypoints.length - 1], bearing: 0 }
}

/** Progress (0–1) of the nearest point on a polyline to `target`. */
export function nearestProgressOnRoute(
  waypoints: LatLng[],
  segLens: number[],
  total: number,
  target: LatLng,
) {
  if (total <= 0 || waypoints.length < 2) return 0
  let bestDist = Infinity
  let bestProgress = 0
  let traveled = 0

  for (let i = 0; i < segLens.length; i++) {
    const a = waypoints[i]
    const b = waypoints[i + 1]
    const len = segLens[i]
    // Project target onto segment AB in lat/lng space (good enough locally).
    const abLat = b.lat - a.lat
    const abLng = b.lng - a.lng
    const ab2 = abLat * abLat + abLng * abLng
    const t =
      ab2 === 0
        ? 0
        : Math.min(
            1,
            Math.max(
              0,
              ((target.lat - a.lat) * abLat + (target.lng - a.lng) * abLng) / ab2,
            ),
          )
    const proj = { lat: a.lat + abLat * t, lng: a.lng + abLng * t }
    const d = haversineKm(target, proj)
    if (d < bestDist) {
      bestDist = d
      bestProgress = (traveled + len * t) / total
    }
    traveled += len
  }
  return bestProgress
}

export type VisionConeOptions = {
  /** Max distance ahead to consider (km). */
  maxDistKm?: number
  /** Ignore spots basically under the car. */
  minDistKm?: number
  /** Half-angle of the forward cone in degrees. */
  halfAngleDeg?: number
}

export function describeRelativeToCar(
  car: LatLng,
  bearing: number,
  spot: LatLng,
  options?: VisionConeOptions,
) {
  const maxDistKm = options?.maxDistKm ?? 1.2
  const minDistKm = options?.minDistKm ?? 0.03
  const halfAngleDeg = options?.halfAngleDeg ?? 42
  const distanceKm = haversineKm(car, spot)
  const bearingToSpot = bearingDegrees(car, spot)
  const angleDeg = absoluteAngleDelta(bearing, bearingToSpot)
  const ahead = angleDeg <= 90
  const inCone =
    distanceKm >= minDistKm &&
    distanceKm <= maxDistKm &&
    angleDeg <= halfAngleDeg
  return { distanceKm, bearingToSpot, angleDeg, ahead, inCone }
}
