import { useEffect, useRef, useState } from 'react'
import { QUICK_QUESTIONS, THEME_LABELS, type StoryTheme } from './data/route'
import { REGION_META, ROAM_MAP_POIS, totalStoryMinutes } from './data/storyCatalog'
import { DEMO_PATHS, type RoadPath } from './data/roads'
import type { StorySpot } from './data/storyCatalog'
import { RouteMap } from './components/RouteMap'
import { useDriveSimulation } from './hooks/useDriveSimulation'
import { useSpeech } from './hooks/useSpeech'
import { useStoryEngine } from './hooks/useStoryEngine'
import './App.css'

function formatKm(km: number) {
  return `${km.toFixed(1)} km`
}

function formatCoord(n: number) {
  return n.toFixed(5)
}

const ASK_BRIDGES: Record<StoryTheme, string> = {
  food: '好，那我先偏美食來講。',
  history: '好，那我先把歷史線拉開。',
  people: '好，那我先講人物與地方脾氣。',
  legend: '好，那我先講點有趣的奇聞。',
  industry: '好，那我先從產業與產業地景講起。',
  nature: '好，那我先帶你看風景與地景。',
}

const SPEED_OPTIONS = [1, 1.25, 1.5, 1.75, 2] as const

function formatSpeed(mul: number) {
  return `${mul}x`
}

