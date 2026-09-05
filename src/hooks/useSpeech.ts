import { useCallback, useEffect, useRef, useState } from 'react'

type SpeakOptions = {
  audioUrl?: string
  onEnded?: () => void
  /** Explicit rate for this clip; falls back to last setPlaybackRate. */
  rate?: number
}

/**
 * Story playback prefers one consistent neural voice.
 * Browser TTS is only for short system lines without audioUrl.
 *
 * iPad/Safari often resets playbackRate to 1 when:
 * - a brand-new Audio() is created for the next chapter, or
 * - src changes / load() completes.
 * Keep one Audio element, re-apply rate on media events, and run a
 * short watchdog so 2x/4x survives chapter changes and ask pivots.
 */
export function useSpeech() {
  const [speaking, setSpeaking] = useState(false)
  const [supported, setSupported] = useState(true)
  const [engine, setEngine] = useState<'neural' | 'browser' | 'none'>('neural')
  const [playbackRate, setPlaybackRateState] = useState(1)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const endedRef = useRef<(() => void) | null>(null)
  const rateRef = useRef(1)
  const watchdogRef = useRef<number | null>(null)
  const playTokenRef = useRef(0)

  useEffect(() => {
    setSupported(typeof window !== 'undefined')
  }, [])

  const clearWatchdog = useCallback(() => {
    if (watchdogRef.current != null) {
      window.clearInterval(watchdogRef.current)
      watchdogRef.current = null
    }
  }, [])

  const ensureAudio = useCallback(() => {
    if (!audioRef.current) {
      const audio = new Audio()
      audio.preload = 'auto'
      // Keep in DOM so mobile WebViews treat rate changes more reliably
      // and so we can inspect playbackRate during QA.
      audio.dataset.tourNarration = '1'
      audio.style.display = 'none'
      if (typeof document !== 'undefined') {
        document.body.appendChild(audio)
      }
      audioRef.current = audio
    }
    return audioRef.current
  }, [])

  const applyRateToAudio = useCallback((audio: HTMLAudioElement | null) => {
    if (!audio) return
    const rate = rateRef.current
    try {
      audio.defaultPlaybackRate = rate
      if (Math.abs(audio.playbackRate - rate) > 0.01) {
        audio.playbackRate = rate
      }
    } catch {
      // Some WebViews throw if rate unsupported; ignore.
    }
  }, [])

  const startWatchdog = useCallback(
    (audio: HTMLAudioElement, token: number) => {
      clearWatchdog()
      watchdogRef.current = window.setInterval(() => {
        if (playTokenRef.current !== token) return
        if (audioRef.current !== audio) return
        applyRateToAudio(audio)
      }, 200)
    },
    [applyRateToAudio, clearWatchdog],
  )

  const setPlaybackRate = useCallback(
    (rate: number) => {
      const next = Math.min(4, Math.max(0.5, rate))
      rateRef.current = next
      setPlaybackRateState(next)
      applyRateToAudio(audioRef.current)
    },
    [applyRateToAudio],
  )

  const detachHandlers = useCallback((audio: HTMLAudioElement) => {
    audio.onended = null
    audio.onerror = null
    audio.onplay = null
    audio.onplaying = null
    audio.onloadeddata = null
    audio.onloadedmetadata = null
    audio.oncanplay = null
    audio.ontimeupdate = null
    audio.onratechange = null
  }, [])

  const stop = useCallback(() => {
    playTokenRef.current += 1
    clearWatchdog()
    endedRef.current = null
    if (audioRef.current) {
      const audio = audioRef.current
      detachHandlers(audio)
      audio.pause()
      // Keep the element; only clear the current source. Recreating Audio()
      // is what makes Safari forget the user's playbackRate.
      audio.removeAttribute('src')
      try {
        audio.load()
      } catch {
        // ignore
      }
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    setSpeaking(false)
  }, [clearWatchdog, detachHandlers])

  const finish = useCallback(() => {
    clearWatchdog()
    setSpeaking(false)
    const cb = endedRef.current
    endedRef.current = null
    cb?.()
  }, [clearWatchdog])

  const speakBrowser = useCallback(
    (text: string) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        setEngine('none')
        setSupported(false)
        finish()
        return
      }
      setEngine('browser')
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text)
      u.lang = 'zh-TW'
      u.rate = Math.min(2, Math.max(0.7, 0.95 * rateRef.current))
      u.pitch = 1
      const voices = window.speechSynthesis.getVoices()
      const preferred =
        voices.find((v) => /hsiao|chen|meijia|tingting/i.test(v.name)) ||
        voices.find((v) => v.lang.toLowerCase() === 'zh-tw') ||
        voices.find((v) => v.lang.toLowerCase().startsWith('zh'))
      if (preferred) u.voice = preferred
      u.onstart = () => setSpeaking(true)
      u.onend = () => finish()
      u.onerror = () => finish()
      window.speechSynthesis.speak(u)
    },
    [finish],
  )

  const speakNeural = useCallback(
    (_text: string, audioUrl: string) => {
      const audio = ensureAudio()
      const token = (playTokenRef.current += 1)
      detachHandlers(audio)
      clearWatchdog()

      const lockRate = () => {
        if (playTokenRef.current !== token) return
        applyRateToAudio(audio)
      }

      audio.onplay = lockRate
      audio.onplaying = lockRate
      audio.onloadedmetadata = lockRate
      audio.onloadeddata = lockRate
      audio.ontimeupdate = lockRate
      audio.onratechange = () => {
        if (playTokenRef.current !== token) return
        // If Safari snaps back to 1, push desired rate again.
        if (Math.abs(audio.playbackRate - rateRef.current) > 0.01) {
          applyRateToAudio(audio)
        }
      }
      audio.onended = () => {
        if (playTokenRef.current !== token) return
        finish()
      }
      audio.onerror = () => {
        if (playTokenRef.current !== token) return
        finish()
      }

      setEngine('neural')
      // Setting src on a reused element still needs rate re-applied after load.
      if (audio.src !== new URL(audioUrl, window.location.href).href) {
        audio.src = audioUrl
      } else {
        audio.currentTime = 0
      }
      lockRate()

      const start = () => {
        if (playTokenRef.current !== token) return
        setSpeaking(true)
        lockRate()
        void audio
          .play()
          .then(() => {
            if (playTokenRef.current !== token) return
            lockRate()
            startWatchdog(audio, token)
            // iOS sometimes applies rate one tick late after play().
            window.setTimeout(lockRate, 0)
            window.setTimeout(lockRate, 50)
            window.setTimeout(lockRate, 150)
            window.setTimeout(lockRate, 400)
          })
          .catch(() => {
            if (playTokenRef.current !== token) return
            finish()
          })
      }

      if (audio.readyState >= 2) start()
      else {
        audio.oncanplay = () => {
          audio.oncanplay = null
          start()
        }
        audio.load()
      }
    },
    [
      applyRateToAudio,
      clearWatchdog,
      detachHandlers,
      ensureAudio,
      finish,
      startWatchdog,
    ],
  )

  const speak = useCallback(
    (text: string, options?: SpeakOptions) => {
      if (options?.rate != null) {
        const next = Math.min(4, Math.max(0.5, options.rate))
        rateRef.current = next
        setPlaybackRateState(next)
      }

      const onEnded = options?.onEnded ?? null
      stop()
      endedRef.current = onEnded

      if (options?.audioUrl) {
        speakNeural(text, options.audioUrl)
        return
      }
      speakBrowser(text)
    },
    [speakBrowser, speakNeural, stop],
  )

  useEffect(
    () => () => {
      clearWatchdog()
      if (audioRef.current) {
        detachHandlers(audioRef.current)
        audioRef.current.pause()
        audioRef.current.remove()
        audioRef.current = null
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    },
    [clearWatchdog, detachHandlers],
  )

  return {
    speak,
    stop,
    speaking,
    supported,
    engine,
    playbackRate,
    setPlaybackRate,
  }
}
