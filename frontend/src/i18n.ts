export interface Copy {
  hello: string
  prompt: string
  listening: string
  processing: string
  repeat: string
  offline: string
  alwaysOpen: string
  closed: string
  approximate: string
  walk: string
  transit: string
  minutes: string
  then: string
  now: string
  scan: string
  qrHint: string
  artistic: string
  sleepHint: string
  microphone: string
  gesture: string
  sceneDone: string
  noScene: string
  noPlace: string
  goodbye: string
  afterPlace: string
  sendToPhone: string
  routeNarration: (distance: string, minutes: number, direction: string, mode: string, approximate: boolean, firstStep?: string) => string
}

const copy: Record<'kk' | 'ru' | 'en', Copy> = {
  kk: {
    hello: 'Сәлем! Маңғыстауды бірге зерттейік.',
    prompt: 'Қайда барғыңыз келетінін дауыстап айтыңыз',
    listening: 'Тыңдап тұрмын…',
    processing: 'Маршрутты дайындап жатырмын…',
    repeat: 'Кешіріңіз, түсінбедім. Қайталап айтыңыз.',
    offline: 'Желі жоқ — соңғы сақталған орындарды көрсетіп тұрмын',
    alwaysOpen: 'Әрқашан ашық',
    closed: 'Қазір жабық',
    approximate: 'Шамамен берілген бағыт',
    walk: 'Жаяу',
    transit: 'Көлікпен',
    minutes: 'мин',
    then: 'Бұрын',
    now: 'Қазір',
    scan: 'Телефонмен сканерлеңіз',
    qrHint: 'Маршрут телефоныңызда ашылады',
    artistic: 'Көркем реконструкция',
    sleepHint: 'Маған жақындап, сұрағыңызды дауыстап айтыңыз',
    microphone: 'Микрофонға рұқсат қажет',
    gesture: 'Ым тілінде сөйлесесіз бе? Көрсетіңіз!',
    sceneDone: 'Тағы не көрсетейін?',
    noScene: 'Бұл орынның тарихи көрінісі әзірге жоқ.',
    noPlace: 'Орын табылмады. Мына орындардың бірін атаңыз:',
    goodbye: 'Сау болыңыз! Жолыңыз болсын.',
    afterPlace: 'Тарихын көрсетейін бе? Телефонға жіберейін бе?',
    sendToPhone: 'Маршрутты телефонға жіберейін бе?',
    routeNarration: (distance, minutes, direction, mode, approximate, firstStep) =>
      `${mode}: ${distance}, шамамен ${minutes} минут. ${direction}. ${firstStep ?? ''} ${approximate ? 'Бұл шамамен берілген бағыт.' : ''}`.trim(),
  },
  ru: {
    hello: 'Здравствуйте! Давайте исследовать Мангистау.',
    prompt: 'Скажите вслух, куда хотите отправиться',
    listening: 'Слушаю…',
    processing: 'Готовлю маршрут…',
    repeat: 'Не расслышал. Пожалуйста, повторите.',
    offline: 'Нет сети — показываю сохранённые места',
    alwaysOpen: 'Открыто всегда',
    closed: 'Сейчас закрыто',
    approximate: 'Примерный путь',
    walk: 'Пешком',
    transit: 'На транспорте',
    minutes: 'мин',
    then: 'Тогда',
    now: 'Сейчас',
    scan: 'Сканируйте телефоном',
    qrHint: 'Маршрут откроется на вашем телефоне',
    artistic: 'Художественная реконструкция',
    sleepHint: 'Подойдите и задайте вопрос вслух',
    microphone: 'Нужен доступ к микрофону',
    gesture: 'Общаетесь на языке жестов? Показывайте!',
    sceneDone: 'Что ещё показать?',
    noScene: 'У этого места пока нет исторической сцены.',
    noPlace: 'Место не найдено. Назовите один из похожих вариантов:',
    goodbye: 'До свидания! Хорошей прогулки.',
    afterPlace: 'Показать историю? Отправить маршрут на телефон?',
    sendToPhone: 'Отправить маршрут на телефон?',
    routeNarration: (distance, minutes, direction, mode, approximate, firstStep) =>
      `${mode}: ${distance}, около ${minutes} минут. ${direction}. ${firstStep ?? ''} ${approximate ? 'Это примерный путь.' : ''}`.trim(),
  },
  en: {
    hello: "Hello! Let's explore Mangystau.",
    prompt: 'Say where you would like to go',
    listening: 'Listening…',
    processing: 'Preparing your route…',
    repeat: 'I did not catch that. Please repeat.',
    offline: 'Offline — showing the saved catalogue',
    alwaysOpen: 'Always open',
    closed: 'Closed now',
    approximate: 'Approximate route',
    walk: 'Walking',
    transit: 'By transit',
    minutes: 'min',
    then: 'Then',
    now: 'Now',
    scan: 'Scan with your phone',
    qrHint: 'The route will open on your phone',
    artistic: 'Artistic reconstruction',
    sleepHint: 'Come closer and ask your question aloud',
    microphone: 'Microphone access is required',
    gesture: 'Do you use sign language? You can show me now.',
    sceneDone: 'What else would you like to see?',
    noScene: 'This place does not have a historical scene yet.',
    noPlace: 'I could not find that place. Try one of these:',
    goodbye: 'Goodbye, and enjoy your visit.',
    afterPlace: 'Would you like to see its history or send the route to your phone?',
    sendToPhone: 'Would you like to send the route to your phone?',
    routeNarration: (distance, minutes, direction, mode, approximate, firstStep) =>
      `${mode}: ${distance}, about ${minutes} minutes. ${direction}. ${firstStep ?? ''} ${approximate ? 'This is an approximate route.' : ''}`.trim(),
  },
}

export function getCopy(lang: string): Copy {
  const base = lang.toLowerCase().split('-')[0] as keyof typeof copy
  return copy[base] ?? copy.ru
}
