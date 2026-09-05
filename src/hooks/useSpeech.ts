import { useCallback, useEffect, useRef, useState } from 'react'

type SpeakOptions = {
  audioUrl?: string
  onEnded?: () => void
}

export function useSpeech() {
  const [speaking, setSpeaking] = useState(false)
  const [supported, setSupported] = useState(true)
  const [engine, setEngine] = useState<'neural' | 'browser' | 'none'>('neural')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const endedRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    setSupported(typeof window !== 'undefined')
  }, [])

  const stop = useCallback(() => {
    endedRef.current = null
    if (audioRef.current) {
      audioRef.current.onended = null
      audioRef.current.onerror = null
      audioRef.current.pause()
      audioRef.current.removeAttribute('src')
      audioRef.current = null
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    setSpeaking(false)
  }, [])

  const speakBrowser = useCallback((text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setEngine('none')
      setSupported(false)
      endedRef.current?.()
      return
    }
    setEngine('browser')
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'zh-TW'
    u.rate = 0.92
    u.pitch = 1.05
    const voices = window.speechSynthesis.getVoices()
    const preferred =
      voices.find((v) => /hsiao|chen|google.?國語|meijia|tingting/i.test(v.name)) ||
      voices.find((v) => v.lang.toLowerCase() === 'zh-tw') ||
      voices.find((v) => v.lang.toLowerCase().startsWith('zh'))
    if (preferred) u.voice = preferred
    u.onstart = () => setSpeaking(true)
    u.onend = () => {
      setSpeaking(false)
      endedRef.current?.()
    }
    u.onerror = () => {
      setSpeaking(false)
      endedRef.current?.()
    }
    window.speechSynthesis.speak(u)
  }, [])

  const speak = useCallback(
    (text: string, options?: SpeakOptions) => {
      stop()
      endedRef.current = options?.onEnded ?? null

      if (!options?.audioUrl) {
        speakBrowser(text)
        return
      }

      const audio = new Audio(options.audioUrl)
      audioRef.current = audio
      setEngine('neural')
      audio.onplay = () => setSpeaking(true)
      audio.onended = () => {
        setSpeaking(false)
        endedRef.current?.()
      }
      audio.onerror = () => speakBrowser(text)
      void audio.play().catch(() => speakBrowser(text))
    },
    [speakBrowser, stop],
  )

  useEffect(() => () => stop(), [stop])

  return { speak, stop, speaking, supported, engine }
}
