import { ApiError } from '../api-error'
import type { BagdarApi, DialogResponse, EventType, VoiceTurn } from '../types'
import { getMockPlace, getMockPlaces, getMockRoute, mockConfig, mockScenes } from './data'

const delay = (ms = 240) => new Promise((resolve) => window.setTimeout(resolve, ms))
let currentLang = 'kk'

function detectLang(text: string): string {
  if (/[әғқңөұүһі]/i.test(text)) return 'kk'
  if (/[a-z]/i.test(text) && !/[а-яё]/i.test(text)) return 'en'
  return 'ru'
}

function say(lang: string, variants: { kk: string; ru: string; en: string }) {
  const base = lang.toLowerCase().split('-')[0]
  return base === 'kk' || base === 'en' ? variants[base] : variants.ru
}

function response(input: Partial<DialogResponse> & Pick<DialogResponse, 'lang' | 'say' | 'intent'>): DialogResponse {
  return {
    place_id: null,
    actions: [],
    suggestions: [],
    memory_patch: {},
    debug: { via: 'mock' },
    ...input,
  }
}

function matchPlace(text: string, lastPlaceId: number | null): number | null {
  if (/форт|fort/.test(text)) return 4
  if (/шакпак|шақпақ|shakpak|мечет|мешіт|mosque/.test(text)) return 6
  if (/набереж|жағалау|waterfront|каспи|caspian/.test(text)) return 1
  return lastPlaceId
}

function logEvent(type: EventType, sessionId: string, lang: string, placeId: number | null) {
  const key = 'bagdar:mock-events:v1'
  const current = JSON.parse(localStorage.getItem(key) ?? '[]') as unknown[]
  current.push({ type, session_id: sessionId, lang, place_id: placeId, at: new Date().toISOString() })
  localStorage.setItem(key, JSON.stringify(current.slice(-100)))
}

