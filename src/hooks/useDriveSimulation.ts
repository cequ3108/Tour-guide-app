import { useEffect, useMemo, useRef, useState } from 'react'
import { ROUTE_WAYPOINTS } from '../data/route'

export type LatLng = { lat: number; lng: number }

function haversineKm(a: LatLng, b: LatLng) {
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

function buildRouteMetrics(waypoints: LatLng[]) {
  const segLens: number[] = []
  let total = 0
  for (let i = 0; i < waypoints.length - 1; i++) {
    const len = haversineKm(waypoints[i], waypoints[i + 1])
    segLens.push(len)
    total += len
  }
  return { segLens, total }
}

function interpolateRoute(
  waypoints: LatLng[],
  segLens: number[],
  total: number,
  progress: number,
): LatLng & { bearing: number } {
  const p = Math.min(1, Math.max(0, progress))
  if (p <= 0) {
    return { ...waypoints[0], bearing: 180 }
  }
  if (p >= 1) {
    const a = waypoints[waypoints.length - 2]
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
  return { ...waypoints[waypoints.length - 1], bearing: 180 }
}

function bearingDegrees(a: LatLng, b: LatLng) {
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const y = Math.sin(dLng) * Math.cos(lat2)
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

export function useDriveSimulation(options?: {
  baseSpeedKmh?: number
  initialPlaying?: boolean
}) {
  const baseSpeedKmh = options?.baseSpeedKmh ?? 72
  const { segLens, total } = useMemo(
    () => buildRouteMetrics(ROUTE_WAYPOINTS),
    [],
  )

  const [progress, setProgress] = useState(0)
  const [playing, setPlaying] = useState(options?.initialPlaying ?? false)
  const [speedMul, setSpeedMul] = useState(1)
  const lastTs = useRef<number | null>(null)

  useEffect(() => {
    if (!playing) {
      lastTs.current = null
      return
    }
    let raf = 0
    const tick = (ts: number) => {
      if (lastTs.current == null) lastTs.current = ts
      const dt = (ts - lastTs.current) / 1000
      lastTs.current = ts
      const kmPerSec = (baseSpeedKmh * speedMul) / 3600
      const delta = total === 0 ? 0 : (kmPerSec * dt) / total
      setProgress((prev) => {
        const next = prev + delta
        if (next >= 1) {
          setPlaying(false)
          return 1
        }
        return next
      })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, speedMul, baseSpeedKmh, total])

  const position = useMemo(
    () => interpolateRoute(ROUTE_WAYPOINTS, segLens, total, progress),
    [progress, segLens, total],
  )

  const distanceKm = total * progress
  const remainingKm = Math.max(0, total - distanceKm)

  return {
    progress,
    setProgress,
    playing,
    setPlaying,
    speedMul,
    setSpeedMul,
    position,
    totalKm: total,
    distanceKm,
    remainingKm,
    toggle: () => setPlaying((p) => !p),
    reset: () => {
      setPlaying(false)
      setProgress(0)
    },
  }
}
