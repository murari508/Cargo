import { useCallback, useEffect, useRef, useState } from 'react'

/* Thin wrapper over the Web Speech API. Everything degrades to a text box
   when the browser has no speech support, which is the case on Firefox and
   on some Android webviews. */

function getRecognition(): any {
  const w = window as any
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

export const speechSupported = () => Boolean(getRecognition())
export const ttsSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window

export function useSpeechRecognition(onResult: (text: string, isFinal: boolean) => void) {
  const [listening, setListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recRef = useRef<any>(null)
  const cbRef = useRef(onResult)
  cbRef.current = onResult

  const stop = useCallback(() => {
    recRef.current?.stop()
    setListening(false)
  }, [])

  const start = useCallback((lang: string) => {
    const Rec = getRecognition()
    if (!Rec) { setError('This browser cannot listen. Type instead.'); return }
    recRef.current?.abort?.()
    const rec = new Rec()
    rec.lang = lang
    rec.continuous = false
    rec.interimResults = true
    rec.maxAlternatives = 1
    rec.onstart = () => { setError(null); setListening(true) }
    rec.onerror = (e: any) => {
      setListening(false)
      setError(e.error === 'not-allowed'
        ? 'Microphone access is blocked. Allow it in your browser settings.'
        : e.error === 'no-speech' ? 'I did not catch that. Try again.'
        : 'Could not use the microphone. Type instead.')
    }
    rec.onend = () => setListening(false)
    rec.onresult = (event: any) => {
      let text = ''
      let final = false
      for (let i = event.resultIndex; i < event.results.length; i++) {
        text += event.results[i][0].transcript
        if (event.results[i].isFinal) final = true
      }
      cbRef.current(text.trim(), final)
    }
    recRef.current = rec
    rec.start()
  }, [])

  useEffect(() => () => recRef.current?.abort?.(), [])
  return { listening, error, start, stop, supported: speechSupported() }
}

const RATE = { slow: 0.8, normal: 1, fast: 1.25 } as const

export function useSpeechSynthesis() {
  const [speaking, setSpeaking] = useState(false)

  const cancel = useCallback(() => {
    if (ttsSupported()) window.speechSynthesis.cancel()
    setSpeaking(false)
  }, [])

  const speak = useCallback((text: string, lang: string,
                             speed: keyof typeof RATE = 'normal') => {
    if (!ttsSupported()) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = lang
    u.rate = RATE[speed]
    const match = window.speechSynthesis.getVoices()
      .find(v => v.lang === lang) ??
      window.speechSynthesis.getVoices().find(v => v.lang.startsWith(lang.split('-')[0]))
    if (match) u.voice = match
    u.onstart = () => setSpeaking(true)
    u.onend = () => setSpeaking(false)
    u.onerror = () => setSpeaking(false)
    window.speechSynthesis.speak(u)
  }, [])

  useEffect(() => () => { if (ttsSupported()) window.speechSynthesis.cancel() }, [])
  return { speak, cancel, speaking, supported: ttsSupported() }
}
