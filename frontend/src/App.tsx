import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api, isMockMode } from './api'
import { ApiError } from './api-error'
import { Brand } from './components/Brand'
import { CatalogScreen } from './components/CatalogScreen'
import { PlaceScreen } from './components/PlaceScreen'
import { QrScreen } from './components/QrScreen'
import { SleepScreen } from './components/SleepScreen'
import { TarihSkyScreen } from './components/TarihSkyScreen'
import { useAmbientAudio } from './hooks/useAmbientAudio'
import { useSpeechRecognition } from './hooks/useSpeechRecognition'
import { speechLocale, t } from './i18n'
import { mockConfig } from './mocks/data'
import type {
  Config,
  DialogAction,
  EventRequest,
  KioskPhase,
  PlaceDetail,
  PlaceSummary,
  QrResponse,
  RouteResponse,
  SceneResponse,
} from './types'

const CONFIG_CACHE = 'bagdar:config:v1'
const PLACES_CACHE = 'bagdar:places:v1'

function readCache<T>(key: string): T | null {
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) as T : null
  } catch {
    return null
  }
}

function writeCache(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* kiosk cache is best effort */ }
}

export default function App() {
  const [config, setConfig] = useState<Config | null>(null)
  const [places, setPlaces] = useState<PlaceSummary[]>([])
  const [phase, setPhase] = useState<KioskPhase>('catalog')
  const [returnPhase, setReturnPhase] = useState<KioskPhase>('catalog')
  const [lang, setLang] = useState('ru')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [place, setPlace] = useState<PlaceDetail | null>(null)
  const [route, setRoute] = useState<RouteResponse | null>(null)
  const [scene, setScene] = useState<SceneResponse | null>(null)
  const [qr, setQr] = useState<QrResponse | null>(null)
  const [qrRemaining, setQrRemaining] = useState(60)
  const [answer, setAnswer] = useState('')
  const [suggestions, setSuggestions] = useState<{ id: number; name: string }[]>([])
  const [offline, setOffline] = useState(false)
  const [sleeping, setSleeping] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [gesturePrompt, setGesturePrompt] = useState(false)
  const [sceneReveal, setSceneReveal] = useState(0)
  const lastActivity = useRef(Date.now())
  const phaseRef = useRef<KioskPhase>(phase)
  const sessionRef = useRef<string | null>(sessionId)
  const speakingRef = useRef(speaking)
  const demoBooted = useRef(false)
  const copy = useMemo(() => t(lang), [lang])

  useEffect(() => { phaseRef.current = phase }, [phase])
  useEffect(() => { sessionRef.current = sessionId }, [sessionId])
  useEffect(() => { speakingRef.current = speaking }, [speaking])

  const speak = useCallback((text: string, language = lang) => {
    if (!text || !('speechSynthesis' in window)) return Promise.resolve()
    window.speechSynthesis.cancel()
    setSpeaking(true)
    return new Promise<void>((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = speechLocale(language)
      utterance.rate = 0.93
      utterance.pitch = 0.96
      utterance.onend = () => { setSpeaking(false); resolve() }
      utterance.onerror = () => { setSpeaking(false); resolve() }
      window.speechSynthesis.speak(utterance)
    })
  }, [lang])

  const postEvent = useCallback((type: EventRequest['type'], activeSession: string, placeId?: number | null) => {
    void api.postEvent({ session_id: activeSession, type, place_id: placeId, lang }).catch(() => setOffline(true))
  }, [lang])

  const startSession = useCallback(() => {
    if (sessionRef.current) return sessionRef.current
    const id = crypto.randomUUID()
    sessionRef.current = id
    setSessionId(id)
    setSleeping(false)
    setPhase('catalog')
    setAnswer('Здравствуйте! Спросите меня о городе.')
    setSuggestions([])
    lastActivity.current = Date.now()
    postEvent('session_start', id)
    void speak('Здравствуйте! Спросите меня о городе.', lang)
    return id
  }, [lang, postEvent, speak])

  const endSession = useCallback(async (farewell = true) => {
    const id = sessionRef.current
    if (!id) return
    if (farewell) await speak('Спасибо за прогулку. До встречи у Каспия.', lang)
    await api.endSession(id).catch(() => setOffline(true))
    sessionRef.current = null
    setSessionId(null)
    setPlace(null)
    setRoute(null)
    setScene(null)
    setQr(null)
    setSuggestions([])
    setAnswer('')
    setRetryCount(0)
    setGesturePrompt(false)
    setPhase('catalog')
    lastActivity.current = Date.now()
  }, [lang, speak])

  useEffect(() => {
    let cancelled = false
    async function boot() {
      let nextConfig: Config
      try {
        nextConfig = await api.getConfig()
        writeCache(CONFIG_CACHE, nextConfig)
        if (cancelled) return
        setConfig(nextConfig)
        setLang(nextConfig.default_lang)
      } catch {
        setOffline(true)
        nextConfig = readCache<Config>(CONFIG_CACHE) ?? mockConfig
        if (cancelled) return
        setConfig(nextConfig)
        setLang(nextConfig.default_lang)
      }

      try {
        const catalogue = await api.getPlaces(nextConfig.default_lang)
        if (cancelled) return
        setPlaces(catalogue.places)
        writeCache(PLACES_CACHE, catalogue.places)
      } catch {
        setOffline(true)
        const cached = readCache<PlaceSummary[]>(PLACES_CACHE)
        if (cached && !cancelled) setPlaces(cached)
      }
    }
    void boot()
    return () => { cancelled = true }
  }, [])

  const executeAction = useCallback(async (action: DialogAction, activeSession: string, actionLang = lang) => {
    const actionCopy = t(actionLang)
    const placeId = action.place_id ?? place?.id ?? null
    if (action.show === 'map') {
      setPhase('catalog')
      return
    }
    if (action.show === 'sleep') {
      await endSession(false)
      setSleeping(true)
      setPhase('idle')
      return
    }
    if (!placeId) {
      setAnswer('Сначала назовите место.')
      setPhase('catalog')
      return
    }

    if (action.show === 'route') {
      try {
        const nextPlace = await api.getPlace(placeId, actionLang)
        let nextRoute: RouteResponse
        try {
          nextRoute = await api.getRoute(placeId, nextPlace.access, false, actionLang)
        } catch (error) {
          if (error instanceof ApiError && error.code === 'ROUTE_UNAVAILABLE') {
            nextRoute = await api.getRoute(placeId, nextPlace.access, true, actionLang)
          } else throw error
        }
        setPlace(nextPlace)
        setRoute(nextRoute)
        setPhase('card')
        postEvent('place_view', activeSession, placeId)
        postEvent('route_click', activeSession, placeId)
        const openText = nextPlace.hours === null
          ? actionCopy.always
          : nextPlace.is_open_now
            ? String(nextPlace.hours)
            : `${actionCopy.closed}. ${nextPlace.opens_next ?? ''}`
        const travel = nextRoute.mode === 'transit' ? actionCopy.transit : actionCopy.walk
        const approximate = nextRoute.is_approximate ? `${actionCopy.approximate}. ` : ''
        const firstStep = nextRoute.steps[0]?.instruction ? `${nextRoute.steps[0].instruction}. ` : ''
        const followUp = nextPlace.has_scene ? actionCopy.routePrompt : actionCopy.phonePrompt
        void speak(`${nextPlace.name}. ${nextPlace.summary} ${openText}. ${approximate}${travel}: ${nextRoute.distance_m} м, ${nextRoute.duration_min} мин. ${nextRoute.direction_text}. ${firstStep}${followUp}`, actionLang)
      } catch (error) {
        if (error instanceof ApiError && error.code === 'PLACE_NOT_FOUND') {
          const similar = places.slice(0, 3).map(({ id, name }) => ({ id, name }))
          setSuggestions(similar)
          setAnswer('Место не найдено. Показываю похожие места.')
          setPhase('catalog')
          void speak(`Место не найдено. Похожие места: ${similar.map((item) => item.name).join(', ')}.`, actionLang)
          return
        }
        setOffline(true)
        setAnswer('Маршрут временно недоступен. Показываю сохранённый каталог.')
        setPhase('catalog')
      }
      return
    }

    if (action.show === 'scene') {
      try {
        const nextScene = await api.getScene(placeId, actionLang)
        setScene(nextScene)
        setSceneReveal(0)
        setPhase('tarihsky')
        postEvent('scene_open', activeSession, placeId)
        const sceneText = nextScene.texts[actionLang] ?? nextScene.texts.ru
        if (sceneText) void speak(`${sceneText.title}. ${sceneText.body}`, actionLang)
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          setAnswer('У этого места пока нет истории.')
          setPhase(place ? 'card' : 'catalog')
          void speak('У этого места пока нет истории. Что ещё показать?', lang)
          return
        }
        setOffline(true)
        setPhase(place ? 'card' : 'catalog')
      }
      return
    }

    if (action.show === 'qr') {
      try {
        const [nextQr, nextPlace] = await Promise.all([
          api.createQr(placeId, actionLang, activeSession),
          api.getPlace(placeId, actionLang),
        ])
        setQr(nextQr)
        setPlace(nextPlace)
        setQrRemaining(config?.session.qr_timeout_sec ?? 60)
        setPhase('qr')
        void speak(actionCopy.scan, actionLang)
      } catch {
        setAnswer('Не удалось создать код. Я могу повторить адрес вслух.')
        setPhase(place ? 'card' : 'catalog')
        void speak('Не удалось создать код. Продиктовать адрес?', lang)
      }
    }
  }, [config?.session.qr_timeout_sec, endSession, lang, place, places, postEvent, speak])

  const submitTurn = useCallback(async (text: string, forcedSession?: string) => {
    const activeSession = forcedSession ?? sessionRef.current ?? startSession()
    lastActivity.current = Date.now()
    setGesturePrompt(false)

    const lowered = text.toLowerCase()
    if (returnPhase === 'tarihsky' && /дальше|forward|алға/.test(lowered)) setSceneReveal(100)
    if (returnPhase === 'tarihsky' && /назад|back|артқа/.test(lowered)) setSceneReveal(0)
    if (returnPhase === 'tarihsky' && /середин|middle|ортасы/.test(lowered)) setSceneReveal(50)

    setPhase('processing')
    try {
      const response = await api.dialogTurn({
        session_id: activeSession,
        lang: 'auto',
        text,
        context: { screen: returnPhase === 'tarihsky' ? 'tarihsky' : returnPhase, last_place_id: place?.id ?? null },
      })
      setLang(response.lang)
      setAnswer(response.say)
      setSuggestions(response.suggestions)
      setRetryCount(0)
      void speak(response.say, response.lang)
      if (response.lang !== lang) {
        void api.getPlaces(response.lang).then((catalogue) => {
          setPlaces(catalogue.places)
          writeCache(PLACES_CACHE, catalogue.places)
        }).catch(() => setOffline(true))
      }

      if (response.actions.length === 0) {
        setPhase(returnPhase === 'tarihsky' ? 'tarihsky' : 'catalog')
        return
      }
      for (const action of response.actions) await executeAction(action, activeSession, response.lang)
    } catch (error) {
      if (error instanceof ApiError && (error.code === 'SPEECH_UNRECOGNIZED' || error.code === 'AI_UNAVAILABLE')) {
        const nextRetry = retryCount + 1
        setRetryCount(nextRetry)
        const message = nextRetry >= 2 ? copy.spell : copy.repeat
        setAnswer(message)
        setPhase('error_speech')
        void speak(message, lang)
        return
      }
      if (error instanceof ApiError && error.code === 'RATE_LIMITED') {
        setAnswer('Подождите немного и повторите.')
        setPhase('error_speech')
        void speak('Подождите немного и повторите.', lang)
        return
      }
      setOffline(true)
      setAnswer(copy.offline)
      setPhase('catalog')
      void speak(copy.offline, lang)
    }
  }, [copy, executeAction, lang, place?.id, retryCount, returnPhase, speak, startSession])

  const beginListening = useCallback(() => {
    if (speakingRef.current) return
    if (!sessionRef.current) {
      startSession()
      return
    }
    const current = phaseRef.current
    if (current === 'processing' || current === 'qr' || current === 'recording') return
    setReturnPhase(current)
    setPhase('recording')
    lastActivity.current = Date.now()
  }, [startSession])

  const handlePresence = useCallback(() => {
    if (!sessionRef.current) startSession()
    lastActivity.current = Date.now()
  }, [startSession])

  const { db, permission } = useAmbientAudio({ enabled: true, onPresence: handlePresence, onSpeech: beginListening })
  const { interim, supported } = useSpeechRecognition({
    active: phase === 'recording',
    language: speechLocale(lang),
    onComplete: (text) => void submitTurn(text),
    onNoSpeech: () => {
      setPhase('error_speech')
      setRetryCount((current) => {
        const next = current + 1
        const message = next >= 2 ? copy.spell : copy.repeat
        setAnswer(message)
        void speak(message, lang)
        return next
      })
    },
  })

  useEffect(() => {
    if (!sessionId) return
    const gestureTimer = window.setTimeout(() => setGesturePrompt(true), 10000)
    return () => window.clearTimeout(gestureTimer)
  }, [sessionId])

  useEffect(() => {
    const timer = window.setInterval(() => {
      const elapsed = (Date.now() - lastActivity.current) / 1000
      if (sessionRef.current && elapsed >= (config?.session.idle_timeout_sec ?? 90)) {
        lastActivity.current = Date.now()
        void endSession(true)
      } else if (!sessionRef.current && elapsed >= 120 && phaseRef.current !== 'idle') {
        setSleeping(true)
        setPhase('idle')
      }
    }, 1000)
    return () => window.clearInterval(timer)
  }, [config?.session.idle_timeout_sec, endSession])

  useEffect(() => {
    if (phase !== 'tarihsky') return
    const started = performance.now()
    let frame = 0
    const promptTimer = window.setTimeout(() => void speak('Что ещё показать?', lang), 7000)
    const animate = (time: number) => {
      const progress = Math.min(100, ((time - started) / 6000) * 100)
      setSceneReveal(progress)
      if (progress < 100) frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(promptTimer)
    }
  }, [lang, phase, scene?.place_id, speak])

  useEffect(() => {
    if (phase !== 'idle' || !sleeping) return
    const timer = window.setInterval(() => void speak(copy.wake, lang), 300000)
    return () => window.clearInterval(timer)
  }, [copy.wake, lang, phase, sleeping, speak])

  useEffect(() => {
    if (phase !== 'qr' || !qr) return
    const timer = window.setInterval(() => {
      setQrRemaining((value) => {
        if (value <= 1) {
          window.clearInterval(timer)
          setQr(null)
          setAnswer('Показать что-то ещё?')
          setPhase(place ? 'card' : 'catalog')
          void speak('Показать что-то ещё?', lang)
          return config?.session.qr_timeout_sec ?? 60
        }
        return value - 1
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [config?.session.qr_timeout_sec, lang, phase, place, qr, speak])

  useEffect(() => {
    if (!isMockMode || !config || places.length === 0 || demoBooted.current) return
    const screen = new URLSearchParams(window.location.search).get('screen')
    if (!screen) return
    demoBooted.current = true
    const id = startSession()
    const actions: Record<string, DialogAction> = {
      route: { show: 'route', place_id: 2 },
      scene: { show: 'scene', place_id: 2 },
      qr: { show: 'qr', place_id: 2 },
      sleep: { show: 'sleep' },
    }
    if (actions[screen]) window.setTimeout(() => void executeAction(actions[screen], id), 500)
  }, [config, executeAction, places.length, startSession])

  if (!config) {
    return <div className="boot-screen"><div className="boot-mark">B</div><span>BaGdar</span></div>
  }

  return (
    <div className={`app phase-${phase} ${speaking ? 'is-speaking' : ''}`}>
      <Brand screenId={config.screen_id} lang={lang} live={!offline} />
      {offline && <div className="network-banner">{copy.offline}</div>}
      {phase === 'idle' && sleeping ? (
        <SleepScreen copy={copy} />
      ) : phase === 'card' && place && route ? (
        <PlaceScreen config={config} places={places} place={place} route={route} copy={copy} />
      ) : phase === 'tarihsky' && scene ? (
        <TarihSkyScreen scene={scene} lang={lang} reveal={sceneReveal} copy={copy} />
      ) : phase === 'qr' && qr ? (
        <QrScreen qr={qr} place={place} remaining={qrRemaining} copy={copy} />
      ) : (
        <CatalogScreen
          config={config}
          places={places}
          phase={phase}
          db={db}
          transcript={interim}
          answer={answer}
          copy={copy}
          suggestions={suggestions}
          gesturePrompt={gesturePrompt}
        />
      )}
      <div className="system-line">
        <span>{isMockMode ? 'LOCAL CONTRACT' : 'LIVE API'}</span>
        <i />
        <span>{permission === 'ready' ? `${Math.round(db)} dB` : permission === 'denied' ? 'MIC OFF' : 'MIC…'}</span>
        <i />
        <span>{supported ? 'VOICE READY' : 'VOICE FALLBACK'}</span>
      </div>
    </div>
  )
}
