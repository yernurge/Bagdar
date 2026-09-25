export type Language = 'kk' | 'ru' | 'en' | string

export type KioskPhase =
  | 'idle'
  | 'catalog'
  | 'card'
  | 'recording'
  | 'processing'
  | 'error_speech'
  | 'tarihsky'
  | 'qr'

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
  access: 'walk' | 'transit'
}

export interface PlacesResponse {
  places: PlaceSummary[]
  total: number
  lang: string
}

export interface PlaceDetail extends PlaceSummary {
  description: string
  address: string
  photos: string[]
  is_open_now: boolean
  opens_next: string | null
  langs: string[]
}

export interface RouteStep {
  instruction: string
  distance_m: number
}

export interface RouteResponse {
  place_id: number
  mode: 'walk' | 'transit'
  distance_m: number
  duration_min: number
  bearing_deg: number
  direction_text: string
  is_approximate: boolean
  geometry: { type: 'LineString'; coordinates: [number, number][] }
  steps: RouteStep[]
}

export interface SceneResponse {
  place_id: number
  enabled: boolean
  modern_url: string
  historic_url: string
  attribution: string
  texts: Record<string, { title: string; body: string }>
  sources: string[]
}

export type DialogShow = 'map' | 'route' | 'scene' | 'qr' | 'sleep'

export interface DialogAction {
  show: DialogShow
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
  debug: { stt_text?: string; via: string }
}

export interface DialogRequest {
  session_id: string
  lang: 'auto' | string
  audio_b64?: string
  mime?: string
  text?: string
  signs?: { hand: string; landmarks: (number[] | string)[] }[]
  context: { screen: string; last_place_id: number | null }
}

export interface QrResponse {
  url: string
  payload_version: number
  expires_in_sec: number
}

export interface ApiErrorBody {
  error: { code: string; message: string; lang: string; details: Record<string, unknown> }
}

export interface EventRequest {
  session_id: string
  type: 'place_view' | 'route_click' | 'scene_open' | 'session_start'
  place_id?: number | null
  lang: string
}

export interface SpeechRecognitionResultLike {
  transcript: string
  final: boolean
}
