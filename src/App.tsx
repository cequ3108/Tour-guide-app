import { useEffect, useRef, useState } from 'react'
import {
  POINTS_OF_INTEREST,
  QUICK_QUESTIONS,
  ROUTE_META,
  THEME_LABELS,
  type StoryTheme,
} from './data/route'
import { TOTAL_NARRATION_MIN, type NarrationClip } from './data/narration'
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

export default function App() {
  const drive = useDriveSimulation({
    baseSpeedKmh: 57,
    initialPlaying: false,
  })
  const speech = useSpeech()
  const stories = useStoryEngine()
  const [started, setStarted] = useState(false)
  const [answerNote, setAnswerNote] = useState<string | null>(null)
  const progressRef = useRef(0)
  const startedRef = useRef(false)
  const autoRef = useRef(true)
  const focusRef = useRef<StoryTheme | null>(null)
  const playRef = useRef(stories.playForProgress)
  const speakRef = useRef<(clip: NarrationClip) => void>(() => undefined)

  progressRef.current = drive.progress
  startedRef.current = started
  autoRef.current = stories.autoContinue
  focusRef.current = stories.focusTheme
  playRef.current = stories.playForProgress

  const setPlaybackRate = speech.setPlaybackRate
  useEffect(() => {
    setPlaybackRate(drive.speedMul)
  }, [drive.speedMul, setPlaybackRate])

  const queueNext = () => {
    if (!startedRef.current || !autoRef.current) return
    const next = playRef.current(
      progressRef.current,
      focusRef.current ?? undefined,
    )
    if (next) speakRef.current(next)
  }

  const speakClip = (clip: NarrationClip) => {
    // Always use the same pre-rendered neural voice as the main line.
    speech.speak(`${clip.placeLabel}。${clip.title}。${clip.script}`, {
      audioUrl: clip.audioUrl,
      onEnded: queueNext,
    })
  }
  speakRef.current = speakClip

  const setSpeedBoth = (mul: number) => {
    drive.setSpeedMul(mul)
    speech.setPlaybackRate(mul)
  }

  const begin = () => {
    stories.resetEngine()
    drive.reset()
    speech.stop()
    speech.setPlaybackRate(1)
    setStarted(true)
    setAnswerNote(null)
    drive.setPlaying(true)
    const first = stories.forcePoi('huwei') || stories.playForProgress(0)
    if (first) speakClip(first)
  }

  const onAsk = (theme: StoryTheme, label: string) => {
    const clip = stories.askAbout(theme)
    if (clip) {
      // Interrupt and pivot, but keep the same neural voice (no browser TTS bridge).
      speakClip(clip)
      setAnswerNote(
        `${ASK_BRIDGES[theme]}已依「${label}」切到「${THEME_LABELS[theme]}」焦點，後續連播會優先講這類。`,
      )
    } else {
      stories.bumpTheme(theme, 2)
      setAnswerNote('暫時沒有對應片段，但已把這個興趣設成焦點。')
    }
  }

  const jumpTo = (poiId: string, progress: number) => {
    drive.setProgress(progress)
    drive.setPlaying(false)
    setStarted(true)
    const clip = stories.forcePoi(poiId)
    if (clip) speakClip(clip)
    setAnswerNote(null)
  }

  return (
    <div className="app-shell">
      <div className="atmosphere" aria-hidden />

      {!started ? (
        <header className="hero">
          <p className="brand">{ROUTE_META.brand}</p>
          <h1>{ROUTE_META.title}</h1>
          <p className="lede">{ROUTE_META.subtitle}</p>
          <p className="lede subtle">
            本趟備妥約 {TOTAL_NARRATION_MIN}{' '}
            分鐘說書（含路段連播）。倍速會同時加快行車與語音；你一提問，後續說書會立刻跟著興趣轉向。
          </p>
          <div className="hero-cta">
            <button type="button" className="btn primary" onClick={begin}>
              開始模擬行駛
            </button>
            <p className="hero-meta">
              {ROUTE_META.from} → {ROUTE_META.to}
              <span>·</span>
              約 {ROUTE_META.approxKm} km
            </p>
          </div>
        </header>
      ) : (
        <header className="topbar">
          <div>
            <p className="brand sm">{ROUTE_META.brand}</p>
            <p className="route-line">
              {ROUTE_META.from} → {ROUTE_META.to}
            </p>
          </div>
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              speech.stop()
              stories.resetEngine()
              drive.reset()
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
            activePoiId={stories.activePoi?.id ?? null}
          />
          <div className="gps-chip">
            <span className="dot" />
            模擬定位 {formatCoord(drive.position.lat)},{' '}
            {formatCoord(drive.position.lng)}
          </div>
        </section>

        <section className="control-panel">
          <div className="progress-block">
            <div className="progress-head">
              <strong>行駛進度</strong>
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
              aria-label="模擬行駛進度"
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
              {[1, 2, 4].map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`btn chip ${drive.speedMul === m ? 'on' : ''}`}
                  onClick={() => setSpeedBoth(m)}
                  title="同時調整行車速度與語音倍速"
                >
                  {m}x
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
              倍速同步：行車 {drive.speedMul}x · 語音 {speech.playbackRate}x
              {' · '}
              {speech.engine === 'neural'
                ? '神經語音'
                : speech.engine === 'browser'
                  ? '瀏覽器備援'
                  : '無語音'}
              {' · '}
              已聽 {stories.heardCount}/{stories.totalClips} 則（不重複往前接）
              {' · '}
              剩餘約 {stories.remainingMin} / {stories.totalMin} 分
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
                <p className="eyebrow">準備連播說書</p>
                <h2>開起來之後，故事會一段接一段</h2>
                <p className="script">
                  點倍速會同時加快車速與語音。每則故事只講一次，講完會往下一段與沿途小村落過渡，不會卡在同題重播；你一提問，焦點也會立刻轉向。
                </p>
              </>
            )}
          </article>

          <section className="ask-panel">
            <h3>跟副駕說一句</h3>
            <p className="ask-lead">
              一提問就會打斷當前內容、立刻改講該主題，並把後續說書轉向你的興趣。
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

      <section className="poi-rail" aria-label="沿途故事點">
        {POINTS_OF_INTEREST.map((p) => {
          const active = stories.activePoi?.id === p.id
          const passed = drive.progress >= p.progress
          return (
            <button
              key={p.id}
              type="button"
              className={`poi-card ${active ? 'active' : ''} ${passed ? 'passed' : ''}`}
              onClick={() => jumpTo(p.id, p.progress)}
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
