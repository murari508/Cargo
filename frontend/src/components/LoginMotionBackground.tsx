import { useEffect, useRef } from 'react'

export type TimeTheme = 'morning' | 'night'

interface Props {
  theme: TimeTheme
}

export default function LoginMotionBackground({ theme }: Props) {
  const isMorning = theme === 'morning'
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // Canvas particle engine for smooth cinematic dust/embers
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)

    const handleResize = () => {
      if (!canvas) return
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', handleResize)

    // Particle definition
    interface Particle {
      x: number
      y: number
      vx: number
      vy: number
      size: number
      alpha: number
      maxAlpha: number
      alphaStep: number
    }

    const count = isMorning ? 40 : 55
    const particles: Particle[] = Array.from({ length: count }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.4) * (isMorning ? 0.35 : 0.45),
      vy: isMorning ? -Math.random() * 0.45 - 0.15 : -Math.random() * 0.7 - 0.2,
      size: Math.random() * (isMorning ? 3.5 : 2.5) + 1,
      alpha: Math.random() * 0.6,
      maxAlpha: Math.random() * 0.5 + 0.3,
      alphaStep: Math.random() * 0.01 + 0.005,
    }))

    const render = () => {
      ctx.clearRect(0, 0, width, height)

      particles.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        p.alpha += p.alphaStep

        if (p.alpha > p.maxAlpha || p.alpha < 0.1) {
          p.alphaStep = -p.alphaStep
        }

        // Wrap around
        if (p.y < -10) {
          p.y = height + 10
          p.x = Math.random() * width
        }
        if (p.x < -10) p.x = width + 10
        if (p.x > width + 10) p.x = -10

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)

        if (isMorning) {
          // Warm golden solar dust
          ctx.fillStyle = `rgba(251, 191, 36, ${p.alpha * 0.85})`
          ctx.shadowColor = 'rgba(245, 158, 11, 0.9)'
          ctx.shadowBlur = p.size * 3
        } else {
          // Electric cyan / diamond starry embers
          ctx.fillStyle = `rgba(186, 230, 253, ${p.alpha * 0.9})`
          ctx.shadowColor = 'rgba(56, 189, 248, 0.85)'
          ctx.shadowBlur = p.size * 3
        }

        ctx.fill()
      })

      animId = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', handleResize)
    }
  }, [isMorning])

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-ink-900">
      {/* ================= MORNING CINEMATIC LAYER ================= */}
      <div
        className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
          isMorning ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
        }`}
      >
        {/* Realistic Porsche sunrise mountain road image */}
        <div
          className="absolute inset-0 bg-cover bg-center animate-kenburns-morning"
          style={{
            backgroundImage:
              'url("https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1920&q=85&auto=format&fit=crop")',
          }}
        />

        {/* Golden Hour Atmospheric Lighting Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-amber-950/40 to-ink-900/60" />
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 90% 70% at 20% 15%, rgba(251, 191, 36, 0.35) 0%, rgba(234, 88, 12, 0.2) 45%, transparent 75%)',
          }}
        />

        {/* Morning Sunflare Burst */}
        <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-amber-400/25 blur-3xl animate-glow-pulse" />

        {/* Ambient Highway Reflections */}
        <div className="absolute bottom-0 inset-x-0 h-48 bg-gradient-to-t from-ink-900 via-ink-900/80 to-transparent" />
      </div>

      {/* ================= NIGHT CINEMATIC LAYER ================= */}
      <div
        className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
          !isMorning ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
        }`}
      >
        {/* Realistic Supercar at night with LED headlights on wet road */}
        <div
          className="absolute inset-0 bg-cover bg-center animate-kenburns-night"
          style={{
            backgroundImage:
              'url("https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=1920&q=85&auto=format&fit=crop")',
          }}
        />

        {/* Midnight Cyberpunk / Headlight Glow Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-slate-950/50 to-ink-900/70" />
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% 85%, rgba(56, 189, 248, 0.18) 0%, rgba(30, 58, 138, 0.22) 50%, transparent 80%)',
          }}
        />

        {/* Headlight beam pulse */}
        <div className="absolute left-1/2 bottom-20 -translate-x-1/2 h-64 w-[700px] rounded-full bg-cyan-400/10 blur-3xl animate-glow-pulse" />

        {/* Dark Vignette Bottom */}
        <div className="absolute bottom-0 inset-x-0 h-48 bg-gradient-to-t from-ink-900 via-ink-900/85 to-transparent" />
      </div>

      {/* ================= SHARED CANVAS MOTION PARTICLES ================= */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

      {/* Global Vignette for High-Contrast Form Legibility */}
      <div className="absolute inset-0 bg-gradient-to-b from-ink-900/50 via-transparent to-ink-900/80 pointer-events-none" />
      <div className="absolute inset-0 bg-black/25 backdrop-blur-[1.5px] pointer-events-none" />
    </div>
  )
}
