import { useCallback, useEffect, useRef, useState } from 'react'

type SpeakOptions = {
  audioUrl?: string
  onEnded?: () => void
}

/**
 * Story playback prefers one consistent neural voice.
 * Browser TTS is only a last-resort fallback for short system lines,
 * never for main story clips (avoids sudden voice/speed changes).
 */
export function useSpeech() {
  const [speaking, setSpeaking] = useState(false)
  const [supported, setSupported] = useState(true)
  const [engine, setEngine] = useState<'neural' | 'browser' | 'none'>('neural')
  const [playbackRate, setPlaybackRateState] = useState(1)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const endedRef = useRef<(() => void) | null>(null)
  const rateRef = useRef(1)

  useEffect(() => {
    setSupported(typeof window !== 'undefined')
  }, [])

  const setPlaybackRate = useCallback((rate: number) => {
    const next = Math.min(4, Math.max(0.5, rate))
    rateRef.current = next
    setPlaybackRateState(next)
    if (audioRef.current) {
      audioRef.current.playbackRate = next
    }
  }, [])

  const stop = useCallback(() => {
    endedRef.current = null
    if (audioRef.current) {
      audioRef.current.onended = null
      audioRef.current.onerror = null
      audioRef.current.pause()
      audioRef.current.removeAttribute('src')
      audioRef.current.load()
      audioRef.current = null
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    setSpeaking(false)
  }, [])

  const finish = useCallback(() => {
    setSpeaking(false)
    const cb = endedRef.current
    endedRef.current = null
    cb?.()
  }, [])

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
      // Keep fallback milder than drive multiplier so it never sounds panicked.
      u.rate = Math.min(1.15, Math.max(0.85, 0.95 * Math.min(rateRef.current, 1.25)))
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
      const audio = new Audio()
      audio.preload = 'auto'
      audio.src = audioUrl
      audio.playbackRate = rateRef.current
      audioRef.current = audio
      setEngine('neural')

      const onReadyPlay = () => {
        setSpeaking(true)
        void audio.play().catch(() => {
          // Keep voice consistent: do not switch timbre; skip ahead instead.
          finish()
        })
      }

      audio.onended = () => finish()
      audio.onerror = () => {
        // Avoid sudden browser-voice swap on iPad load glitches.
        finish()
      }

      if (audio.readyState >= 2) onReadyPlay()
      else {
        audio.oncanplay = () => {
          audio.oncanplay = null
          onReadyPlay()
        }
        audio.load()
      }
    },
    [finish],
  )

  const speak = useCallback(
    (text: string, options?: SpeakOptions) => {
      // Preserve callback across stop()'s clearing by setting after stop.
      const onEnded = options?.onEnded ?? null
      stop()
      endedRef.current = onEnded

      if (options?.audioUrl) {
        speakNeural(text, options.audioUrl)
        return
      }
      // No audioUrl: short UI lines only.
      speakBrowser(text)
    },
    [speakBrowser, speakNeural, stop],
  )

  useEffect(() => () => stop(), [stop])

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
