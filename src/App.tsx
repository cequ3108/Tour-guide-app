import { useEffect, useRef, useState } from 'react'
import {
  POINTS_OF_INTEREST,
  QUICK_QUESTIONS,
  ROUTE_META,
  THEME_LABELS,
  type StoryTheme,
} from './data/route'
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

export default function App() {
  const drive = useDriveSimulation({ initialPlaying: false })
  const speech = useSpeech()
  const stories = useStoryEngine()
  const [started, setStarted] = useState(false)
  const [answerNote, setAnswerNote] = useState<string | null>(null)
  const lastTriggerProgress = useRef(-1)

  const tryTriggerAtProgress = stories.tryTriggerAtProgress
  const speak = speech.speak

  useEffect(() => {
    if (!started) return
    if (Math.abs(drive.progress - lastTriggerProgress.current) < 0.001) return
    lastTriggerProgress.current = drive.progress
    const hit = tryTriggerAtProgress(drive.progress)
    if (hit) {
      speak(`${hit.poi.name}。${hit.story.script}`)
      setAnswerNote(null)
    }
  }, [drive.progress, started, tryTriggerAtProgress, speak])

  const begin = () => {
    stories.resetEngine()
    drive.reset()
    speech.stop()
    lastTriggerProgress.current = -1
    setStarted(true)
    setAnswerNote(null)
    drive.setPlaying(true)
    // 出發點先講虎尾
    const first = stories.forcePoi('huwei')
    if (first) speech.speak(`${first.poi.name}。${first.story.script}`)
  }

  const onAsk = (theme: StoryTheme, label: string) => {
    const story = stories.askAbout(theme)
    if (story) {
      speech.speak(`你問：${label}。${story.script}`)
      setAnswerNote(`已加重「${THEME_LABELS[theme]}」興趣權重，之後會多講這類故事。`)
    } else {
      setAnswerNote('這個地點暫時沒有對應主題的故事，已先記下你的興趣。')
      stories.bumpTheme(theme, 1.5)
    }
  }

  const jumpTo = (poiId: string, progress: number) => {
    drive.setProgress(progress)
    drive.setPlaying(false)
    setStarted(true)
    const hit = stories.forcePoi(poiId)
    if (hit) {
      speech.speak(`${hit.poi.name}。${hit.story.script}`)
      setAnswerNote(null)
    }
  }

  return (
    <div className="app-shell">
      <div className="atmosphere" aria-hidden />

      {!started ? (
        <header className="hero">
          <p className="brand">{ROUTE_META.brand}</p>
          <h1>{ROUTE_META.title}</h1>
          <p className="lede">{ROUTE_META.subtitle}</p>
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
            模擬定位 {formatCoord(drive.position.lat)}, {formatCoord(drive.position.lng)}
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
                  onClick={() => drive.setSpeedMul(m)}
                >
                  {m}x
                </button>
              ))}
              <button
                type="button"
                className="btn chip"
                onClick={() => speech.stop()}
                disabled={!speech.speaking}
              >
                停止語音
              </button>
            </div>
            {!speech.supported && (
              <p className="hint">此瀏覽器不支援語音朗讀，仍可閱讀文字故事。</p>
            )}
          </div>

          <article className="story-panel">
            {stories.activeStory && stories.activePoi ? (
              <>
                <p className="eyebrow">
                  {stories.activePoi.county} · {stories.activePoi.name}
                  <span className="tag">
                    {THEME_LABELS[stories.activeStory.theme]}
                  </span>
                </p>
                <h2>{stories.activeStory.title}</h2>
                <p className="script">{stories.activeStory.script}</p>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() =>
                    speech.speak(
                      `${stories.activePoi?.name}。${stories.activeStory?.script}`,
                    )
                  }
                >
                  {speech.speaking ? '朗讀中…' : '再聽一次'}
                </button>
              </>
            ) : (
              <>
                <p className="eyebrow">等待下一個故事點</p>
                <h2>把車開起來，故事會自己找上門</h2>
                <p className="script">
                  這是模擬定位模式：進度條前進時，系統會在虎尾、斗南、大林、民雄、嘉義、水上、後壁、新營觸發解說。假設你沒來過，就用第一次造訪的耳朵來聽。
                </p>
              </>
            )}
          </article>

          <section className="ask-panel">
            <h3>跟副駕說一句</h3>
            <p className="ask-lead">
              發問會加重該領域權重，之後較少重複、較常講你想聽的。
            </p>
            <div className="ask-row">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q.label}
                  type="button"
                  className="btn ask"
                  disabled={!stories.activePoi}
                  onClick={() => onAsk(q.theme, q.label)}
                >
                  {q.label}
                </button>
              ))}
            </div>
            {answerNote && <p className="note">{answerNote}</p>}
            <div className="pref-row">
              <span>目前興趣偏向：</span>
              {stories.topThemes.map(([theme, score]) => (
                <span key={theme} className="pref-pill">
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
