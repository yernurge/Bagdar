export type Language = 'kk' | 'ru' | 'en' | string
export type AccessMode = 'walk' | 'transit'
export type Screen = 'sleep' | 'idle' | 'catalog' | 'card' | 'recording' | 'processing' | 'error_speech' | 'tarihsky' | 'qr'
export type EventType = 'place_view' | 'route_click' | 'scene_open' | 'session_start'

export interface Config {
  screen_id: string
  origin: { lat: number; lng: number; heading_deg: number }
  languages: string[]
  default_lang: string
  modes: { voice: boolean; tarihsky: boolean; qr: boolean; huskylens: boolean }
  session: { idle_timeout_sec: number; qr_timeout_sec: number }
  district: string
  categories: string[]
}

export interface PlaceSummary {
  id: number
  name: string
  summary: string
  category: string
  lat: number
  lng: number
  thumb_url: string
  has_scene: boolean
  hours: string | null
  access: AccessMode
}

export interface PlacesResponse {
  places: PlaceSummary[]
  total: number
  lang: string
}

export interface Place {
  id: number
  name: string
  summary: string
  description: string
  category: string
  lat: number
  lng: number
  address: string
  photos: string[]
  hours: string | null
  is_open_now: boolean
  opens_next: string | null
  has_scene: boolean
  access: AccessMode
  langs: string[]
}

export interface Route {
  place_id: number
  mode: AccessMode
  distance_m: number
  duration_min: number
  bearing_deg: number
  direction_text: string
  is_approximate: boolean
  geometry: { type: 'LineString'; coordinates: [number, number][] }
  steps: { instruction: string; distance_m: number }[]
}

export type DialogAction = {
  show: 'map' | 'route' | 'scene' | 'qr' | 'sleep'
  place_id?: number
}

export interface DialogResponse {
  lang: string
  say: string
  intent: string
  place_id: number | null
  actions: DialogAction[]
  suggestions: { id: number; name: string }[]
  memory_patch: Record<string, unknown>
  debug?: { stt_text?: string; via?: string }
}

export interface Scene {
  place_id: number
  enabled: boolean
  modern_url: string
  historic_url: string
  attribution: string
  texts: Record<string, { title: string; body: string }>
  sources: string[]
}

export interface QrResponse {
  url: string
  payload_version: number
  expires_in_sec: number
}

export interface ApiErrorPayload {
  error: { code: string; message: string; lang?: string; details?: Record<string, unknown> }
}

export interface VoiceTurn {
  text?: string
  audio_b64?: string
  mime?: string
}

export interface BagdarApi {
  config(): Promise<Config>
  places(lang: string): Promise<PlacesResponse>
  place(id: number, lang: string): Promise<Place>
  route(id: number, mode: AccessMode, fallback?: boolean): Promise<Route>
  dialog(sessionId: string, turn: VoiceTurn, screen: string, lastPlaceId: number | null): Promise<DialogResponse>
  scene(id: number): Promise<Scene>
  qr(placeId: number, lang: string, sessionId: string): Promise<QrResponse>
  event(sessionId: string, type: EventType, lang: string, placeId?: number | null): Promise<{ ok: true }>
  endSession(sessionId: string): Promise<{ ok: true }>
}
