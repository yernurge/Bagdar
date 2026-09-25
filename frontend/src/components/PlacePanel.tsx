import type { Config, Place, Route } from '../types'
import type { Copy } from '../i18n'

interface Props {
  config: Config
  place: Place
  route: Route
  copy: Copy
}

export function PlacePanel({ config, place, route, copy }: Props) {
  const distance = route.distance_m >= 1000 ? `${(route.distance_m / 1000).toFixed(1)} км` : `${route.distance_m} м`
  const rotation = route.bearing_deg - config.origin.heading_deg

  return (
    <article className="place-panel">
      <figure className="place-panel__media">
        {place.photos[0] && <img src={place.photos[0]} alt="" onError={(event) => { event.currentTarget.style.display = 'none' }} />}
        <figcaption><span>{place.category}</span><span>{String(place.id).padStart(2, '0')}</span></figcaption>
      </figure>
      <div className="place-panel__body">
        <div className="place-panel__eyebrow">{place.address}</div>
        <h1>{place.name}</h1>
        <p className="place-panel__summary">{place.summary || place.description}</p>
      </div>
      <div className="place-panel__facts">
        <div><strong>{distance}</strong><span>{route.mode === 'transit' ? copy.transit : copy.walk}</span></div>
        <div><strong>{Math.round(route.duration_min)} {copy.minutes}</strong><span>{route.direction_text}</span></div>
        <div className="direction">
          <span className="direction__arrow" style={{ transform: `rotate(${rotation}deg)` }}>↑</span>
          <span>{Math.round(route.bearing_deg)}°</span>
        </div>
      </div>
      <div className="place-panel__badges">
        <span>{place.hours === null ? copy.alwaysOpen : place.is_open_now ? place.hours : `${copy.closed}${place.opens_next ? ` · ${place.opens_next}` : ''}`}</span>
        {route.is_approximate && <span className="warning">{copy.approximate}</span>}
      </div>
      {route.steps[0] && <p className="place-panel__step">{route.steps[0].instruction}</p>}
    </article>
  )
}
