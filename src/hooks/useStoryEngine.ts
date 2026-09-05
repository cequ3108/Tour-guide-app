import { useCallback, useMemo, useRef, useState } from 'react'
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
  progress: number,
  focusTheme: StoryTheme | null,
) {
  const mid = (clip.progressMin + clip.progressMax) / 2
  const ahead = mid >= progress - 0.02
  const distance = Math.abs(mid - progress)

  // Prefer forward storytelling so the journey feels continuous.
  const forwardBonus = ahead ? 6 - Math.min(5, distance * 12) : -3 - distance * 8
  const focusBonus = focusTheme && clip.theme === focusTheme ? 8 : 0
  const roadBonus = !clip.poiId && ahead && distance < 0.12 ? 2.5 : 0
  return prefs[clip.theme] * 2.2 + forwardBonus + focusBonus + roadBonus
}

export function useStoryEngine() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS)
  const [heard, setHeard] = useState<Set<string>>(() => new Set())
  const [activeClip, setActiveClip] = useState<NarrationClip | null>(null)
  const [visitLog, setVisitLog] = useState<string[]>([])
  const [autoContinue, setAutoContinue] = useState(true)
  const [focusTheme, setFocusTheme] = useState<StoryTheme | null>(null)

  // Synchronous source of truth — avoids replaying due to stale React closures.
  const heardRef = useRef<Set<string>>(new Set())
  const focusRef = useRef<StoryTheme | null>(null)
  const prefsRef = useRef(prefs)
  prefsRef.current = prefs
  focusRef.current = focusTheme

  const activePoi = useMemo(() => {
    if (!activeClip?.poiId) return null
    return POINTS_OF_INTEREST.find((p) => p.id === activeClip.poiId) ?? null
  }, [activeClip])

  const bumpTheme = useCallback((theme: StoryTheme, delta = 1.25) => {
    setPrefs((prev) => {
      const next = {
        ...prev,
        [theme]: Math.min(12, prev[theme] + delta),
      }
      prefsRef.current = next
      return next
    })
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
      const heardNow = heardRef.current
      const focus = themeBoost ?? focusRef.current
      const unheard = NARRATION_CLIPS.filter((c) => !heardNow.has(c.id))
      if (unheard.length === 0) return null

      const ranked = unheard
        .map((c) => ({
          c,
          s: scoreClip(c, prefsRef.current, progress, focus),
        }))
        .sort((a, b) => b.s - a.s)
      return ranked[0]?.c ?? null
    },
    [],
  )

  const startClip = useCallback(
    (clip: NarrationClip) => {
      // Mark heard immediately so the next onEnded pick cannot reselect it.
      const nextHeard = new Set(heardRef.current)
      nextHeard.add(clip.id)
      heardRef.current = nextHeard
      setHeard(nextHeard)
      setActiveClip(clip)
      setVisitLog((prev) =>
        [`${clip.placeLabel}｜${clip.title}`, ...prev].slice(0, 20),
      )
      bumpTheme(clip.theme, 0.08)
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
      const heardNow = heardRef.current
      const poiProgress =
        POINTS_OF_INTEREST.find((p) => p.id === poiId)?.progress ?? 0
      const clip =
        NARRATION_CLIPS.find((c) => c.poiId === poiId && !heardNow.has(c.id)) ||
        // If this town is exhausted, ease into the next road/village segment.
        NARRATION_CLIPS.find(
          (c) =>
            !c.poiId &&
            !heardNow.has(c.id) &&
            c.progressMin >= poiProgress - 0.02,
        ) ||
        pickNext(poiProgress)
      if (!clip) return null
      return startClip(clip)
    },
    [pickNext, startClip],
  )

  const askAbout = useCallback(
    (theme: StoryTheme) => {
      setFocusTheme(theme)
      focusRef.current = theme
      bumpTheme(theme, 2.2)
      const progress = activeClip
        ? (activeClip.progressMin + activeClip.progressMax) / 2
        : 0
      const heardNow = heardRef.current

      const themed =
        NARRATION_CLIPS.find(
          (c) =>
            c.theme === theme &&
            !heardNow.has(c.id) &&
            (c.progressMin + c.progressMax) / 2 >= progress - 0.05,
        ) ||
        NARRATION_CLIPS.find((c) => c.theme === theme && !heardNow.has(c.id)) ||
        // Never hard-loop the same clip while other unheard content remains.
        NARRATION_CLIPS.find((c) => !heardNow.has(c.id)) ||
        null
      if (!themed) return null
      return startClip(themed)
    },
    [activeClip, bumpTheme, startClip],
  )

  const clearFocus = useCallback(() => {
    focusRef.current = null
    setFocusTheme(null)
  }, [])

  const resetEngine = useCallback(() => {
    heardRef.current = new Set()
    focusRef.current = null
    setActiveClip(null)
    setHeard(new Set())
    setVisitLog([])
    setPrefs(DEFAULT_PREFS)
    prefsRef.current = DEFAULT_PREFS
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
    heardCount: heard.size,
    totalClips: NARRATION_CLIPS.length,
  }
}
