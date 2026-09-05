import { useCallback, useMemo, useRef, useState } from 'react'
import {
  STORY_SPOTS,
  totalStoryMinutes,
  type StorySpot,
} from '../data/storyCatalog'
import { type StoryTheme } from '../data/route'
import {
  describeRelativeToCar,
  type LatLng,
  type VisionConeOptions,
} from '../lib/geo'

type Prefs = Record<StoryTheme, number>

const DEFAULT_PREFS: Prefs = {
  history: 1,
  food: 1,
  people: 1,
  legend: 1,
  industry: 1,
  nature: 1,
}

const DEFAULT_CONE: Required<VisionConeOptions> = {
  // ~2–3 minutes of lead time at urban arterial speeds.
  maxDistKm: 2.4,
  minDistKm: 0,
  halfAngleDeg: 52,
}

const PLACE_NAME_CONE: Required<VisionConeOptions> = {
  maxDistKm: 3.4,
  minDistKm: 0,
  halfAngleDeg: 60,
}

function scoreSpot(
  spot: StorySpot,
  prefs: Prefs,
  focusTheme: StoryTheme | null,
  car: LatLng,
  bearing: number,
) {
  const cone =
    spot.layer === 'placename' ? PLACE_NAME_CONE : DEFAULT_CONE
  const rel = describeRelativeToCar(car, bearing, spot, cone)

  // Hard filter: must be roughly ahead and inside the vision cone.
  if (!rel.inCone) return -Infinity

  const distanceScore = 8 - Math.min(7.5, rel.distanceKm * 6)
  const angleScore = 5 - Math.min(4.5, rel.angleDeg / 12)
  const themeScore = prefs[spot.theme] * 2.1
  const focusBonus = focusTheme && spot.theme === focusTheme ? 7 : 0
  // Prefer rich stories; placenames are the safety net when nothing else is ahead.
  const layerBonus = spot.layer === 'story' ? 3.5 : 0.4
  return distanceScore + angleScore + themeScore + focusBonus + layerBonus
}

