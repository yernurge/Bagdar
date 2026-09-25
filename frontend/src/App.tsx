import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { ApiError, api, isMockMode } from './api'
import { MapView } from './components/MapView'
import { DebugConsole } from './components/DebugConsole'
import { PlacePanel } from './components/PlacePanel'
import { SceneView } from './components/SceneView'
import { SleepScreen } from './components/SleepScreen'
import { VoiceOrb } from './components/VoiceOrb'
import { useKioskVoice } from './hooks/useKioskVoice'
import { usePersonPresence } from './hooks/usePersonPresence'
import { getCopy } from './i18n'
import type { Config, DialogAction, EventType, Place, PlaceSummary, QrResponse, Route, Scene, Screen, VoiceTurn } from './types'

const DEFAULT_CONFIG: Config = {
  screen_id: 'AKTAU-EMB-01',
  origin: { lat: 43.6582, lng: 51.1352, heading_deg: 45 },
  languages: ['kk', 'ru', 'en'],
  default_lang: 'kk',
  modes: { voice: true, tarihsky: true, qr: true, huskylens: false },
  session: { idle_timeout_sec: 90, qr_timeout_sec: 60 },
  district: 'aktau-15-mkr',
  categories: [],
}

function speak(text: string, lang: string) {
  if (!('speechSynthesis' in window) || !text) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = lang
  utterance.rate = 0.95
  window.speechSynthesis.speak(utterance)
}

