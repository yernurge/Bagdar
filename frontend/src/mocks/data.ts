import type { Config, PlaceDetail, PlaceSummary, RouteResponse, SceneResponse } from '../types'

export const mockConfig: Config = {
  screen_id: 'AKTAU-EMB-01',
  origin: { lat: 43.6582, lng: 51.1352, heading_deg: 45 },
  languages: ['kk', 'ru', 'en'],
  default_lang: 'kk',
  modes: { voice: true, tarihsky: true, qr: true, huskylens: false },
  session: { idle_timeout_sec: 90, qr_timeout_sec: 60 },
  district: 'aktau-15-mkr',
  categories: ['park', 'mall', 'market', 'history', 'nature', 'religion', 'culture'],
}

type Localized = Record<'ru' | 'kk' | 'en', { name: string; summary: string; description: string; address: string }>

interface MockPlaceSeed {
  id: number
  category: string
  lat: number
  lng: number
  has_scene: boolean
  access: 'walk' | 'transit'
  image: string
  texts: Localized
}

const address = {
  ru: 'Актау, набережная 15-го микрорайона',
  kk: 'Ақтау, 15-шағынаудан жағалауы',
  en: 'Aktau, 15th microdistrict waterfront',
}

export const mockPlaceSeeds: MockPlaceSeed[] = [
  {
    id: 1, category: 'culture', lat: 43.661365, lng: 51.132965, has_scene: false, access: 'walk', image: '/media/amphitheater.svg',
    texts: {
      ru: { name: 'Амфитеатр', summary: 'Открытая сцена у Каспийского моря.', description: 'Открытая сцена у Каспийского моря. На набережной здесь проводят городские мероприятия.', address: address.ru },
      kk: { name: 'Амфитеатр', summary: 'Каспий жағасындағы ашық сахна.', description: 'Каспий жағасындағы ашық сахна. Жағалауда қалалық іс-шаралар өтеді.', address: address.kk },
      en: { name: 'Amphitheater', summary: 'Open-air stage by the Caspian Sea.', description: 'An open-air stage by the Caspian Sea. The waterfront venue hosts city events.', address: address.en },
    },
  },
  {
    id: 2, category: 'park', lat: 43.662252, lng: 51.133075, has_scene: true, access: 'walk', image: '/media/waterfront-now.svg',
    texts: {
      ru: { name: 'Набережная 15-го микрорайона', summary: 'Прогулочная зона вдоль моря.', description: 'Прогулочная зона вдоль моря. Променад расположен рядом с амфитеатром.', address: address.ru },
      kk: { name: '15-шағынаудан жағалауы', summary: 'Теңіз бойындағы серуен аймағы.', description: 'Теңіз бойындағы серуен аймағы. Серуен жолы амфитеатрдың жанында орналасқан.', address: address.kk },
      en: { name: '15th Microdistrict Promenade', summary: 'Walking area along the sea.', description: 'A walking area along the sea. The promenade is next to the amphitheater.', address: address.en },
    },
  },
  {
    id: 3, category: 'nature', lat: 43.658903, lng: 51.133838, has_scene: false, access: 'walk', image: '/media/coast.svg',
    texts: {
      ru: { name: 'Смотровая площадка', summary: 'Точка с видом на Каспийское море.', description: 'Точка с видом на Каспийское море. Площадка находится у прибрежной прогулочной зоны.', address: address.ru },
      kk: { name: 'Көрініс алаңы', summary: 'Каспий теңізіне қарайтын орын.', description: 'Каспий теңізіне қарайтын орын. Алаң жағалаудағы серуен аймағында орналасқан.', address: address.kk },
      en: { name: 'Viewpoint', summary: 'View over the Caspian Sea.', description: 'A viewpoint over the Caspian Sea, set beside the waterfront walking area.', address: address.en },
    },
  },
  {
    id: 4, category: 'culture', lat: 43.659594, lng: 51.134827, has_scene: false, access: 'walk', image: '/media/coast.svg',
    texts: {
      ru: { name: 'Скульптура «Құдықшылар»', summary: 'Скульптура на набережной.', description: 'Скульптура на набережной. Она расположена рядом с прогулочной зоной.', address: address.ru },
      kk: { name: '«Құдықшылар» мүсіні', summary: 'Жағалаудағы мүсін.', description: 'Жағалаудағы мүсін. Мүсін серуен аймағының жанында орналасқан.', address: address.kk },
      en: { name: 'Qudyqshylar Sculpture', summary: 'Sculpture on the waterfront.', description: 'A sculpture on the waterfront beside the walking area.', address: address.en },
    },
  },
  {
    id: 5, category: 'culture', lat: 43.662236, lng: 51.132432, has_scene: false, access: 'walk', image: '/media/coast.svg',
    texts: {
      ru: { name: 'Скульптура «Хан на верблюде»', summary: 'Фигура всадника на верблюде.', description: 'Фигура всадника на верблюде. Скульптура находится у моря.', address: address.ru },
      kk: { name: '«Түйе мінген хан» мүсіні', summary: 'Түйедегі салт атты бейнесі.', description: 'Түйедегі салт атты бейнесі. Мүсін теңіз жағасында орналасқан.', address: address.kk },
      en: { name: 'Khan on a Camel Sculpture', summary: 'Figure of a rider on a camel.', description: 'The figure of a rider on a camel stands by the sea.', address: address.en },
    },
  },
  {
    id: 6, category: 'culture', lat: 43.664791, lng: 51.132468, has_scene: false, access: 'walk', image: '/media/coast.svg',
    texts: {
      ru: { name: 'Скульптура «Кобра»', summary: 'Фигура кобры на набережной.', description: 'Фигура кобры на набережной. Скульптура расположена вдоль прогулочного маршрута.', address: address.ru },
      kk: { name: '«Кобра» мүсіні', summary: 'Жағалаудағы кобра бейнесі.', description: 'Жағалаудағы кобра бейнесі. Мүсін серуен жолының бойында орналасқан.', address: address.kk },
      en: { name: 'Cobra Sculpture', summary: 'Cobra figure on the waterfront.', description: 'The cobra sculpture stands along the walking route.', address: address.en },
    },
  },
  {
    id: 7, category: 'culture', lat: 43.665396, lng: 51.132105, has_scene: false, access: 'walk', image: '/media/coast.svg',
    texts: {
      ru: { name: 'Скульптура «Ребёнок на волке»', summary: 'Фигура ребёнка верхом на волке.', description: 'Фигура ребёнка верхом на волке. Скульптура находится у северной части набережной.', address: address.ru },
      kk: { name: '«Қасқыр мінген бала» мүсіні', summary: 'Қасқыр мінген бала бейнесі.', description: 'Қасқыр мінген бала бейнесі. Мүсін жағалаудың солтүстік бөлігінде орналасқан.', address: address.kk },
      en: { name: 'Child on a Wolf Sculpture', summary: 'Figure of a child riding a wolf.', description: 'The sculpture is near the northern waterfront.', address: address.en },
    },
  },
  {
    id: 8, category: 'culture', lat: 43.656153, lng: 51.147971, has_scene: false, access: 'walk', image: '/media/coast.svg',
    texts: {
      ru: { name: 'Флагшток', summary: 'Высокий флагшток у прибрежной зоны.', description: 'Высокий флагшток у прибрежной зоны. Он служит ориентиром рядом с прогулочным районом.', address: address.ru },
      kk: { name: 'Ту тұғыры', summary: 'Жағалау маңындағы биік ту тұғыры.', description: 'Ол серуен аймағына жақын бағдар ретінде көрінеді.', address: address.kk },
      en: { name: 'Flagpole', summary: 'Tall flagpole near the coast.', description: 'A visible landmark near the waterfront walking area.', address: address.en },
    },
  },
  {
    id: 9, category: 'park', lat: 43.66546, lng: 51.141331, has_scene: false, access: 'walk', image: '/media/coast.svg',
    texts: {
      ru: { name: 'Детская площадка', summary: 'Открытая площадка для игр.', description: 'Открытая площадка для игр. Она находится в районе набережной.', address: address.ru },
      kk: { name: 'Балалар алаңы', summary: 'Ашық ойын алаңы.', description: 'Ашық ойын алаңы. Ол жағалау ауданында орналасқан.', address: address.kk },
      en: { name: "Children's Playground", summary: 'Outdoor play area.', description: 'An outdoor play area in the waterfront district.', address: address.en },
    },
  },
  {
    id: 10, category: 'park', lat: 43.656405, lng: 51.139441, has_scene: false, access: 'walk', image: '/media/coast.svg',
    texts: {
      ru: { name: 'Игровая зона у набережной', summary: 'Небольшое место для отдыха и игр.', description: 'Небольшое место для отдыха и игр. Зона расположена недалеко от променада.', address: address.ru },
      kk: { name: 'Жағалау маңындағы ойын орны', summary: 'Демалыс пен ойынға арналған шағын орын.', description: 'Ол серуен жолына жақын орналасқан.', address: address.kk },
      en: { name: 'Waterfront Play Area', summary: 'Small recreation and play area.', description: 'A small recreation area close to the promenade.', address: address.en },
    },
  },
]

