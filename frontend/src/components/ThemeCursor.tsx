import { useEffect, useRef, useState } from 'react'

interface Props {
  theme: 'morning' | 'night'
}

export default function ThemeCursor({ theme }: Props) {
  const isMorning = theme === 'morning'
  const followerRef = useRef<HTMLDivElement | null>(null)
  const dotRef = useRef<HTMLDivElement | null>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [isClicked, setIsClicked] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  // Hide system/browser arrow cursor completely so ONLY the luminous effect shows
  useEffect(() => {
    document.body.style.cursor = 'none'

    const styleEl = document.createElement('style')
    styleEl.id = 'theme-cursor-effect-style'
    styleEl.innerHTML = `
      *, *::before, *::after {
        cursor: none !important;
      }
    `
    document.head.appendChild(styleEl)

    return () => {
      document.body.style.cursor = 'auto'
      const existing = document.getElementById('theme-cursor-effect-style')
      if (existing) existing.remove()
    }
  }, [])

  // Smooth Motion Follower Loop
  useEffect(() => {
    let mouseX = -100
    let mouseY = -100
    let followerX = -100
    let followerY = -100
    let animId: number

    const onMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX
      mouseY = e.clientY
      setIsVisible(true)

      // Direct placement for instant feedback core dot
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`
      }

      // Check if hovering interactive target
      const target = e.target as HTMLElement | null
      const clickable = target?.closest('button, a, input, select, textarea, .btn, [role="button"], article, .card')
      setIsHovered(!!clickable)
    }

    const onMouseDown = () => setIsClicked(true)
    const onMouseUp = () => setIsClicked(false)
    const onMouseLeave = () => setIsVisible(false)
    const onMouseEnter = () => setIsVisible(true)

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mouseup', onMouseUp)
    document.addEventListener('mouseleave', onMouseLeave)
    document.addEventListener('mouseenter', onMouseEnter)

    // Smooth lerp for trailing aura ring
    const render = () => {
      followerX += (mouseX - followerX) * 0.22
      followerY += (mouseY - followerY) * 0.22

      if (followerRef.current) {
        followerRef.current.style.transform = `translate3d(${followerX}px, ${followerY}px, 0)`
      }

      animId = requestAnimationFrame(render)
    }
    animId = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mouseup', onMouseUp)
      document.removeEventListener('mouseleave', onMouseLeave)
      document.removeEventListener('mouseenter', onMouseEnter)
    }
  }, [])

  if (!isVisible) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {/* Trailing Aura Ring Effect */}
      <div
        ref={followerRef}
        className={`fixed left-0 top-0 -ml-4 -mt-4 rounded-full transition-all duration-200 ease-out will-change-transform ${
          isHovered
            ? isMorning
              ? 'h-14 w-14 -ml-7 -mt-7 border-2 border-amber-400 bg-amber-400/25 shadow-[0_0_24px_rgba(251,191,36,0.7)] backdrop-blur-[1px]'
              : 'h-14 w-14 -ml-7 -mt-7 border-2 border-cyan-400 bg-cyan-400/25 shadow-[0_0_24px_rgba(6,182,212,0.7)] backdrop-blur-[1px]'
            : isMorning
            ? 'h-8 w-8 border border-amber-400/70 bg-amber-500/15 shadow-[0_0_14px_rgba(245,158,11,0.5)]'
            : 'h-8 w-8 border border-cyan-400/70 bg-cyan-500/15 shadow-[0_0_14px_rgba(6,182,212,0.5)]'
        } ${isClicked ? 'scale-75' : 'scale-100'}`}
      />

      {/* Luminous Light Core Dot Effect */}
      <div
        ref={dotRef}
        className={`fixed left-0 top-0 -ml-1.5 -mt-1.5 h-3 w-3 rounded-full will-change-transform transition-transform duration-75 ${
          isMorning
            ? 'bg-amber-300 border border-white shadow-[0_0_10px_#f59e0b]'
            : 'bg-cyan-300 border border-white shadow-[0_0_10px_#06b6d4]'
        } ${isClicked ? 'scale-50' : isHovered ? 'scale-125' : 'scale-100'}`}
      />
    </div>
  )
}

