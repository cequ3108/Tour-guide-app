import { useCallback, useMemo, useState } from 'react'
import {
  POINTS_OF_INTEREST,
  type PointOfInterest,
  type Story,
  type StoryTheme,
} from '../data/route'

const COOLDOWN_MS = 1000 * 60 * 30 // 模擬：同則 30 分鐘內不重播（Demo 縮短體感可用播放紀錄）

type Prefs = Record<StoryTheme, number>

const DEFAULT_PREFS: Prefs = {
  history: 1,
  food: 1,
  people: 1,
  legend: 1,
  industry: 1,
  nature: 1,
}

function scoreStory(story: Story, prefs: Prefs, heard: Set<string>) {
  const freshness = heard.has(story.id) ? -5 : 2
  return prefs[story.theme] * 2 + freshness + story.durationSec / 120
}

export function useStoryEngine() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS)
  const [heard, setHeard] = useState<Set<string>>(() => new Set())
  const [lastPlayedAt, setLastPlayedAt] = useState<Record<string, number>>({})
  const [activePoiId, setActivePoiId] = useState<string | null>(null)
  const [activeStory, setActiveStory] = useState<Story | null>(null)
  const [visitLog, setVisitLog] = useState<string[]>([])
  const triggeredPois = useRefSet()

  const activePoi = useMemo(
    () => POINTS_OF_INTEREST.find((p) => p.id === activePoiId) ?? null,
    [activePoiId],
  )

  const bumpTheme = useCallback((theme: StoryTheme, delta = 1.25) => {
    setPrefs((prev) => ({
      ...prev,
      [theme]: Math.min(8, prev[theme] + delta),
    }))
  }, [])

  const pickStory = useCallback(
    (poi: PointOfInterest) => {
      const now = Date.now()
      const candidates = poi.stories
        .filter((s) => {
          const last = lastPlayedAt[s.id]
          return !last || now - last > COOLDOWN_MS
        })
        .sort(
          (a, b) => scoreStory(b, prefs, heard) - scoreStory(a, prefs, heard),
        )
      if (candidates.length > 0) return candidates[0]
      // 若都在冷卻，仍選最高分但避開剛聽過的
      return [...poi.stories].sort(
        (a, b) => scoreStory(b, prefs, heard) - scoreStory(a, prefs, heard),
      )[0]
    },
    [heard, lastPlayedAt, prefs],
  )

  const tryTriggerAtProgress = useCallback(
    (progress: number) => {
      const poi = POINTS_OF_INTEREST.find(
        (p) => Math.abs(p.progress - progress) < 0.018,
      )
      if (!poi) return null
      if (triggeredPois.has(poi.id)) return null
      triggeredPois.add(poi.id)
      const story = pickStory(poi)
      setActivePoiId(poi.id)
      setActiveStory(story)
      setHeard((prev) => new Set(prev).add(story.id))
      setLastPlayedAt((prev) => ({ ...prev, [story.id]: Date.now() }))
      setVisitLog((prev) => [`${poi.name}｜${story.title}`, ...prev].slice(0, 12))
      bumpTheme(story.theme, 0.15)
      return { poi, story }
    },
    [bumpTheme, pickStory, triggeredPois],
  )

  const forcePoi = useCallback(
    (poiId: string) => {
      const poi = POINTS_OF_INTEREST.find((p) => p.id === poiId)
      if (!poi) return null
      triggeredPois.add(poi.id)
      const story = pickStory(poi)
      setActivePoiId(poi.id)
      setActiveStory(story)
      setHeard((prev) => new Set(prev).add(story.id))
      setLastPlayedAt((prev) => ({ ...prev, [story.id]: Date.now() }))
      setVisitLog((prev) => [`${poi.name}｜${story.title}`, ...prev].slice(0, 12))
      return { poi, story }
    },
    [pickStory, triggeredPois],
  )

  const askAbout = useCallback(
    (theme: StoryTheme) => {
      bumpTheme(theme, 1.5)
      if (!activePoi) return null
      const themed =
        activePoi.stories.find(
          (s) => s.theme === theme && !heard.has(s.id),
        ) || activePoi.stories.find((s) => s.theme === theme)
      if (!themed) return null
      setActiveStory(themed)
      setHeard((prev) => new Set(prev).add(themed.id))
      setLastPlayedAt((prev) => ({ ...prev, [themed.id]: Date.now() }))
      setVisitLog((prev) =>
        [`提問→${activePoi.name}｜${themed.title}`, ...prev].slice(0, 12),
      )
      return themed
    },
    [activePoi, bumpTheme, heard],
  )

  const resetEngine = useCallback(() => {
    triggeredPois.clear()
    setActivePoiId(null)
    setActiveStory(null)
    setHeard(new Set())
    setLastPlayedAt({})
    setVisitLog([])
    setPrefs(DEFAULT_PREFS)
  }, [triggeredPois])

  const topThemes = useMemo(() => {
    return (Object.entries(prefs) as [StoryTheme, number][])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
  }, [prefs])

  return {
    prefs,
    topThemes,
    activePoi,
    activeStory,
    visitLog,
    tryTriggerAtProgress,
    forcePoi,
    askAbout,
    bumpTheme,
    resetEngine,
    setActiveStory,
  }
}

function useRefSet() {
  const [set] = useState(() => new Set<string>())
  return set
}
