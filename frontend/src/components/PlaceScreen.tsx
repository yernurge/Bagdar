import type { Copy } from '../i18n'
import type { Config, PlaceDetail, PlaceSummary, RouteResponse } from '../types'
import { MapView } from './MapView'

interface Props {
  config: Config
  places: PlaceSummary[]
  place: PlaceDetail
  route: RouteResponse
  copy: Copy
}

function formatDistance(value: number) {
  return value >= 1000 ? `${(value / 1000).toFixed(1)} км` : `${value} м`
}

export function PlaceScreen({ config, places, place, route, copy }: Props) {
  const arrowRotation = route.bearing_deg - config.origin.heading_deg
  const hoursText = place.hours === null
    ? copy.always
    : place.is_open_now
      ? place.hours
      : `${copy.closed}${place.opens_next ? ` · ${place.opens_next}` : ''}`

  return (
    <main className="place-screen screen-enter">
      <div className="place-photo" style={{ backgroundImage: `url(${place.photos[0] || place.thumb_url})` }}>
        <div className="photo-shade" />
        <div className="photo-label"><span>{place.category}</span><b>0{place.id}</b></div>
        <section className="place-copy">
          <span className={`open-state ${place.is_open_now ? '' : 'is-closed'}`}>{hoursText}</span>
          <h1>{place.name}</h1>
          <p>{place.description}</p>
          <small>{place.address}</small>
        </section>
      </div>
      <section className="route-pane">
        <MapView config={config} places={places} selected={place} route={route} compact />
        <div className="route-glass glass-panel">
          <div className="route-topline">
            <span>{route.mode === 'transit' ? copy.transit : copy.walk}</span>
            {route.is_approximate && <strong>{copy.approximate}</strong>}
          </div>
          <div className="route-metrics">
            <div><b>{formatDistance(route.distance_m)}</b><span>{copy.distance}</span></div>
            <i />
            <div><b>{route.duration_min} мин</b><span>{copy.duration}</span></div>
          </div>
          <div className="direction-row">
            <div className="direction-compass">
              <span style={{ transform: `rotate(${arrowRotation}deg)` }}>
                <svg viewBox="0 0 54 54" aria-hidden="true"><path d="m27 5 9.5 38L27 36l-9.5 7Z" /></svg>
              </span>
            </div>
            <div><small>{copy.direction}</small><strong>{route.direction_text}</strong></div>
          </div>
          {route.steps[0] && <div className="route-step">{route.steps[0].instruction}</div>}
        </div>
        <div className="route-prompt">{place.has_scene ? copy.routePrompt : copy.phonePrompt}</div>
      </section>
    </main>
  )
}
