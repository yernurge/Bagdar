import { ApiError } from '../api-error'
import type { DialogRequest, DialogResponse, EventRequest, QrResponse, RouteResponse, SceneResponse } from '../types'
import { mockConfig, mockDetail, mockRoutes, mockScene, mockSummaries } from './data'

const wait = (ms = 280) => new Promise((resolve) => window.setTimeout(resolve, ms))

function detectedLang(text: string): string {
  if (/\b(where|show|send|history|walk)\b/i.test(text)) return 'en'
  if (/[әғқңөұүһі]/i.test(text)) return 'kk'
  return 'ru'
}

function spoken(lang: string, ru: string, kk: string, en: string): string {
  return lang === 'kk' ? kk : lang === 'en' ? en : ru
}

function resolvePlaceId(text: string): number {
  const input = text.toLowerCase()
  if (/амфитеатр|amphitheater|амфитеатр/.test(input)) return 1
  if (/смотров|viewpoint|көрініс/.test(input)) return 3
  if (/флаг|flagpole|ту тұғыры/.test(input)) return 8
  if (/детск|playground|балалар/.test(input)) return 9
  return 2
}

export const mockApi = {
  async getConfig() {
    await wait(120)
    return mockConfig
  },

  async getPlaces(lang: string) {
    await wait(180)
    return { places: mockSummaries(lang), total: mockSummaries(lang).length, lang }
  },

  async getPlace(id: number, lang: string) {
    await wait()
    const place = mockDetail(id, lang)
    if (!place) throw new ApiError(404, 'PLACE_NOT_FOUND', 'Место не найдено')
    return place
  },

  async getRoute(id: number, _mode: 'walk' | 'transit', fallback = false, lang = 'ru'): Promise<RouteResponse> {
    await wait(360)
    const route = mockRoutes[id]
    if (!route) throw new ApiError(404, 'PLACE_NOT_FOUND', 'Место не найдено')
    const direction = lang === 'kk'
      ? ['солтүстік-батысқа қарай жүріңіз', 'солтүстік-батысқа қарай жүріңіз', 'батысқа қарай жүріңіз', 'солтүстікке қарай жүріңіз', 'солтүстік-батысқа қарай жүріңіз', 'солтүстікке қарай жүріңіз', 'солтүстікке қарай жүріңіз', 'шығысқа қарай жүріңіз', 'солтүстік-шығысқа қарай жүріңіз', 'шығысқа қарай жүріңіз'][id - 1]
      : lang === 'en'
        ? ['head northwest', 'head northwest', 'head west', 'head north', 'head northwest', 'head north', 'head north', 'head east', 'head northeast', 'head east'][id - 1]
        : route.direction_text
    const instruction = lang === 'kk' ? 'Жағалау бойымен жүріңіз' : lang === 'en' ? 'Follow the promenade' : 'Следуйте по набережной'
    const localized = { ...route, direction_text: direction, steps: route.steps.map((step) => ({ ...step, instruction })) }
    return fallback ? { ...localized, is_approximate: true } : localized
  },

  async dialogTurn(payload: DialogRequest): Promise<DialogResponse> {
    await wait(620)
    const text = payload.text?.trim() ?? ''
    if (!text) throw new ApiError(422, 'SPEECH_UNRECOGNIZED', 'Не удалось распознать речь', { stage: 'stt' })

    const lang = detectedLang(text)
    const normalized = text.toLowerCase()
    const placeId = payload.context.last_place_id ?? resolvePlaceId(text)

    if (/(?:^|[\s,.!?])(?:спасибо|пока|до свидания|thank you|thanks|bye|рахмет|сау бол)(?:$|[\s,.!?])/.test(normalized)) {
      return {
        lang,
        say: spoken(lang, 'Спасибо за прогулку. До встречи у Каспия.', 'Серуенге рақмет. Каспий жағасында кездескенше.', 'Thank you for exploring. See you by the Caspian.'),
        intent: 'goodbye', place_id: null, actions: [{ show: 'sleep' }], suggestions: [], memory_patch: {}, debug: { stt_text: text, via: 'rules' },
      }
    }

    if (/телефон|qr|send|phone|жіб|телефонға/.test(normalized)) {
      return {
        lang,
        say: spoken(lang, 'Сканируйте — маршрут откроется на телефоне.', 'Сканерлеңіз — бағыт телефоныңызда ашылады.', 'Scan the code to open the route on your phone.'),
        intent: 'share_route', place_id: placeId, actions: [{ show: 'qr', place_id: placeId }], suggestions: [], memory_patch: {}, debug: { stt_text: text, via: 'rules' },
      }
    }

    if (/истор|как было|раньше|history|before|тарих|бұрын/.test(normalized)) {
      return {
        lang,
        say: spoken(lang, 'Показываю, как менялся берег Каспия.', 'Каспий жағалауының қалай өзгергенін көрсетемін.', 'Here is how the Caspian coast has changed.'),
        intent: 'scene_info', place_id: 2, actions: [{ show: 'scene', place_id: 2 }], suggestions: [], memory_patch: { places: [2] }, debug: { stt_text: text, via: 'rules' },
      }
    }

    if (/рядом|посмотреть|near|nearby|what to see|жақын|көр/.test(normalized)) {
      const places = mockSummaries(lang).slice(0, 3)
      return {
        lang,
        say: spoken(lang, 'Рядом амфитеатр, набережная и смотровая площадка. Назовите место.', 'Жақын жерде амфитеатр, жағалау және көрініс алаңы бар. Орынды атаңыз.', 'Nearby are the amphitheater, promenade and viewpoint. Name a place.'),
        intent: 'search', place_id: null, actions: [{ show: 'map' }], suggestions: places.map(({ id, name }) => ({ id, name })), memory_patch: {}, debug: { stt_text: text, via: 'rules' },
      }
    }

    if (/где|пройти|маршрут|покажи|where|route|walk|show|қайда|қалай|көрсет/.test(normalized)) {
      const place = mockDetail(placeId, lang)
      return {
        lang,
        say: spoken(lang, `Показываю маршрут к месту «${place?.name ?? 'Набережная'}».`, `«${place?.name ?? 'Жағалау'}» бағытын көрсетемін.`, `Showing the route to ${place?.name ?? 'the promenade'}.`),
        intent: 'route_to_place', place_id: placeId, actions: [{ show: 'route', place_id: placeId }], suggestions: [], memory_patch: { places: [placeId] }, debug: { stt_text: text, via: 'rules' },
      }
    }

    if (/дальше|назад|середин|forward|back|middle|алға|артқа|ортасы/.test(normalized) && payload.context.screen === 'tarihsky') {
      return {
        lang,
        say: spoken(lang, 'Продолжаю показ.', 'Көрсетілімді жалғастырамын.', 'Continuing the story.'),
        intent: 'scene_control', place_id: placeId, actions: [], suggestions: [], memory_patch: {}, debug: { stt_text: text, via: 'rules' },
      }
    }

    throw new ApiError(422, 'SPEECH_UNRECOGNIZED', 'Не удалось понять запрос', { stage: 'intent' })
  },

  async getScene(id: number, _lang = 'ru'): Promise<SceneResponse> {
    await wait(360)
    if (id !== mockScene.place_id) throw new ApiError(404, 'PLACE_NOT_FOUND', 'Истории пока нет')
    return mockScene
  },

  async createQr(placeId: number): Promise<QrResponse> {
    await wait(260)
    if (!mockDetail(placeId, 'ru')) throw new ApiError(404, 'PLACE_NOT_FOUND', 'Место не найдено')
    return { url: `https://bagdar.example/r/demo-${placeId}`, payload_version: 1, expires_in_sec: 3600 }
  },

  async postEvent(_payload: EventRequest) {
    await wait(40)
    return { ok: true as const }
  },

  async endSession(_sessionId: string) {
    await wait(80)
    return { ok: true as const }
  },
}
