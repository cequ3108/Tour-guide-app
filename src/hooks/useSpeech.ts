import { useCallback, useEffect, useRef, useState } from 'react'

export function useSpeech() {
  const [speaking, setSpeaking] = useState(false)
  const [supported, setSupported] = useState(false)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  useEffect(() => {
    setSupported(typeof window !== 'undefined' && 'speechSynthesis' in window)
  }, [])

  const stop = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    utteranceRef.current = null
    setSpeaking(false)
  }, [])

  const speak = useCallback(
    (text: string) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text)
      u.lang = 'zh-TW'
      u.rate = 1.02
      u.pitch = 1
      const voices = window.speechSynthesis.getVoices()
      const tw =
        voices.find((v) => v.lang === 'zh-TW') ||
        voices.find((v) => v.lang.toLowerCase().startsWith('zh'))
      if (tw) u.voice = tw
      u.onstart = () => setSpeaking(true)
      u.onend = () => setSpeaking(false)
      u.onerror = () => setSpeaking(false)
      utteranceRef.current = u
      window.speechSynthesis.speak(u)
    },
    [],
  )

  useEffect(() => () => stop(), [stop])

  return { speak, stop, speaking, supported }
}
