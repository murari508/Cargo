import { useEffect, useRef, useState } from 'react'

export default function AttractiveCarCursor() {
  const beamRef = useRef<HTMLDivElement | null>(null)
  const haloRef = useRef<HTMLDivElement | null>(null)
  const dotRef = useRef<HTMLDivElement | null>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [isClicked, setIsClicked] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  // Hide system/browser arrow cursor completely on Search Cars so ONLY the automotive effect shows
  useEffect(() => {
    document.body.style.cursor = 'none'

    const styleEl = document.createElement('style')
    styleEl.id = 'attractive-car-cursor-style'
    styleEl.innerHTML = `
      *, *::before, *::after {
        cursor: none !important;
      }
    `
    document.head.appendChild(styleEl)

    return () => {
      document.body.style.cursor = 'auto'
      const existing = document.getElementById('attractive-car-cursor-style')
      if (existing) existing.remove()
    }
  }, [])

  // Headlight illumination effect following pointer
  useEffect(() => {
    let mouseX = -200
    let mouseY = -200
    let currentX = -200
    let currentY = -200
    let haloX = -200
    let haloY = -200
    let animId: number

    const onMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX
      mouseY = e.clientY
      setIsVisible(true)

      // Direct placement for instant feedback spark core
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`
      }

      const target = e.target as HTMLElement | null
      const isCardOrControl = !!target?.closest('article, .card, button, a, input, select')
      setIsHovered(isCardOrControl)
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

    const render = () => {
      currentX += (mouseX - currentX) * 0.25
      currentY += (mouseY - currentY) * 0.25
      haloX += (mouseX - haloX) * 0.2
      haloY += (mouseY - haloY) * 0.2

      if (beamRef.current) {
        beamRef.current.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`
      }
      if (haloRef.current) {
        haloRef.current.style.transform = `translate3d(${haloX}px, ${haloY}px, 0)`
      }

      animId = requestAnimationFrame(render)
    }
    animId = requestAnimationFrame(render)
    render()

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
    <div className="pointer-events-none fixed inset-0 z-30 overflow-hidden">
      {/* Ambient Automotive Headlight Beam following cursor */}
      <div
        ref={beamRef}
        className={`fixed left-0 top-0 -ml-40 -mt-40 h-80 w-80 rounded-full transition-all duration-300 ease-out will-change-transform ${
          isHovered
            ? 'scale-125 opacity-100'
            : 'scale-90 opacity-60'
        }`}
        style={{
          background: isClicked
            ? 'radial-gradient(circle, rgba(255, 215, 0, 0.35) 0%, rgba(255, 176, 32, 0.15) 45%, transparent 75%)'
            : isHovered
            ? 'radial-gradient(circle, rgba(255, 176, 32, 0.22) 0%, rgba(255, 176, 32, 0.08) 50%, transparent 80%)'
            : 'radial-gradient(circle, rgba(255, 176, 32, 0.12) 0%, rgba(255, 176, 32, 0.03) 50%, transparent 80%)',
          filter: 'blur(8px)',
        }}
      />

      {/* Sports Car Precision Halo Ring */}
      <div
        ref={haloRef}
        className={`fixed left-0 top-0 -ml-4 -mt-4 rounded-full transition-all duration-200 ease-out will-change-transform ${
          isHovered
            ? 'h-12 w-12 -ml-6 -mt-6 border-2 border-amber-400 bg-amber-400/20 shadow-[0_0_20px_rgba(251,191,36,0.6)]'
            : 'h-7 w-7 border border-amber-400/60 bg-amber-500/10 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
        } ${isClicked ? 'scale-75' : 'scale-100'}`}
      />

      {/* Luminous Golden Automotive Spark Core */}
      <div
        ref={dotRef}
        className={`fixed left-0 top-0 -ml-1.5 -mt-1.5 h-3 w-3 rounded-full border border-white bg-amber-300 shadow-[0_0_12px_#f59e0b] will-change-transform transition-transform duration-75 ${
          isClicked ? 'scale-50' : isHovered ? 'scale-125' : 'scale-100'
        }`}
      />
    </div>
  )
}

