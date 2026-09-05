import { useEffect, useMemo, useRef, useState } from 'react'
import {
  DEFAULT_ROAM_PATH,
  type RoadPath,
} from '../data/roads'
import {
  buildRouteMetrics,
  interpolateRoute,
  nearestProgressOnRoute,
  type LatLng,
} from '../lib/geo'

export type { LatLng }

export function useDriveSimulation(options?: {
  baseSpeedKmh?: number
  initialPlaying?: boolean
  path?: RoadPath
}) {
  const baseSpeedKmh = options?.baseSpeedKmh ?? 52
  const [path, setPath] = useState<RoadPath>(
    () => options?.path ?? DEFAULT_ROAM_PATH,
  )

  const { segLens, total } = useMemo(
    () => buildRouteMetrics(path.waypoints),
    [path],
  )

  const [progress, setProgress] = useState(0)
  const [playing, setPlaying] = useState(options?.initialPlaying ?? false)
  const [speedMul, setSpeedMul] = useState(1)
  const lastTs = useRef<number | null>(null)

  // When the path changes, restart at the beginning of the new road ribbon.
  useEffect(() => {
    setProgress(0)
    setPlaying(false)
    lastTs.current = null
  }, [path.id])

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
          // Soft end: arrive and pause, but do not imply a fixed tour product.
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
    () => interpolateRoute(path.waypoints, segLens, total, progress),
    [path.waypoints, progress, segLens, total],
  )

  const distanceKm = total * progress
  const remainingKm = Math.max(0, total - distanceKm)

  const jumpToLatLng = (target: LatLng) => {
    const p = nearestProgressOnRoute(path.waypoints, segLens, total, target)
    setProgress(p)
  }

  return {
    path,
    setPath,
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
    jumpToLatLng,
    toggle: () => setPlaying((p) => !p),
    reset: () => {
      setPlaying(false)
      setProgress(0)
    },
  }
}