export const mockApi: BagdarApi = {
  async config() {
    await delay(120)
    return structuredClone(mockConfig)
  },

  async places(lang) {
    await delay()
    currentLang = lang
    const places = getMockPlaces(lang)
    const result = { places, total: places.length, lang }
    localStorage.setItem('bagdar:catalog:v1', JSON.stringify(result))
    return result
  },

  async place(id, lang) {
    await delay()
    currentLang = lang
    const place = getMockPlace(id, lang)
    if (!place) throw new ApiError(404, 'PLACE_NOT_FOUND', 'Место не найдено')
    return place
  },

  async route(id, _mode, fallback = false) {
    await delay(340)
    if (!fallback && localStorage.getItem('bagdar:mock-route-down') === '1') {
      throw new ApiError(503, 'ROUTE_UNAVAILABLE', 'Маршрутизация недоступна')
    }
    const route = getMockRoute(id, fallback)
    if (!route) throw new ApiError(404, 'PLACE_NOT_FOUND', 'Место не найдено')
    const base = currentLang.toLowerCase().split('-')[0]
    const directions: Record<number, { kk: [string, string]; ru: [string, string]; en: [string, string] }> = {
      1: { kk: ['жағалау бойымен оңтүстік-шығысқа жүріңіз', 'Теңізге қарай жағалау жолымен жүріңіз'], ru: ['идите на юго-восток вдоль побережья', 'Следуйте по набережной в сторону моря'], en: ['head southeast along the coast', 'Follow the waterfront promenade towards the sea'] },
      4: { kk: ['солтүстік-батысқа қарай жүріңіз', '15-шағын аудандағы аялдамадан қалааралық көлікке отырыңыз'], ru: ['двигайтесь на северо-запад', 'Посадка на междугородний транспорт у остановки 15-го микрорайона'], en: ['head northwest', 'Board intercity transport at the 15th microdistrict stop'] },
      6: { kk: ['солтүстікке қарай жүріңіз', 'Түсу нүктесіне дейін көлікпен, әрі қарай жаяу жүріңіз'], ru: ['двигайтесь на север', 'Доедьте до точки высадки, затем пройдите к комплексу пешком'], en: ['head north', 'Ride to the drop-off point, then walk to the complex'] },
    }
    const localized = directions[id]?.[base === 'kk' || base === 'en' ? base : 'ru']
    if (localized) {
      route.direction_text = localized[0]
      if (route.steps[0]) route.steps[0].instruction = localized[1]
    }
    return route
  },

  async dialog(sessionId: string, turn: VoiceTurn, _screen: string, lastPlaceId: number | null) {
    await delay(460)
    const text = turn.text?.trim().toLowerCase()
    if (!text) throw new ApiError(422, 'SPEECH_UNRECOGNIZED', 'Речь не распознана', { stage: 'stt' })
    const lang = detectLang(text)
    currentLang = lang
    const placeId = matchPlace(text, lastPlaceId)

    if (/пока|спасибо|рахмет|сау бол|goodbye|thank/.test(text)) {
      return response({ lang, intent: 'goodbye', say: say(lang, { kk: 'Сау болыңыз! Жолыңыз болсын.', ru: 'До свидания! Хорошей прогулки.', en: 'Goodbye, and enjoy your visit.' }), actions: [{ show: 'map' }] })
    }
    if (/телефон|qr|phone|жібер/.test(text)) {
      const target = placeId ?? 1
      return response({ lang, intent: 'send_to_phone', place_id: target, say: say(lang, { kk: 'Маршрутты телефонға дайындадым.', ru: 'Подготовил маршрут для телефона.', en: 'I prepared the route for your phone.' }), actions: [{ show: 'qr', place_id: target }] })
    }
    if (/как было|истори|тарих|history|then/.test(text)) {
      const target = placeId ?? 1
      return response({ lang, intent: 'scene_info', place_id: target, say: say(lang, { kk: 'Бұл жердің бұрынғы көрінісін көрсетемін.', ru: 'Показываю, как это место выглядело раньше.', en: 'Here is how this place looked before.' }), actions: [{ show: 'scene', place_id: target }] })
    }
    if (/рядом|жақын|nearby|посмотреть|көр/.test(text) && !placeId) {
      const suggestions = getMockPlaces(lang).map(({ id, name }) => ({ id, name }))
      return response({ lang, intent: 'search', say: say(lang, { kk: 'Жақын жерде үш қызықты орын бар.', ru: 'Рядом есть три интересных места.', en: 'There are three interesting places nearby.' }), suggestions })
    }
    if (placeId || /как пройти|қайда|route|go to|маршрут|где/.test(text)) {
      const target = placeId ?? 1
      return response({ lang, intent: 'route_to_place', place_id: target, say: say(lang, { kk: 'Бағытты көрсетемін.', ru: 'Показываю маршрут.', en: 'I will show you the route.' }), actions: [{ show: 'route', place_id: target }], memory_patch: { places: [target] } })
    }

    throw new ApiError(422, 'SPEECH_UNRECOGNIZED', 'Намерение не распознано', { stage: 'intent' })
  },

  async scene(id) {
    await delay(280)
    const scene = mockScenes[id]
    if (!scene) throw new ApiError(404, 'PLACE_NOT_FOUND', 'Сцена не найдена')
    return structuredClone(scene)
  },

  async qr(placeId, _lang, sessionId) {
    await delay(260)
    if (!getMockPlace(placeId, 'ru')) throw new ApiError(404, 'PLACE_NOT_FOUND', 'Место не найдено')
    return { url: `https://bagdar.local/r/demo-${sessionId.slice(0, 8)}-${placeId}`, payload_version: 1, expires_in_sec: 3600 }
  },

  async event(sessionId, type, lang, placeId = null) {
    logEvent(type, sessionId, lang, placeId)
    return { ok: true }
  },

  async endSession(sessionId) {
    localStorage.setItem('bagdar:mock-last-ended-session', sessionId)
    return { ok: true }
  },
}