export default function App() {
  const [config, setConfig] = useState(DEFAULT_CONFIG)
  const [places, setPlaces] = useState<PlaceSummary[]>([])
  const [screen, setScreen] = useState<Screen>('idle')
  const [lang, setLang] = useState('kk')
  const [subtitle, setSubtitle] = useState('')
  const [selected, setSelected] = useState<Place | null>(null)
  const [route, setRoute] = useState<Route | null>(null)
  const [scene, setScene] = useState<Scene | null>(null)
  const [scenePosition, setScenePosition] = useState(0)
  const [sceneAuto, setSceneAuto] = useState(true)
  const [qr, setQr] = useState<QrResponse | null>(null)
  const [suggestions, setSuggestions] = useState<{ id: number; name: string }[]>([])
  const [offline, setOffline] = useState(!navigator.onLine && !isMockMode)
  const [errorMessage, setErrorMessage] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [gesturePrompt, setGesturePrompt] = useState(false)
  const screenRef = useRef(screen)
  const turnOriginScreenRef = useRef<Screen>('idle')
  const sessionIdRef = useRef<string | null>(null)
  const lastPlaceRef = useRef<number | null>(null)
  const activityAt = useRef(Date.now())
  const lastSpeechAt = useRef(Date.now())
  const sessionActive = useRef(false)
  const qrOpenedAt = useRef(0)
  const retryCount = useRef(0)
  const gestureShown = useRef(false)
  const debugTurnSent = useRef(false)
  const copy = getCopy(lang)
  const debugParams = useMemo(() => new URLSearchParams(window.location.search), [])
  const debugMode = debugParams.get('debug') === '1'
  const debugTurn = debugParams.get('turn')

  useEffect(() => { screenRef.current = screen }, [screen])
  useEffect(() => { lastPlaceRef.current = selected?.id ?? lastPlaceRef.current }, [selected])

  const track = useCallback((type: EventType, placeId: number | null = null) => {
    const currentSessionId = sessionIdRef.current
    if (currentSessionId) void api.event(currentSessionId, type, lang, placeId).catch(() => undefined)
  }, [lang])

  const beginSession = useCallback(() => {
    activityAt.current = Date.now()
    if (sessionActive.current && sessionIdRef.current) return sessionIdRef.current
    const nextSessionId = crypto.randomUUID()
    sessionIdRef.current = nextSessionId
    setSessionId(nextSessionId)
    sessionActive.current = true
    void api.event(nextSessionId, 'session_start', lang).catch(() => undefined)
    return nextSessionId
  }, [lang])

  const resetSession = useCallback(async (sleep = false) => {
    const endingId = sessionIdRef.current
    if (sessionActive.current && endingId) void api.endSession(endingId).catch(() => undefined)
    sessionActive.current = false
    sessionIdRef.current = null
    setSessionId(null)
    setSelected(null)
    setRoute(null)
    setScene(null)
    setQr(null)
    setSuggestions([])
    setSubtitle('')
    setGesturePrompt(false)
    lastPlaceRef.current = null
    retryCount.current = 0
    gestureShown.current = false
    setScreen(sleep ? 'sleep' : 'idle')
  }, [])

  const handleArrival = useCallback(() => {
    activityAt.current = Date.now()
    if (screenRef.current !== 'sleep' && (sessionActive.current || screenRef.current !== 'idle')) return
    beginSession()
    setScreen('idle')
    setSubtitle(copy.hello)
    speak(copy.hello, lang)
  }, [beginSession, copy.hello, lang])

  const { present: personPresent, cameraState } = usePersonPresence(config.modes.huskylens, handleArrival)

  useEffect(() => {
    if (!personPresent) {
      setGesturePrompt(false)
      gestureShown.current = false
      return
    }
    const timer = window.setTimeout(() => {
      const speechSilentFor = Date.now() - lastSpeechAt.current
      if (speechSilentFor >= 10_000 && screenRef.current !== 'recording' && screenRef.current !== 'processing' && !gestureShown.current) {
        gestureShown.current = true
        setGesturePrompt(true)
        speak(copy.gesture, lang)
      }
    }, 10_000)
    return () => window.clearTimeout(timer)
  }, [copy.gesture, lang, personPresent])

  useEffect(() => {
    if (screen !== 'sleep') return
    const timer = window.setInterval(() => speak(copy.sleepHint, lang), 300_000)
    return () => window.clearInterval(timer)
  }, [copy.sleepHint, lang, screen])

  useEffect(() => {
    const handleOnline = () => setOffline(false)
    const handleOffline = () => setOffline(true)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    void api.config()
      .then((value) => {
        setConfig(value)
        setLang(value.default_lang)
        return api.places(value.default_lang)
      })
      .then((value) => setPlaces(value.places))
      .catch(() => {
        setOffline(true)
        void api.places(DEFAULT_CONFIG.default_lang).then((value) => setPlaces(value.places)).catch(() => undefined)
      })

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => {
      const inactiveFor = (Date.now() - activityAt.current) / 1000
      const qrOpenFor = (Date.now() - qrOpenedAt.current) / 1000
      if (screenRef.current === 'qr' && qrOpenedAt.current && qrOpenFor >= config.session.qr_timeout_sec) {
        setQr(null)
        setScreen('catalog')
        speak(copy.prompt, lang)
      } else if (sessionActive.current && inactiveFor >= config.session.idle_timeout_sec) {
        speak(copy.goodbye, lang)
        void resetSession(false)
      } else if (!sessionActive.current && !personPresent && inactiveFor >= 120 && screenRef.current !== 'sleep') {
        setScreen('sleep')
      }
    }, 1000)
    return () => window.clearInterval(timer)
  }, [config.session, copy.goodbye, copy.prompt, lang, personPresent, resetSession])

  const showRoute = useCallback(async (placeId: number, requestLang: string) => {
    const place = await api.place(placeId, requestLang)
    let nextRoute: Route
    try {
      nextRoute = await api.route(placeId, place.access)
    } catch (error) {
      if (!(error instanceof ApiError) || error.code !== 'ROUTE_UNAVAILABLE') throw error
      nextRoute = await api.route(placeId, place.access, true)
    }
    setSelected(place)
    setRoute(nextRoute)
    setScreen('card')
    track('place_view', placeId)
    track('route_click', placeId)
    const routeCopy = getCopy(requestLang)
    const distance = nextRoute.distance_m >= 1000 ? `${(nextRoute.distance_m / 1000).toFixed(1)} км` : `${nextRoute.distance_m} м`
    const mode = nextRoute.mode === 'transit' ? routeCopy.transit : routeCopy.walk
    const hours = place.hours === null ? routeCopy.alwaysOpen : place.is_open_now ? place.hours : `${routeCopy.closed}${place.opens_next ? `, ${place.opens_next}` : ''}`
    const followUp = place.has_scene ? routeCopy.afterPlace : routeCopy.sendToPhone
    speak(`${place.name}. ${routeCopy.routeNarration(distance, Math.round(nextRoute.duration_min), nextRoute.direction_text, mode, nextRoute.is_approximate, nextRoute.steps[0]?.instruction)} ${hours}. ${followUp}`, requestLang)
  }, [track])

  const runAction = useCallback(async (action: DialogAction, responsePlaceId: number | null, responseLang: string) => {
    const placeId = action.place_id ?? responsePlaceId ?? lastPlaceRef.current
    if (action.show === 'sleep') return resetSession(true)
    if (action.show === 'map') {
      setScreen('catalog')
      return
    }
    if (!placeId) return
    if (action.show === 'route') return showRoute(placeId, responseLang)
    if (action.show === 'scene') {
      try {
        const value = await api.scene(placeId)
        setScene(value)
        setScenePosition(0)
        setSceneAuto(true)
        setScreen('tarihsky')
        track('scene_open', placeId)
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          speak(getCopy(responseLang).noScene, responseLang)
          setScreen('catalog')
          return
        }
        throw error
      }
      return
    }
    if (action.show === 'qr') {
      const currentSessionId = sessionIdRef.current
      if (!currentSessionId) return
      const value = await api.qr(placeId, responseLang, currentSessionId)
      setQr(value)
      qrOpenedAt.current = Date.now()
      setScreen('qr')
      const qrCopy = getCopy(responseLang)
      speak(`${qrCopy.scan}. ${qrCopy.qrHint}`, responseLang)
    }
  }, [resetSession, showRoute, track])

  const handleTurn = useCallback(async (turn: VoiceTurn) => {
    activityAt.current = Date.now()
    lastSpeechAt.current = Date.now()
    setGesturePrompt(false)
    const currentSessionId = beginSession()

    const turnScreen = screenRef.current === 'recording' ? turnOriginScreenRef.current : screenRef.current
    if (turn.text && turnScreen === 'tarihsky') {
      const command = turn.text.toLowerCase()
      if (/середин|орта|middle/.test(command)) { setSceneAuto(false); setScreen('tarihsky'); return setScenePosition(50) }
      if (/дальше|алға|forward|next/.test(command)) { setSceneAuto(false); setScreen('tarihsky'); return setScenePosition((value) => Math.min(100, value + 25)) }
      if (/назад|артқа|back/.test(command)) { setSceneAuto(false); setScreen('tarihsky'); return setScenePosition((value) => Math.max(0, value - 25)) }
    }

    setScreen('processing')
    setErrorMessage('')
    try {
      const response = await api.dialog(currentSessionId, turn, turnScreen, lastPlaceRef.current)
      setLang(response.lang)
      void api.places(response.lang).then((value) => setPlaces(value.places)).catch(() => setOffline(true))
      setSubtitle(response.say)
      setSuggestions(response.suggestions)
      retryCount.current = 0
      speak(response.say, response.lang)
      if (!response.actions.length) setScreen(response.suggestions.length ? 'catalog' : 'idle')
      for (const action of response.actions) await runAction(action, response.place_id, response.lang)
      if (response.intent === 'goodbye') await resetSession(false)
    } catch (error) {
      const known = error instanceof ApiError ? error : new ApiError(500, 'INTERNAL', copy.repeat)
      retryCount.current += 1
      const similar = places.slice(0, 3).map(({ id, name }) => ({ id, name }))
      const message = known.code === 'PLACE_NOT_FOUND'
        ? `${copy.noPlace} ${similar.map(({ name }) => name).join(', ')}. `
        : known.code === 'RATE_LIMITED'
        ? 'Подождите немного перед следующим вопросом.'
        : retryCount.current >= 2
          ? `${copy.repeat} Назовите место по буквам.`
          : copy.repeat
      setErrorMessage(message)
      setSubtitle(message)
      if (known.code === 'PLACE_NOT_FOUND') setSuggestions(similar)
      setScreen(known.code === 'PLACE_NOT_FOUND' ? 'catalog' : 'error_speech')
      speak(message, lang)
      if (known.code === 'NETWORK_UNAVAILABLE') setOffline(true)
    }
  }, [beginSession, copy.noPlace, copy.repeat, lang, places, resetSession, runAction])

  const handleWake = useCallback(() => {
    handleArrival()
  }, [handleArrival])

  const handleSpeechStart = useCallback(() => {
    activityAt.current = Date.now()
    lastSpeechAt.current = Date.now()
    setGesturePrompt(false)
    beginSession()
    turnOriginScreenRef.current = screenRef.current
    setScreen('recording')
    setSubtitle(copy.listening)
  }, [beginSession, copy.listening])

  const handleVoiceError = useCallback(() => {
    setErrorMessage(copy.repeat)
    setScreen('error_speech')
  }, [copy.repeat])

  const handleSceneComplete = useCallback(() => {
    speak(copy.sceneDone, lang)
  }, [copy.sceneDone, lang])

  useEffect(() => {
    if (!debugMode || !debugTurn || debugTurnSent.current) return
    const timer = window.setTimeout(() => {
      debugTurnSent.current = true
      void handleTurn({ text: debugTurn })
    }, 800)
    return () => window.clearTimeout(timer)
  }, [debugMode, debugTurn, handleTurn])

  const locale = useMemo(() => lang === 'kk' ? 'kk-KZ' : lang === 'en' ? 'en-US' : lang === 'ru' ? 'ru-RU' : lang, [lang])
  const { db, permission } = useKioskVoice({
    enabled: true,
    acceptSpeech: screen !== 'processing' && screen !== 'recording' && screen !== 'sleep',
    preferRecordedAudio: !isMockMode,
    locale,
    onWake: handleWake,
    onSpeechStart: handleSpeechStart,
    onTurn: handleTurn,
    onError: handleVoiceError,
  })

  if (screen === 'sleep') return <SleepScreen hint={copy.sleepHint} />

  const orbState = screen === 'recording' ? 'listening' : screen === 'processing' ? 'processing' : screen === 'error_speech' ? 'error' : 'idle'
  const orbLabel = permission === 'denied' ? copy.microphone : screen === 'processing' ? copy.processing : screen === 'recording' ? copy.listening : screen === 'error_speech' ? errorMessage : copy.prompt

  return (
    <div className={`app-shell${screen === 'qr' ? ' app-shell--qr' : ''}`}>
      <header className="topbar">
        <div className="brand"><span>BaGdar</span><small>Digital field guide · Маңғыстау</small></div>
        <div className="topbar__coordinate">43°39′ N / 51°08′ E</div>
        <div className="topbar__status"><span className={offline ? 'status-dot status-dot--offline' : 'status-dot'} />{offline ? copy.offline : `${isMockMode ? 'DEMO · ' : ''}${config.screen_id}`}</div>
      </header>

      {gesturePrompt && <aside className="gesture-prompt"><span>10 sec</span><strong>{copy.gesture}</strong><small>{cameraState === 'active' ? 'CAMERA ACTIVE' : 'SIGN MODE READY'}</small></aside>}

      {screen === 'tarihsky' && scene ? (
        <SceneView scene={scene} lang={lang} copy={copy} position={scenePosition} auto={sceneAuto} onPosition={setScenePosition} onComplete={handleSceneComplete} />
      ) : screen === 'qr' && qr ? (
        <main className="qr-screen">
          <div className="qr-screen__copy"><span>BaGdar mobile</span><h1>{copy.scan}</h1><p>{copy.qrHint}</p></div>
          <div className="qr-screen__code"><QRCodeSVG value={qr.url} size={380} level="H" marginSize={3} /></div>
        </main>
      ) : (
        <main className="main-stage">
          <section className="main-stage__map">
            <MapView config={config} places={places} selected={selected} route={route} />
            <div className="map-index"><span>01</span><small>ATLAS / AKTAU</small></div>
            <div className="map-caption"><span>Каспий теңізі · Caspian Sea</span><strong>{String(places.length).padStart(2, '0')} орын</strong></div>
          </section>
          <section className="main-stage__content">
            {screen === 'card' && selected && route ? (
              <PlacePanel config={config} place={selected} route={route} copy={copy} />
            ) : (
              <div className="welcome">
                <div className="welcome__meta"><span>Voice-led city atlas</span><span>{sessionId ? `S / ${sessionId.slice(0, 6)}` : '№ 001'}</span></div>
                <div className="welcome__kicker">Сәлем · Привет · Hello</div>
                <h1>{subtitle || copy.hello}</h1>
                {suggestions.length > 0 && <div className="suggestions">{suggestions.slice(0, 3).map((item, index) => <div key={item.id}><span>0{index + 1}</span>{item.name}</div>)}</div>}
                {places[0] && (
                  <figure className="welcome__feature">
                    <img src={places[0].thumb_url} alt="" onError={(event) => { event.currentTarget.style.display = 'none' }} />
                    <figcaption><span>{places[0].name}</span><small>{places[0].category} · {String(places[0].id).padStart(2, '0')}</small></figcaption>
                  </figure>
                )}
                {!places[0] && (
                  <figure className="welcome__feature welcome__feature--empty">
                    <figcaption><span>Ақтау</span><small>Каспий жағалауы · 43°39′ N</small></figcaption>
                  </figure>
                )}
                <div className="place-strip">{places.slice(1, 4).map((place, index) => <div key={place.id}><small>0{index + 2}</small><span>{place.name}</span><em>{place.category}</em></div>)}</div>
              </div>
            )}
          </section>
        </main>
      )}

      <footer className="voice-dock">
        <VoiceOrb db={db} state={orbState} label={orbLabel} />
        <div className="voice-dock__meter"><span style={{ width: `${Math.max(4, Math.min(100, (db + 72) * 2.4))}%` }} /></div>
        <div className="voice-dock__lang">AUTO · {lang.toUpperCase()}</div>
      </footer>
      {debugMode && !debugTurn && <DebugConsole onTurn={(text) => void handleTurn({ text })} />}
    </div>
  )
}
