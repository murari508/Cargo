import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSpeechRecognition, useSpeechSynthesis } from '../hooks/useSpeech'
import { api, rupees } from '../services/api'
import type { AssistantReply, Car, LangCode } from '../types'

type Phase = 'idle' | 'listening' | 'processing' | 'speaking' | 'done'

const LANGS: { code: LangCode; label: string; speech: string; html: string }[] = [
  { code: 'en', label: 'English', speech: 'en-IN', html: 'en' },
  { code: 'te', label: 'తెలుగు', speech: 'te-IN', html: 'te' },
  { code: 'hi', label: 'हिन्दी', speech: 'hi-IN', html: 'hi' },
  { code: 'auto', label: 'Auto detect', speech: 'en-IN', html: 'en' },
]

const PHASE_LABEL: Record<Phase, string> = {
  idle: 'Tap to speak',
  listening: 'Listening',
  processing: 'Thinking',
  speaking: 'Speaking',
  done: 'Ready',
}

const PROMPTS: Record<string, string[]> = {
  en: ['An automatic SUV in Hyderabad for three days under ten thousand',
       'Show me five seater cars', 'Plan a three day Hyderabad to Goa trip'],
  te: ['హైదరాబాద్‌లో ఆటోమేటిక్ SUV కావాలి', 'ఐదు సీటర్ కార్లు చూపించండి',
       'Hyderabad nunchi Goa ki three days trip plan cheyyi'],
  hi: ['मुझे हैदराबाद में ऑटोमैटिक कार चाहिए', 'पाँच सीटर कार दिखाओ',
       'हैदराबाद से गोवा की तीन दिन की ट्रिप प्लान करो'],
  auto: ['Hyderabad lo automatic SUV kavali', 'Mujhe ek car chahiye teen din ke liye',
         'Show me SUVs under 3000 per day'],
}

interface Turn { role: 'you' | 'cargo'; text: string; lang: string; cars?: Car[] }

