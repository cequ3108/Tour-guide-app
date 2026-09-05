import { useEffect, useMemo, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { ROAM_MAP_POIS } from '../data/storyCatalog'
import type { RoadPath } from '../data/roads'
import type { LatLng } from '../lib/geo'

type Props = {
  lat: number
  lng: number
  bearing: number
  activePoiId: string | null
  path: RoadPath
  showVisionCone?: boolean
}

const carIcon = L.divIcon({
  className: 'tuwen-car-icon',
  html: `<div class="tuwen-car"></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
})

function destinationPoint(
  origin: LatLng,
  bearingDeg: number,
  distanceKm: number,
): LatLng {
  const R = 6371
  const δ = distanceKm / R
  const θ = (bearingDeg * Math.PI) / 180
  const φ1 = (origin.lat * Math.PI) / 180
  const λ1 = (origin.lng * Math.PI) / 180
  const φ2 = Math.asin(
    Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ),
  )
  const λ2 =
    λ1 +
    Math.atan2(
      Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
      Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2),
    )
  return { lat: (φ2 * 180) / Math.PI, lng: (λ2 * 180) / Math.PI }
}

function buildConeRing(
  origin: LatLng,
  bearing: number,
  rangeKm: number,
  halfAngleDeg: number,
): [number, number][] {
  const points: [number, number][] = [[origin.lat, origin.lng]]
  for (let a = -halfAngleDeg; a <= halfAngleDeg; a += 6) {
    const p = destinationPoint(origin, bearing + a, rangeKm)
    points.push([p.lat, p.lng])
  }
  points.push([origin.lat, origin.lng])
  return points
}

export function RouteMap({
  lat,
  lng,
  bearing,
  activePoiId,
  path,
  showVisionCone = true,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const carRef = useRef<L.Marker | null>(null)
  const poiLayerRef = useRef<L.LayerGroup | null>(null)
  const routeLineRef = useRef<L.Polyline | null>(null)
  const coneRef = useRef<L.Polygon | null>(null)
  const fittedPathId = useRef<string | null>(null)

  const pathLatLngs = useMemo(
    () => path.waypoints.map((w) => [w.lat, w.lng] as [number, number]),
    [path],
  )

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: true,
      scrollWheelZoom: true,
    }).setView([lat, lng], 13)

    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: 'Tiles &copy; Esri',
        maxZoom: 16,
      },
    ).addTo(map)

    routeLineRef.current = L.polyline(pathLatLngs, {
      color: '#e8b84a',
      weight: 4,
      opacity: 0.85,
      lineCap: 'round',
    }).addTo(map)

    poiLayerRef.current = L.layerGroup().addTo(map)
    carRef.current = L.marker([lat, lng], {
      icon: carIcon,
      zIndexOffset: 500,
    }).addTo(map)

    coneRef.current = L.polygon([], {
      color: '#9fd6b2',
      weight: 1,
      opacity: 0.7,
      fillColor: '#9fd6b2',
      fillOpacity: 0.12,
      interactive: false,
    }).addTo(map)

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      carRef.current = null
      poiLayerRef.current = null
      routeLineRef.current = null
      coneRef.current = null
      fittedPathId.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const line = routeLineRef.current
    const map = mapRef.current
    if (!line || !map) return
    line.setLatLngs(pathLatLngs)
    if (pathLatLngs.length > 1 && fittedPathId.current !== path.id) {
      map.fitBounds(line.getBounds().pad(0.1), { animate: false })
      fittedPathId.current = path.id
    }
  }, [path.id, pathLatLngs])

  useEffect(() => {
    const map = mapRef.current
    const car = carRef.current
    const cone = coneRef.current
    if (!map || !car) return
    car.setLatLng([lat, lng])
    const el = car.getElement()?.querySelector('.tuwen-car') as HTMLElement | null
    if (el) el.style.transform = `rotate(${bearing}deg)`
    map.panTo([lat, lng], { animate: true, duration: 0.35 })

    if (cone) {
      if (showVisionCone) {
        cone.setStyle({ opacity: 0.7, fillOpacity: 0.12 })
        cone.setLatLngs(buildConeRing({ lat, lng }, bearing, 1.25, 48))
      } else {
        cone.setLatLngs([])
      }
    }
  }, [lat, lng, bearing, showVisionCone])

  useEffect(() => {
    const layer = poiLayerRef.current
    if (!layer) return
    layer.clearLayers()
    ROAM_MAP_POIS.forEach((p) => {
      const active = p.id === activePoiId
      L.circleMarker([p.lat, p.lng], {
        radius: active ? 11 : 7,
        color: active ? '#e8b84a' : '#9fd6b2',
        weight: active ? 3 : 2,
        fillColor: active ? '#e8b84a' : '#1f4d36',
        fillOpacity: active ? 1 : 0.9,
      })
        .bindTooltip(`${p.name}（${p.county}）`, { direction: 'top' })
        .addTo(layer)
    })
  }, [activePoiId])

  return (
    <div
      ref={containerRef}
      className="route-map"
      aria-label="雲嘉南漫遊地圖（沿實際道路）"
    />
  )
}
