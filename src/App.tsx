import { useRef, useState } from 'react'
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

  progressRef.current = drive.progress
  startedRef.current = started
  autoRef.current = stories.autoContinue

  const speakClip = (clip: NarrationClip) => {
    speech.speak(`${clip.placeLabel}。${clip.title}。${clip.script}`, {
      audioUrl: clip.audioUrl,
      onEnded: () => {
        if (!startedRef.current || !autoRef.current) return
        const next = stories.playForProgress(progressRef.current)
        if (next) speakClip(next)
      },
    })
  }

  const begin = () => {
    stories.resetEngine()
    drive.reset()
    speech.stop()
    setStarted(true)
    setAnswerNote(null)
    drive.setPlaying(true)
    const first = stories.forcePoi('huwei') || stories.playForProgress(0)
    if (first) speakClip(first)
  }

  const onAsk = (theme: StoryTheme, label: string) => {
    const clip = stories.askAbout(theme)
    if (clip) {
      speech.speak(`你問：${label}。${clip.script}`, {
        audioUrl: clip.audioUrl,
        onEnded: () => {
          if (!autoRef.current) return
          const next = stories.playForProgress(progressRef.current, theme)
          if (next) speakClip(next)
        },
      })
      setAnswerNote(
        `已加重「${THEME_LABELS[theme]}」興趣，之後會多講這類並繼續連播。`,
      )
    } else {
      setAnswerNote('暫時沒有對應主題，已先記下你的興趣。')
      stories.bumpTheme(theme, 1.5)
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
            分鐘說書（含路段連播），較能覆蓋單趟車程，並留給二倍速收聽餘量。語音改為較自然的台灣腔神經語音。
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
                  onClick={() => drive.setSpeedMul(m)}
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
              語音：
              {speech.engine === 'neural'
                ? '神經語音（預錄）'
                : speech.engine === 'browser'
                  ? '瀏覽器備援'
                  : '無'}
              {' · '}
              剩餘可聽約 {stories.remainingMin} / {stories.totalMin} 分
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
                  不再只在景點講一句就結束：路段之間也有說書，講完會自動接下一段。內容量約{' '}
                  {TOTAL_NARRATION_MIN} 分鐘，較能撐住整趟車程與二倍速。
                </p>
              </>
            )}
          </article>

          <section className="ask-panel">
            <h3>跟副駕說一句</h3>
            <p className="ask-lead">
              發問會加重該領域權重，之後較常講你想聽的，並繼續連播。
            </p>
            <div className="ask-row">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q.label}
                  type="button"
                  className="btn ask"
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