export default function VoiceAssistant() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'voice' | 'text'>('voice')
  const [lang, setLang] = useState<LangCode>('auto')
  const [phase, setPhase] = useState<Phase>('idle')
  const [draft, setDraft] = useState('')
  const [turns, setTurns] = useState<Turn[]>([])
  const [failure, setFailure] = useState<string | null>(null)
  const [context, setContext] = useState<Record<string, unknown>>({})
  const feedRef = useRef<HTMLDivElement>(null)

  const tts = useSpeechSynthesis()

  useEffect(() => { if (user?.preferred_language) setLang(user.preferred_language) }, [user])
  useEffect(() => { feedRef.current?.scrollTo({ top: 1e6, behavior: 'smooth' }) }, [turns, phase])

  const send = useCallback(async (text: string, viaVoice: boolean) => {
    if (!text.trim()) return
    setTurns(t => [...t, { role: 'you', text, lang }])
    setDraft('')
    setPhase('processing')
    setFailure(null)
    try {
      const body = { message: text, language: lang, context }
      const reply: AssistantReply = viaVoice
        ? await api.ai.voice(body)
        : await api.ai.ask({ ...body, input_type: 'text' })

      setTurns(t => [...t, { role: 'cargo', text: reply.reply, lang: reply.language,
                             cars: reply.cars }])
      // carry the slots forward so follow-ups only need the missing piece
      setContext(c => ({ ...c, ...Object.fromEntries(
        Object.entries(reply.filters).filter(([, v]) => v !== null && v !== undefined)) }))

      if (user?.voice_response !== false && tts.supported) {
        setPhase('speaking')
        tts.speak(reply.reply, reply.speech_lang, user?.voice_speed ?? 'normal')
        window.setTimeout(() => setPhase('done'), 400)
      } else {
        setPhase('done')
      }

      if (reply.action === 'open_bookings') navigate('/bookings')
    } catch (e) {
      setFailure((e as Error).message)
      setPhase('idle')
    }
  }, [lang, context, navigate, tts, user])

  const speech = useSpeechRecognition((text, isFinal) => {
    setDraft(text)
    if (isFinal) send(text, true)
  })

  useEffect(() => { setPhase(speech.listening ? 'listening' : p =>
    p === 'listening' ? 'idle' : p) }, [speech.listening])

  const micLanguage = LANGS.find(l => l.code === lang)?.speech ?? 'en-IN'

  const toggleMic = () => {
    if (tts.speaking) { tts.cancel(); setPhase('idle'); return }  // interrupt
    if (speech.listening) { speech.stop(); return }
    setFailure(null)
    setDraft('')
    speech.start(micLanguage)
  }

  const busy = phase === 'processing'
  const useTextMode = mode === 'text' || !speech.supported

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-signal px-5 py-3
                   font-semibold text-ink-900 shadow-glow transition hover:bg-signal-soft"
        aria-label="Open the CarGo assistant"
      >
        <MicIcon /> <span className="hidden sm:inline">Just speak</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm
                        sm:items-center sm:p-4" role="dialog" aria-modal="true">
          <div className="glass flex h-[88vh] w-full max-w-lg flex-col overflow-hidden sm:h-[640px]">
            <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <h2 className="text-base">CarGo assistant</h2>
                <p className="text-xs text-slate-500">Just speak. CarGo understands.</p>
              </div>
              <button onClick={() => { tts.cancel(); setOpen(false) }} className="btn-quiet">Close</button>
            </header>

            <div className="flex items-center gap-1 border-b border-white/10 px-4 py-2 text-xs">
              {LANGS.map(l => (
                <button
                  key={l.code} lang={l.html} onClick={() => setLang(l.code)}
                  className={`rounded-full px-3 py-1.5 transition ${
                    lang === l.code ? 'bg-signal text-ink-900 font-semibold'
                                    : 'text-slate-400 hover:text-white'}`}
                >{l.label}</button>
              ))}
            </div>

            <div ref={feedRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
              {turns.length === 0 && (
                <div className="space-y-3">
                  <p className="text-sm text-slate-400">
                    Speak or type in English, Telugu or Hindi. Mixing them is fine.
                  </p>
                  {(PROMPTS[lang] ?? PROMPTS.auto).map(p => (
                    <button key={p} onClick={() => send(p, false)}
                      className="card w-full px-4 py-3 text-left text-sm text-slate-300
                                 transition hover:border-signal/40 hover:text-white">
                      {p}
                    </button>
                  ))}
                </div>
              )}

              {turns.map((t, i) => (
                <div key={i} className={t.role === 'you' ? 'text-right' : ''}>
                  <div lang={t.lang}
                    className={`inline-block max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-sm ${
                      t.role === 'you' ? 'bg-signal/15 text-signal-soft'
                                       : 'bg-white/5 text-slate-200'}`}>
                    {t.text}
                  </div>
                  {t.cars && t.cars.length > 0 && (
                    <div className="mt-3 space-y-2 text-left">
                      {t.cars.slice(0, 4).map(c => (
                        <button key={c.id}
                          onClick={() => { setOpen(false); navigate(`/cars/${c.id}`) }}
                          className="card flex w-full items-center gap-3 p-2 text-left transition
                                     hover:border-signal/40">
                          <img src={c.image_url} alt="" className="h-14 w-20 rounded-lg object-cover" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm text-white">{c.brand} {c.model}</p>
                            <p className="text-xs text-slate-500">
                              {c.transmission} · {c.seats} seats · {c.location}
                            </p>
                          </div>
                          <span className="text-sm font-semibold text-signal">
                            {rupees(c.price_per_day)}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {busy && (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Waveform active /> working on it
                </div>
              )}
              {failure && <p className="text-sm text-red-300">{failure}</p>}
              {speech.error && <p className="text-sm text-amber-300">{speech.error}</p>}
            </div>

            <div className="border-t border-white/10 px-5 py-4">
              {useTextMode ? (
                <div className="flex gap-2">
                  <input
                    className="field" value={draft} lang={lang === 'auto' ? 'en' : lang}
                    placeholder="Type what you need"
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') send(draft, false) }}
                  />
                  <button onClick={() => send(draft, false)} disabled={busy || !draft.trim()}
                    className="btn-primary">Send</button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <button
                    onClick={toggleMic}
                    aria-label={phase === 'listening' ? 'Stop listening' : 'Start listening'}
                    className={`relative flex h-16 w-16 items-center justify-center rounded-full
                      transition ${phase === 'listening'
                        ? 'bg-red-500 text-white'
                        : 'bg-signal text-ink-900 shadow-glow hover:bg-signal-soft'}`}
                  >
                    {phase === 'listening' && (
                      <span className="absolute inset-0 animate-pulse-ring rounded-full bg-red-500/40" />
                    )}
                    {phase === 'speaking' ? <Waveform active /> : <MicIcon />}
                  </button>
                  <p className="text-xs text-slate-500">
                    {PHASE_LABEL[phase]}
                    {phase === 'speaking' && ' — tap to interrupt'}
                  </p>
                  {draft && <p className="text-sm italic text-slate-400">{draft}</p>}
                </div>
              )}

              <div className="mt-3 flex items-center justify-center gap-3 text-xs text-slate-500">
                {speech.supported ? (
                  <button onClick={() => setMode(m => m === 'voice' ? 'text' : 'voice')}
                    className="hover:text-signal">
                    {mode === 'voice' ? 'Type instead' : 'Use voice'}
                  </button>
                ) : (
                  <span>Voice input is not available in this browser</span>
                )}
                {turns.length > 0 && (
                  <button onClick={() => { setTurns([]); setContext({}); tts.cancel() }}
                    className="hover:text-signal">Start over</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function MicIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v4" />
    </svg>
  )
}

function Waveform({ active }: { active: boolean }) {
  return (
    <span className="flex h-5 items-end gap-0.5" aria-hidden="true">
      {[0, 1, 2, 3, 4].map(i => (
        <span key={i}
          className={`w-0.5 rounded-full bg-current ${active ? 'animate-bar' : ''}`}
          style={{ height: '100%', animationDelay: `${i * 0.12}s` }} />
      ))}
    </span>
  )
}
