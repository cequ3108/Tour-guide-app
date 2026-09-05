import { useCallback, useMemo, useState } from 'react'
import {
  NARRATION_CLIPS,
  TOTAL_NARRATION_MIN,
  type NarrationClip,
} from '../data/narration'
import { POINTS_OF_INTEREST, type StoryTheme } from '../data/route'

type Prefs = Record<StoryTheme, number>

const DEFAULT_PREFS: Prefs = {
  history: 1,
  food: 1,
  people: 1,
  legend: 1,
  industry: 1,
  nature: 1,
}

function scoreClip(
  clip: NarrationClip,
  prefs: Prefs,
  heard: Set<string>,
  progress: number,
  focusTheme: StoryTheme | null,
) {
  const freshness = heard.has(clip.id) ? -8 : 3
  const inWindow =
    progress >= clip.progressMin - 0.03 && progress <= clip.progressMax + 0.12
      ? 5
      : progress < clip.progressMin
        ? 1.5
        : -1.5
  const behindPenalty = clip.progressMax < progress - 0.14 ? -4 : 0
  const focusBonus = focusTheme && clip.theme === focusTheme ? 9 : 0
  return prefs[clip.theme] * 2.4 + freshness + inWindow + behindPenalty + focusBonus
}

export function useStoryEngine() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS)
  const [heard, setHeard] = useState<Set<string>>(() => new Set())
  const [activeClip, setActiveClip] = useState<NarrationClip | null>(null)
  const [visitLog, setVisitLog] = useState<string[]>([])
  const [autoContinue, setAutoContinue] = useState(true)
  const [focusTheme, setFocusTheme] = useState<StoryTheme | null>(null)

  const activePoi = useMemo(() => {
    if (!activeClip?.poiId) return null
    return POINTS_OF_INTEREST.find((p) => p.id === activeClip.poiId) ?? null
  }, [activeClip])

  const bumpTheme = useCallback((theme: StoryTheme, delta = 1.25) => {
    setPrefs((prev) => ({
      ...prev,
      [theme]: Math.min(12, prev[theme] + delta),
    }))
  }, [])

  const remainingSec = useMemo(
    () =>
      NARRATION_CLIPS.filter((c) => !heard.has(c.id)).reduce(
        (sum, c) => sum + c.durationSec,
        0,
      ),
    [heard],
  )

  const pickNext = useCallback(
    (progress: number, themeBoost?: StoryTheme) => {
      const focus = themeBoost ?? focusTheme
      const ranked = NARRATION_CLIPS.filter((c) => !heard.has(c.id))
        .map((c) => ({
          c,
          s: scoreClip(c, prefs, heard, progress, focus),
        }))
        .sort((a, b) => b.s - a.s)
      return ranked[0]?.c ?? null
    },
    [focusTheme, heard, prefs],
  )

  const startClip = useCallback(
    (clip: NarrationClip) => {
      setActiveClip(clip)
      setHeard((prev) => new Set(prev).add(clip.id))
      setVisitLog((prev) =>
        [`${clip.placeLabel}｜${clip.title}`, ...prev].slice(0, 16),
      )
      bumpTheme(clip.theme, 0.1)
      return clip
    },
    [bumpTheme],
  )

  const playForProgress = useCallback(
    (progress: number, themeBoost?: StoryTheme) => {
      const clip = pickNext(progress, themeBoost)
      if (!clip) {
        setActiveClip(null)
        return null
      }
      return startClip(clip)
    },
    [pickNext, startClip],
  )

  const forcePoi = useCallback(
    (poiId: string) => {
      const clip =
        NARRATION_CLIPS.find((c) => c.poiId === poiId && !heard.has(c.id)) ||
        NARRATION_CLIPS.find((c) => c.poiId === poiId) ||
        null
      if (!clip) return null
      return startClip(clip)
    },
    [heard, startClip],
  )

  /** Immediately pivot playlist toward a theme the driver asked about. */
  const askAbout = useCallback(
    (theme: StoryTheme) => {
      setFocusTheme(theme)
      bumpTheme(theme, 2.2)
      const progress = activeClip
        ? (activeClip.progressMin + activeClip.progressMax) / 2
        : 0

      // Prefer nearby unheard clips of that theme, then any unheard, then replay.
      const themed =
        NARRATION_CLIPS.find(
          (c) =>
            c.theme === theme &&
            !heard.has(c.id) &&
            Math.abs((c.progressMin + c.progressMax) / 2 - progress) <= 0.28,
        ) ||
        NARRATION_CLIPS.find((c) => c.theme === theme && !heard.has(c.id)) ||
        NARRATION_CLIPS.find((c) => c.theme === theme)
      if (!themed) return null
      return startClip(themed)
    },
    [activeClip, bumpTheme, heard, startClip],
  )

  const clearFocus = useCallback(() => setFocusTheme(null), [])

  const resetEngine = useCallback(() => {
    setActiveClip(null)
    setHeard(new Set())
    setVisitLog([])
    setPrefs(DEFAULT_PREFS)
    setAutoContinue(true)
    setFocusTheme(null)
  }, [])

  const topThemes = useMemo(
    () =>
      (Object.entries(prefs) as [StoryTheme, number][])
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3),
    [prefs],
  )

  return {
    prefs,
    topThemes,
    focusTheme,
    activeClip,
    activePoi,
    visitLog,
    remainingMin: Math.round(remainingSec / 60),
    totalMin: TOTAL_NARRATION_MIN,
    autoContinue,
    setAutoContinue,
    playForProgress,
    forcePoi,
    askAbout,
    bumpTheme,
    clearFocus,
    resetEngine,
  }
}
