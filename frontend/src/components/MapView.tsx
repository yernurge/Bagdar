import L, { latLngBounds } from 'leaflet'
import { useEffect, useMemo } from 'react'
import { MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet'
import type { Config, PlaceDetail, PlaceSummary, RouteResponse } from '../types'

interface Props {
  config: Config
  places: PlaceSummary[]
  selected?: PlaceDetail | null
  route?: RouteResponse | null
  compact?: boolean
}

const originIcon = L.divIcon({
  className: 'origin-marker-wrap',
  html: '<div class="origin-marker"><i></i></div>',
  iconSize: [44, 44],
  iconAnchor: [22, 22],
})

function placeIcon(index: number, selected: boolean) {
  return L.divIcon({
    className: 'place-marker-wrap',
    html: `<div class="place-marker ${selected ? 'is-selected' : ''}"><span>${String(index + 1).padStart(2, '0')}</span></div>`,
    iconSize: selected ? [58, 58] : [42, 42],
    iconAnchor: selected ? [29, 29] : [21, 21],
  })
}

function Camera({ config, places, selected, route }: Props) {
  const map = useMap()
  useEffect(() => {
    const routePoints = route?.geometry.coordinates.map(([lng, lat]) => L.latLng(lat, lng)) ?? []
    if (routePoints.length > 1) {
      map.fitBounds(latLngBounds(routePoints), { padding: [90, 90], animate: true, duration: 1.2 })
      return
    }
    if (selected) {
      map.flyTo([selected.lat, selected.lng], 16, { animate: true, duration: 1.2 })
      return
    }
    if (places.length) {
      const bounds = latLngBounds([
        [config.origin.lat, config.origin.lng],
        ...places.map((place) => L.latLng(place.lat, place.lng)),
      ])
      map.fitBounds(bounds, { padding: [70, 70], animate: false, maxZoom: 15 })
    }
  }, [config, map, places, route, selected])
  return null
}

export function MapView(props: Props) {
  const { config, places, selected, route, compact } = props
  const line = useMemo(
    () => route?.geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]) ?? [],
    [route],
  )

  return (
    <div className={`map-shell ${compact ? 'is-compact' : ''}`} aria-label="Карта района Актау">
      <MapContainer
        center={[config.origin.lat, config.origin.lng]}
        zoom={14}
        minZoom={7}
        zoomControl={false}
        attributionControl={false}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        boxZoom={false}
        keyboard={false}
        touchZoom={false}
      >
        <TileLayer
          attribution="© OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[config.origin.lat, config.origin.lng]} icon={originIcon} interactive={false} />
        {places.map((place, index) => (
          <Marker
            key={place.id}
            position={[place.lat, place.lng]}
            icon={placeIcon(index, selected?.id === place.id)}
            interactive={false}
          />
        ))}
        {line.length > 1 && (
          <>
            <Polyline positions={line} pathOptions={{ color: '#f1d29b', weight: 12, opacity: 0.16, lineCap: 'round' }} />
            <Polyline positions={line} pathOptions={{ color: '#f8dcaa', weight: 4, opacity: 0.96, lineCap: 'round' }} />
          </>
        )}
        <Camera {...props} />
      </MapContainer>
      <div className="map-vignette" />
      <div className="map-coordinates">43°39′ N · 51°08′ E</div>
      <div className="map-attribution">© OpenStreetMap</div>
    </div>
  )
}