function safeLang(lang: string): 'ru' | 'kk' | 'en' {
  return lang === 'kk' || lang === 'en' ? lang : 'ru'
}

export function mockSummaries(lang: string): PlaceSummary[] {
  const key = safeLang(lang)
  return mockPlaceSeeds.map((place) => ({
    id: place.id,
    name: place.texts[key].name,
    summary: place.texts[key].summary,
    category: place.category,
    lat: place.lat,
    lng: place.lng,
    thumb_url: place.image,
    has_scene: place.has_scene,
    hours: null,
    access: place.access,
  }))
}

export function mockDetail(id: number, lang: string): PlaceDetail | undefined {
  const seed = mockPlaceSeeds.find((place) => place.id === id)
  if (!seed) return undefined
  const key = safeLang(lang)
  const text = seed.texts[key]
  return {
    id: seed.id,
    name: text.name,
    summary: text.summary,
    description: text.description,
    category: seed.category,
    lat: seed.lat,
    lng: seed.lng,
    thumb_url: seed.image,
    photos: [seed.image],
    address: text.address,
    hours: null,
    is_open_now: true,
    opens_next: null,
    has_scene: seed.has_scene,
    access: seed.access,
    langs: ['kk', 'ru', 'en'],
  }
}

export const mockRoutes: Record<number, RouteResponse> = Object.fromEntries(
  mockPlaceSeeds.map((place, index) => [place.id, {
    place_id: place.id,
    mode: place.access,
    distance_m: [420, 510, 180, 240, 540, 790, 880, 1130, 1080, 760][index],
    duration_min: [6, 7, 3, 4, 8, 11, 12, 15, 14, 10][index],
    bearing_deg: [326, 342, 292, 350, 334, 349, 347, 82, 38, 70][index],
    direction_text: ['идите на северо-запад', 'идите на северо-запад', 'идите на запад', 'идите на север', 'идите на северо-запад', 'идите на север', 'идите на север', 'идите на восток', 'идите на северо-восток', 'идите на восток'][index],
    is_approximate: false,
    geometry: {
      type: 'LineString',
      coordinates: [[mockConfig.origin.lng, mockConfig.origin.lat], [(mockConfig.origin.lng + place.lng) / 2, (mockConfig.origin.lat + place.lat) / 2], [place.lng, place.lat]],
    },
    steps: [{ instruction: 'Следуйте по набережной', distance_m: [420, 510, 180, 240, 540, 790, 880, 1130, 1080, 760][index] }],
  }]),
)

export const mockScene: SceneResponse = {
  place_id: 2,
  enabled: true,
  modern_url: '/media/waterfront-now.svg',
  historic_url: '/media/waterfront-then.svg',
  attribution: 'художественная реконструкция',
  texts: {
    ru: { title: 'Берег до города', body: 'До появления современной набережной берег оставался открытым пространством у Каспия. Реконструкция показывает собирательный образ местности и не является документальной фотографией.' },
    kk: { title: 'Қалаға дейінгі жағалау', body: 'Қазіргі жағалау салынғанға дейін Каспий маңы ашық кеңістік болған. Бұл — деректі фото емес, көркем реконструкция.' },
    en: { title: 'The coast before the city', body: 'Before the modern promenade, this was open land by the Caspian Sea. This is an artistic reconstruction, not a documentary photograph.' },
  },
  sources: ['Архивные планы развития Актау', 'Материалы городского музея'],
}
