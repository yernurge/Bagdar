import type { Config, Place, PlaceSummary, Route, Scene } from '../types'

export const mockConfig: Config = {
  screen_id: 'AKTAU-EMB-01',
  origin: { lat: 43.6582, lng: 51.1352, heading_deg: 45 },
  languages: ['kk', 'ru', 'en'],
  default_lang: 'kk',
  modes: { voice: true, tarihsky: true, qr: true, huskylens: true },
  session: { idle_timeout_sec: 90, qr_timeout_sec: 60 },
  district: 'aktau-15-mkr',
  categories: ['park', 'history', 'religion'],
}

type LocalizedPlace = Omit<Place, 'name' | 'summary' | 'description' | 'address'> & {
  name: Record<'kk' | 'ru' | 'en', string>
  summary: Record<'kk' | 'ru' | 'en', string>
  description: Record<'kk' | 'ru' | 'en', string>
  address: Record<'kk' | 'ru' | 'en', string>
}

const placeData: LocalizedPlace[] = [
  {
    id: 1,
    name: { kk: 'Ақтау жағалауы', ru: 'Набережная Актау', en: 'Aktau Waterfront' },
    summary: {
      kk: 'Каспий жағалауындағы серуен мен демалыс бағыты.',
      ru: 'Прогулочный маршрут вдоль Каспийского моря.',
      en: 'A promenade and leisure route along the Caspian Sea.',
    },
    description: {
      kk: 'Теңіз көрінісі, амфитеатр және жаяу серуенге арналған ашық кеңістік.',
      ru: 'Открытое пространство с видом на море, амфитеатром и прогулочной линией.',
      en: 'An open waterfront with sea views, an amphitheatre and a walking route.',
    },
    category: 'park', lat: 43.642, lng: 51.172, address: { kk: '15 шағын аудан, Ақтау', ru: '15-й микрорайон, Актау', en: '15th microdistrict, Aktau' },
    photos: ['/mocks/waterfront.svg'], hours: null, is_open_now: true, opens_next: null,
    has_scene: true, access: 'walk', langs: ['kk', 'ru', 'en'],
  },
  {
    id: 4,
    name: { kk: 'Форт-Шевченко', ru: 'Форт-Шевченко', en: 'Fort-Shevchenko' },
    summary: {
      kk: 'Маңғыстаудың тарихы мен Каспий мұрасын сақтаған қала.',
      ru: 'Исторический город, связанный с культурой Мангистау и Каспием.',
      en: 'A historic town shaped by Mangystau culture and the Caspian Sea.',
    },
    description: {
      kk: 'Қалаға көлікпен барған дұрыс; бағыт отырғызу нүктесін көрсетеді.',
      ru: 'До города лучше ехать на транспорте; маршрут укажет точку посадки.',
      en: 'The town is best reached by transit; the route includes a boarding point.',
    },
    category: 'history', lat: 44.51, lng: 50.26, address: { kk: 'Түпқараған ауданы', ru: 'Тупкараганский район', en: 'Tupkaragan district' },
    photos: ['/mocks/fort.svg'], hours: '09:00–18:00', is_open_now: false, opens_next: 'завтра в 09:00',
    has_scene: true, access: 'transit', langs: ['kk', 'ru', 'en'],
  },
  {
    id: 6,
    name: { kk: 'Шақпақ ата', ru: 'Шакпак-ата', en: 'Shakpak-Ata' },
    summary: {
      kk: 'Жартаста қашалған көне жерасты мешіті.',
      ru: 'Древняя подземная мечеть, высеченная в скале.',
      en: 'An ancient underground mosque carved into rock.',
    },
    description: {
      kk: 'Маңғыстаудың қасиетті орындарының бірі, қала сыртында орналасқан.',
      ru: 'Одно из сакральных мест Мангистау, расположенное за городом.',
      en: 'One of Mangystau’s sacred sites, located outside the city.',
    },
    category: 'religion', lat: 44.44, lng: 51.13, address: { kk: 'Түпқараған ауданы', ru: 'Тупкараганский район', en: 'Tupkaragan district' },
    photos: ['/mocks/shakpak.svg'], hours: null, is_open_now: true, opens_next: null,
    has_scene: true, access: 'transit', langs: ['kk', 'ru', 'en'],
  },
]

function supportedLang(lang: string): 'kk' | 'ru' | 'en' {
  const base = lang.toLowerCase().split('-')[0]
  return base === 'kk' || base === 'en' ? base : 'ru'
}

export function getMockPlaces(lang: string): PlaceSummary[] {
  const key = supportedLang(lang)
  return placeData.map((place) => ({
    id: place.id,
    name: place.name[key],
    summary: place.summary[key],
    category: place.category,
    lat: place.lat,
    lng: place.lng,
    thumb_url: place.photos[0],
    has_scene: place.has_scene,
    hours: place.hours,
    access: place.access,
  }))
}