export default function App() {
  const drive = useDriveSimulation({
    baseSpeedKmh: 48,
    initialPlaying: false,
  })
  const speech = useSpeech()
  const stories = useStoryEngine()
  const [started, setStarted] = useState(false)
  const [answerNote, setAnswerNote] = useState<string | null>(null)

  const startedRef = useRef(false)
  const autoRef = useRef(true)
  const focusRef = useRef<StoryTheme | null>(null)
  const poseRef = useRef({ lat: 0, lng: 0, bearing: 0 })
  const playRef = useRef(stories.playForPosition)
  const speakRef = useRef<(clip: StorySpot) => void>(() => undefined)
  const speedMulRef = useRef(drive.speedMul)

  startedRef.current = started
  autoRef.current = stories.autoContinue
  focusRef.current = stories.focusTheme
  playRef.current = stories.playForPosition
  speedMulRef.current = drive.speedMul
  poseRef.current = {
    lat: drive.position.lat,
    lng: drive.position.lng,
    bearing: drive.position.bearing,
  }

  const setPlaybackRate = speech.setPlaybackRate
  useEffect(() => {
    setPlaybackRate(drive.speedMul)
  }, [drive.speedMul, setPlaybackRate])

  const queueNext = () => {
    if (!startedRef.current || !autoRef.current) return
    const { lat, lng, bearing } = poseRef.current
    const next = playRef.current(
      { lat, lng },
      bearing,
      focusRef.current ?? undefined,
    )
    if (next) speakRef.current(next)
  }

  const speakClip = (clip: StorySpot) => {
    const rate = speedMulRef.current
    speech.setPlaybackRate(rate)
    speech.speak(`${clip.placeLabel}。${clip.title}。${clip.script}`, {
      audioUrl: clip.audioUrl || undefined,
      rate,
      onEnded: queueNext,
    })
  }
  speakRef.current = speakClip

  const setSpeedBoth = (mul: number) => {
    speedMulRef.current = mul
    drive.setSpeedMul(mul)
    speech.setPlaybackRate(mul)
  }

  const begin = () => {
    stories.resetEngine()
    drive.reset()
    speech.stop()
    speech.setPlaybackRate(speedMulRef.current)
    setStarted(true)
    setAnswerNote(
      `漫遊示範：${drive.path.label}。路線沿實際道路前進，不切西瓜直線。`,
    )
    drive.setPlaying(true)
    const first =
      stories.forcePoi('chiayi-hall') ||
      stories.playForPosition(
        {
          lat: drive.position.lat,
          lng: drive.position.lng,
        },
        drive.position.bearing,
      )
    if (first) speakClip(first)
  }

  const onAsk = (theme: StoryTheme, label: string) => {
    const clip = stories.askAbout(
      theme,
      { lat: drive.position.lat, lng: drive.position.lng },
      drive.position.bearing,
    )
    if (clip) {
      speakClip(clip)
      setAnswerNote(
        `${ASK_BRIDGES[theme]}已依「${label}」切到「${THEME_LABELS[theme]}」焦點；會優先講視線前方的同類故事。`,
      )
    } else {
      stories.bumpTheme(theme, 2)
      setAnswerNote('暫時沒有對應片段，但已把這個興趣設成焦點。')
    }
  }

  const jumpToPoi = (poi: (typeof ROAM_MAP_POIS)[number]) => {
    drive.jumpToLatLng({ lat: poi.lat, lng: poi.lng })
    drive.setPlaying(false)
    setStarted(true)
    const clip = stories.forcePoi(poi.id)
    if (clip) speakClip(clip)
    setAnswerNote(`已跳到「${poi.name}」附近（沿目前道路對位，不是直線瞬移切線）。`)
  }

  const switchPath = (next: RoadPath) => {
    speech.stop()
    stories.resetEngine()
    drive.setPath(next)
    setStarted(false)
    setAnswerNote(`已切換示範路徑：${next.label}`)
  }

  const storyMinutes = totalStoryMinutes()

  return (
    <div className="app-shell">
      <div className="atmosphere" aria-hidden />

      {!started ? (
        <header className="hero">
          <p className="brand">{REGION_META.brand}</p>
          <h1>{REGION_META.title}</h1>
          <p className="lede">{REGION_META.subtitle}</p>
          <p className="lede subtle">
            範圍先鎖定{REGION_META.region}。示範路徑約 {REGION_META.approxKm} km、
            {storyMinutes} 分鐘可聽素材；選題改看「前方視線」，沒景點就用路名過渡。
          </p>
          <div className="hero-cta">
            <button type="button" className="btn primary" onClick={begin}>
              開始沿路漫遊
            </button>
            <p className="hero-meta">
              {drive.path.fromLabel} → {drive.path.toLabel}
              <span>·</span>
              約 {drive.path.distanceKm} km
              <span>·</span>
              沿實際道路
            </p>
          </div>
          <div className="path-switch">
            {DEMO_PATHS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`btn chip ${drive.path.id === p.id ? 'on' : ''}`}
                onClick={() => switchPath(p)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </header>
      ) : (
        <header className="topbar">
          <div>
            <p className="brand sm">{REGION_META.brand}</p>
            <p className="route-line">
              {drive.path.fromLabel} → {drive.path.toLabel}
              <span className="tag soft">無終點漫遊</span>
            </p>
          </div>
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              speech.stop()
              stories.resetEngine()
              drive.reset()
              speedMulRef.current = 1
              drive.setSpeedMul(1)
              speech.setPlaybackRate(1)
              setStarted(false)
              setAnswerNote(null)
            }}
          >
            回到起點
          </button>
        </header>
      )}

      <main className={`stage ${started ? 'live' : 'preview'}`}>
        <section className="map-panel">
          <RouteMap
            lat={drive.position.lat}
            lng={drive.position.lng}
            bearing={drive.position.bearing}
            activePoiId={stories.activePoiId}
            path={drive.path}
            showVisionCone={started}
          />
          <div className="gps-chip">
            <span className="dot" />
            模擬定位 {formatCoord(drive.position.lat)},{' '}
            {formatCoord(drive.position.lng)} · 航向{' '}
            {Math.round(drive.position.bearing)}°
          </div>
        </section>

        <section className="control-panel">
          <div className="progress-block">
            <div className="progress-head">
              <strong>沿路進度（示範路徑）</strong>
              <span>
                已走 {formatKm(drive.distanceKm)} · 剩餘{' '}
                {formatKm(drive.remainingKm)}
              </span>
            </div>
            <input
              className="scrubber"
              type="range"
              min={0}
              max={1}
              step={0.001}
              value={drive.progress}
              onChange={(e) => {
                setStarted(true)
                drive.setProgress(Number(e.target.value))
              }}
              aria-label="沿路行駛進度"
            />
            <div className="controls">
              <button
                type="button"
                className="btn primary"
                onClick={() => {
                  if (!started) begin()
                  else drive.toggle()
                }}
              >
                {!started ? '出發' : drive.playing ? '暫停' : '繼續開'}
              </button>
              {SPEED_OPTIONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`btn chip ${drive.speedMul === m ? 'on' : ''}`}
                  onClick={() => setSpeedBoth(m)}
                  title="同時調整行車速度與語音倍速"
                >
                  {formatSpeed(m)}
                </button>
              ))}
              <button
                type="button"
                className={`btn chip ${stories.autoContinue ? 'on' : ''}`}
                onClick={() => stories.setAutoContinue(!stories.autoContinue)}
              >
                {stories.autoContinue ? '連播中' : '連播關'}
              </button>
              <button
                type="button"
                className="btn chip"
                onClick={() => speech.stop()}
                disabled={!speech.speaking}
              >
                停止語音
              </button>
            </div>
            <p className="hint">
              選題：{stories.lastPickReason}
              {' · '}
              倍速 {formatSpeed(drive.speedMul)}/{formatSpeed(speech.playbackRate)}
              {' · '}
              {speech.engine === 'neural'
                ? '神經語音'
                : speech.engine === 'browser'
                  ? '瀏覽器備援'
                  : '無語音'}
              {' · '}
              已聽 {stories.heardCount}/{stories.totalClips}
              {' · '}
              剩餘約 {stories.remainingMin}/{stories.totalMin} 分
            </p>
          </div>

          <article className="story-panel">
            {stories.activeClip ? (
              <>
                <p className="eyebrow">
                  {stories.activeClip.placeLabel}
                  <span className="tag">
                    {THEME_LABELS[stories.activeClip.theme]}
                  </span>
                  <span className="tag soft">
                    {stories.activeClip.layer === 'placename'
                      ? '地名故事'
                      : '視線故事'}
                  </span>
                  {stories.focusTheme && (
                    <span className="tag focus">
                      焦點：{THEME_LABELS[stories.focusTheme]}
                    </span>
                  )}
                </p>
                <h2>{stories.activeClip.title}</h2>
                <p className="script">{stories.activeClip.script}</p>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => speakClip(stories.activeClip!)}
                >
                  {speech.speaking ? '朗讀中…' : '再聽一次'}
                </button>
              </>
            ) : (
              <>
                <p className="eyebrow">視線驅動說書</p>
                <h2>開起來之後，講你前方看得到的</h2>
                <p className="script">
                  不再用「固定路線進度條」硬接故事。系統會看車頭方向與前方視錐，優先講即將進入視線的景點；若這段路比較空，就先用路名、地名幫你過渡，保持臨場感。
                </p>
              </>
            )}
          </article>

          <section className="ask-panel">
            <h3>跟副駕說一句</h3>
            <p className="ask-lead">
              一提問就會打斷當前內容，並在視線前方改找該主題；後續連播也會偏向你的興趣。
            </p>
            <div className="ask-row">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q.label}
                  type="button"
                  className={`btn ask ${stories.focusTheme === q.theme ? 'on' : ''}`}
                  onClick={() => onAsk(q.theme, q.label)}
                >
                  {q.label}
                </button>
              ))}
              {stories.focusTheme && (
                <button
                  type="button"
                  className="btn chip"
                  onClick={() => {
                    stories.clearFocus()
                    setAnswerNote('已恢復均衡選題，不再鎖定單一主題。')
                  }}
                >
                  恢復均衡
                </button>
              )}
            </div>
            {answerNote && <p className="note">{answerNote}</p>}
            <div className="pref-row">
              <span>目前興趣偏向：</span>
              {stories.topThemes.map(([theme, score]) => (
                <span
                  key={theme}
                  className={`pref-pill ${stories.focusTheme === theme ? 'focus' : ''}`}
                >
                  {THEME_LABELS[theme]} {score.toFixed(1)}
                </span>
              ))}
            </div>
          </section>
        </section>
      </main>

      <section className="poi-rail" aria-label="可跳轉的故事點">
        {ROAM_MAP_POIS.map((p) => {
          const active = stories.activePoiId === p.id
          return (
            <button
              key={p.id}
              type="button"
              className={`poi-card ${active ? 'active' : ''}`}
              onClick={() => jumpToPoi(p)}
            >
              <strong>
                {p.name}
                <span>{p.county}</span>
              </strong>
              <em>{p.blurb}</em>
            </button>
          )
        })}
      </section>

      {stories.visitLog.length > 0 && (
        <footer className="log">
          <h3>本趟聽過</h3>
          <ul>
            {stories.visitLog.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </footer>
      )}
    </div>
  )
}