export function useStoryEngine() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS)
  const [heard, setHeard] = useState<Set<string>>(() => new Set())
  const [activeClip, setActiveClip] = useState<StorySpot | null>(null)
  const [visitLog, setVisitLog] = useState<string[]>([])
  const [autoContinue, setAutoContinue] = useState(true)
  const [focusTheme, setFocusTheme] = useState<StoryTheme | null>(null)
  const [lastPickReason, setLastPickReason] = useState<string>('視線前方')

  const heardRef = useRef<Set<string>>(new Set())
  const focusRef = useRef<StoryTheme | null>(null)
  const prefsRef = useRef(prefs)
  prefsRef.current = prefs
  focusRef.current = focusTheme

  const activePoiId = activeClip?.poiId ?? null

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
      STORY_SPOTS.filter((c) => !heard.has(c.id)).reduce(
        (sum, c) => sum + c.durationSec,
        0,
      ),
    [heard],
  )

  const startClip = useCallback(
    (clip: StorySpot, reason: string) => {
      const nextHeard = new Set(heardRef.current)
      nextHeard.add(clip.id)
      heardRef.current = nextHeard
      setHeard(nextHeard)
      setActiveClip(clip)
      setLastPickReason(reason)
      setVisitLog((prev) =>
        [`${clip.placeLabel}｜${clip.title}`, ...prev].slice(0, 20),
      )
      bumpTheme(clip.theme, 0.08)
      return clip
    },
    [bumpTheme],
  )

  const pickAhead = useCallback(
    (
      car: LatLng,
      bearing: number,
      themeBoost?: StoryTheme,
    ): { spot: StorySpot; reason: string } | null => {
      const heardNow = heardRef.current
      const focus = themeBoost ?? focusRef.current
      const unheard = STORY_SPOTS.filter((c) => !heardNow.has(c.id))
      if (unheard.length === 0) return null

      const ranked = unheard
        .map((spot) => ({
          spot,
          score: scoreSpot(spot, prefsRef.current, focus, car, bearing),
        }))
        .filter((row) => Number.isFinite(row.score))
        .sort((a, b) => b.score - a.score)

      const best = ranked[0]
      if (best) {
        const reason =
          best.spot.layer === 'placename'
            ? '前方暫無強景點，先用路名／地名過渡'
            : '視線前方即將／正在進入的故事'
        return { spot: best.spot, reason }
      }

      // Fallback: nearest unheard spot roughly ahead within a longer radius.
      const soft = unheard
        .map((spot) => {
          const rel = describeRelativeToCar(car, bearing, spot, {
            maxDistKm: 4.5,
            minDistKm: 0.02,
            halfAngleDeg: 75,
          })
          return { spot, rel }
        })
        .filter((row) => row.rel.ahead && row.rel.distanceKm <= 4.5)
        .sort((a, b) => a.rel.distanceKm - b.rel.distanceKm)[0]

      if (!soft) return null
      return {
        spot: soft.spot,
        reason: '視線附近的備援故事',
      }
    },
    [],
  )

  const playForPosition = useCallback(
    (car: LatLng, bearing: number, themeBoost?: StoryTheme) => {
      const picked = pickAhead(car, bearing, themeBoost)
      if (!picked) {
        setActiveClip(null)
        setLastPickReason('前方暫時沒有未聽過的故事')
        return null
      }
      return startClip(picked.spot, picked.reason)
    },
    [pickAhead, startClip],
  )

  /** @deprecated progress-rail API kept as thin wrapper for older calls. */
  const playForProgress = useCallback(
    (_progress: number, themeBoost?: StoryTheme) => {
      // Without a live car pose, fall back to first unheard themed/general clip.
      const heardNow = heardRef.current
      const focus = themeBoost ?? focusRef.current
      const next =
        (focus &&
          STORY_SPOTS.find(
            (c) => c.theme === focus && !heardNow.has(c.id),
          )) ||
        STORY_SPOTS.find((c) => !heardNow.has(c.id)) ||
        null
      if (!next) return null
      return startClip(next, '清單備援選題')
    },
    [startClip],
  )

  const forcePoi = useCallback(
    (poiId: string) => {
      const heardNow = heardRef.current
      const clip =
        STORY_SPOTS.find((c) => c.poiId === poiId && !heardNow.has(c.id)) ||
        STORY_SPOTS.find((c) => c.poiId === poiId) ||
        null
      if (!clip) return null
      // Allow re-hear when user explicitly jumps to a place.
      if (heardNow.has(clip.id)) {
        setActiveClip(clip)
        setLastPickReason('你點選的地點')
        setVisitLog((prev) =>
          [`${clip.placeLabel}｜${clip.title}`, ...prev].slice(0, 20),
        )
        return clip
      }
      return startClip(clip, '你點選的地點')
    },
    [startClip],
  )

  const askAbout = useCallback(
    (theme: StoryTheme, car?: LatLng, bearing?: number) => {
      setFocusTheme(theme)
      focusRef.current = theme
      bumpTheme(theme, 2.2)

      if (car && bearing != null) {
        const picked = pickAhead(car, bearing, theme)
        if (picked) return startClip(picked.spot, `依提問偏「${theme}」視線選題`)
      }

      const heardNow = heardRef.current
      const themed =
        STORY_SPOTS.find((c) => c.theme === theme && !heardNow.has(c.id)) ||
        STORY_SPOTS.find((c) => !heardNow.has(c.id)) ||
        null
      if (!themed) return null
      return startClip(themed, `依提問偏「${theme}」`)
    },
    [bumpTheme, pickAhead, startClip],
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
    setLastPickReason('視線前方')
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
    activePoiId,
    visitLog,
    lastPickReason,
    remainingMin: Math.round(remainingSec / 60),
    totalMin: totalStoryMinutes(),
    autoContinue,
    setAutoContinue,
    playForPosition,
    playForProgress,
    forcePoi,
    askAbout,
    bumpTheme,
    clearFocus,
    resetEngine,
    heardCount: heard.size,
    totalClips: STORY_SPOTS.length,
  }
}
