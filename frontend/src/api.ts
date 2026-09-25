import { ApiError, isApiErrorBody } from './api-error'
import { mockApi } from './mocks/api'
import type {
  Config,
  DialogRequest,
  DialogResponse,
  EventRequest,
  PlaceDetail,
  PlacesResponse,
  QrResponse,
  RouteResponse,
  SceneResponse,
} from './types'

const BASE_URL = '/api'
export const isMockMode = import.meta.env.VITE_USE_MOCKS !== 'false'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    })
  } catch {
    throw new ApiError(0, 'NETWORK_UNAVAILABLE', 'Нет соединения с сервером')
  }

  const body = await response.json().catch(() => null) as unknown
  if (!response.ok) {
    if (isApiErrorBody(body)) {
      throw new ApiError(response.status, body.error.code, body.error.message, body.error.details)
    }
    throw new ApiError(response.status, 'INTERNAL', 'Не удалось выполнить запрос')
  }
  return body as T
}

export const api = {
  getConfig: (lang = 'ru'): Promise<Config> => isMockMode ? mockApi.getConfig() : request(`/config?lang=${encodeURIComponent(lang)}`),

  getPlaces: (lang: string): Promise<PlacesResponse> =>
    isMockMode ? mockApi.getPlaces(lang) : request(`/places?lang=${encodeURIComponent(lang)}`),

  getPlace: (id: number, lang: string): Promise<PlaceDetail> =>
    isMockMode ? mockApi.getPlace(id, lang) : request(`/places/${id}?lang=${encodeURIComponent(lang)}`),

  getRoute: (id: number, mode: 'walk' | 'transit', fallback = false, lang = 'ru'): Promise<RouteResponse> =>
    isMockMode
      ? mockApi.getRoute(id, mode, fallback, lang)
      : request(`/places/${id}/route?mode=${mode}&fallback=${fallback ? 1 : 0}&lang=${encodeURIComponent(lang)}`),

  dialogTurn: (payload: DialogRequest): Promise<DialogResponse> =>
    isMockMode ? mockApi.dialogTurn(payload) : request('/dialog/turn', { method: 'POST', body: JSON.stringify(payload) }),

  getScene: (id: number, lang: string): Promise<SceneResponse> =>
    isMockMode ? mockApi.getScene(id, lang) : request(`/places/${id}/scene?lang=${encodeURIComponent(lang)}`),

  createQr: (placeId: number, lang: string, sessionId: string): Promise<QrResponse> =>
    isMockMode
      ? mockApi.createQr(placeId)
      : request('/qr', { method: 'POST', body: JSON.stringify({ place_id: placeId, lang, session_id: sessionId }) }),

  postEvent: (payload: EventRequest) =>
    isMockMode ? mockApi.postEvent(payload) : request<{ ok: true }>('/event', { method: 'POST', body: JSON.stringify(payload) }),

  endSession: (sessionId: string) =>
    isMockMode ? mockApi.endSession(sessionId) : request<{ ok: true }>('/session/end', { method: 'POST', body: JSON.stringify({ session_id: sessionId }) }),
}