export function getMockPlace(id: number, lang: string): Place | undefined {
  const key = supportedLang(lang)
  const place = placeData.find((item) => item.id === id)
  if (!place) return undefined
  const opensNext = place.opens_next
    ? key === 'kk' ? 'ертең 09:00-де' : key === 'en' ? 'tomorrow at 09:00' : place.opens_next
    : null
  return { ...place, name: place.name[key], summary: place.summary[key], description: place.description[key], address: place.address[key], opens_next: opensNext }
}

const routes: Record<number, Route> = {
  1: {
    place_id: 1, mode: 'walk', distance_m: 3100, duration_min: 39, bearing_deg: 121,
    direction_text: 'идите на юго-восток вдоль побережья', is_approximate: false,
    geometry: { type: 'LineString', coordinates: [[51.1352, 43.6582], [51.145, 43.653], [51.158, 43.647], [51.172, 43.642]] },
    steps: [{ instruction: 'Следуйте по набережной в сторону моря', distance_m: 3100 }],
  },
  4: {
    place_id: 4, mode: 'transit', distance_m: 132000, duration_min: 118, bearing_deg: 322,
    direction_text: 'двигайтесь на северо-запад', is_approximate: false,
    geometry: { type: 'LineString', coordinates: [[51.1352, 43.6582], [50.82, 43.92], [50.55, 44.23], [50.26, 44.51]] },
    steps: [{ instruction: 'Посадка на междугородний транспорт у остановки 15-го микрорайона', distance_m: 450 }],
  },
  6: {
    place_id: 6, mode: 'transit', distance_m: 99000, duration_min: 96, bearing_deg: 2,
    direction_text: 'двигайтесь на север', is_approximate: false,
    geometry: { type: 'LineString', coordinates: [[51.1352, 43.6582], [51.14, 43.91], [51.135, 44.18], [51.13, 44.44]] },
    steps: [{ instruction: 'Доедьте до точки высадки, затем пройдите к комплексу пешком', distance_m: 700 }],
  },
}

export function getMockRoute(id: number, fallback = false): Route | undefined {
  const route = routes[id]
  if (!route) return undefined
  if (!fallback) return structuredClone(route)
  const place = placeData.find((item) => item.id === id)
  if (!place) return undefined
  return {
    ...structuredClone(route),
    is_approximate: true,
    geometry: { type: 'LineString', coordinates: [[mockConfig.origin.lng, mockConfig.origin.lat], [place.lng, place.lat]] },
    steps: [],
  }
}

export const mockScenes: Record<number, Scene> = {
  1: {
    place_id: 1, enabled: true,
    modern_url: '/mocks/waterfront-modern.svg', historic_url: '/mocks/waterfront-historic.svg',
    attribution: 'Художественная реконструкция для демонстрации TarihSky',
    texts: {
      kk: { title: 'Жағалау: кеше және бүгін', body: 'Ақтаудың жағалау кеңістігі қала мен Каспий арасындағы басты серуен бағытына айналды.' },
      ru: { title: 'Набережная: тогда и сейчас', body: 'Береговое пространство Актау стало главной прогулочной связью между городом и Каспием.' },
      en: { title: 'The waterfront: then and now', body: 'Aktau’s waterfront has become the city’s main promenade and its connection to the Caspian Sea.' },
    },
    sources: ['Демонстрационная сцена BaGdar'],
  },
  4: {
    place_id: 4, enabled: true,
    modern_url: '/mocks/fort.svg', historic_url: '/mocks/fort-historic.svg',
    attribution: 'Художественная реконструкция для демонстрации TarihSky',
    texts: {
      kk: { title: 'Форттың тарихи қабаты', body: 'Теңіз жолдары мен дала тарихы бұл жерде бір кеңістікте тоғысады.' },
      ru: { title: 'Исторический слой форта', body: 'Морские маршруты и история степи встречаются здесь в одном пространстве.' },
      en: { title: 'The fort’s historic layer', body: 'Maritime routes and steppe history meet here in one landscape.' },
    },
    sources: ['Демонстрационная сцена BaGdar'],
  },
  6: {
    place_id: 6, enabled: true,
    modern_url: '/mocks/shakpak.svg', historic_url: '/mocks/shakpak-historic.svg',
    attribution: 'Художественная реконструкция для демонстрации TarihSky',
    texts: {
      kk: { title: 'Жартастағы жад', body: 'Шақпақ ата сәулет пен табиғи рельефтің тұтастығын сақтайды.' },
      ru: { title: 'Память в камне', body: 'Шакпак-ата сохраняет редкое единство архитектуры и природного рельефа.' },
      en: { title: 'Memory in stone', body: 'Shakpak-Ata preserves a rare unity of architecture and natural terrain.' },
    },
    sources: ['Демонстрационная сцена BaGdar'],
  },
}
