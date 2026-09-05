import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { POINTS_OF_INTEREST, ROUTE_WAYPOINTS } from '../data/route'

type Props = {
  lat: number
  lng: number
  bearing: number
  activePoiId: string | null
}

const carIcon = L.divIcon({
  className: 'tuwen-car-icon',
  html: `<div class="tuwen-car"></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
})

export function RouteMap({ lat, lng, bearing, activePoiId }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const carRef = useRef<L.Marker | null>(null)
  const poiLayerRef = useRef<L.LayerGroup | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: true,
      scrollWheelZoom: false,
    }).setView([lat, lng], 11)

    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: 'Tiles &copy; Esri',
        maxZoom: 16,
      },
    ).addTo(map)

    const latlngs = ROUTE_WAYPOINTS.map((w) => [w.lat, w.lng] as [number, number])
    L.polyline(latlngs, {
      color: '#e8b84a',
      weight: 4,
      opacity: 0.85,
      lineCap: 'round',
    }).addTo(map)

    const poiLayer = L.layerGroup().addTo(map)
    poiLayerRef.current = poiLayer

    POINTS_OF_INTEREST.forEach((p) => {
      L.circleMarker([p.lat, p.lng], {
        radius: 7,
        color: '#9fd6b2',
        weight: 2,
        fillColor: '#1f4d36',
        fillOpacity: 0.9,
      })
        .bindTooltip(`${p.name}（${p.county}）`, { direction: 'top' })
        .addTo(poiLayer)
    })

    carRef.current = L.marker([lat, lng], { icon: carIcon, zIndexOffset: 500 }).addTo(map)
    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      carRef.current = null
      poiLayerRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const car = carRef.current
    if (!map || !car) return
    car.setLatLng([lat, lng])
    const el = car.getElement()?.querySelector('.tuwen-car') as HTMLElement | null
    if (el) el.style.transform = `rotate(${bearing}deg)`
    map.panTo([lat, lng], { animate: true, duration: 0.4 })
  }, [lat, lng, bearing])

  useEffect(() => {
    const layer = poiLayerRef.current
    if (!layer) return
    layer.clearLayers()
    POINTS_OF_INTEREST.forEach((p) => {
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

  return <div ref={containerRef} className="route-map" aria-label="模擬路線地圖" />
}
