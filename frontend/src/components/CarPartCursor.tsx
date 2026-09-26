import { useEffect, useRef, useState } from 'react'

export default function CarPartCursor() {
  const wheelRef = useRef<HTMLDivElement | null>(null)
  const dotRef = useRef<HTMLDivElement | null>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [isClicked, setIsClicked] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  // Custom Steering Arrow SVG Cursor for native browser responsiveness
  const steeringCursorSvg = encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.8"/>
        </filter>
      </defs>
      <!-- Automotive Precision Steering Arrow -->
      <polygon points="3,3 12,27 16,17 26,13" fill="#FFB020" stroke="#FFFFFF" stroke-width="1.5" stroke-linejoin="round" filter="url(#shadow)"/>
      <circle cx="13" cy="13" r="2.5" fill="#18181B" stroke="#FFFFFF" stroke-width="1"/>
    </svg>
  `)

  // Apply custom steering cursor to document body on Search Cars page
  useEffect(() => {
    const cursorUrl = `url("data:image/svg+xml,${steeringCursorSvg}") 3 3, auto`
    document.body.style.cursor = cursorUrl

    const styleEl = document.createElement('style')
    styleEl.id = 'search-cars-cursor-style'
    styleEl.innerHTML = `
      button, a, input, select, textarea, [role="button"], .btn {
        cursor: url("data:image/svg+xml,${steeringCursorSvg}") 3 3, pointer !important;
      }
    `
    document.head.appendChild(styleEl)

    return () => {
      document.body.style.cursor = 'auto'
      const existing = document.getElementById('search-cars-cursor-style')
      if (existing) existing.remove()
    }
  }, [steeringCursorSvg])

  // Steering Motion Physics Loop
  useEffect(() => {
    let mouseX = -100
    let mouseY = -100
    let wheelX = -100
    let wheelY = -100
    let lastX = -100
    let steeringAngle = 0
    let targetAngle = 0
    let animId: number

    const onMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX
      mouseY = e.clientY
      setIsVisible(true)

      // Calculate steering deflection angle based on horizontal mouse velocity
      const deltaX = e.clientX - lastX
      lastX = e.clientX

      // Clamp steering angle between -35deg and +35deg
      targetAngle = Math.max(-35, Math.min(35, deltaX * 2.8))

      // Direct placement for precision center dot
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`
      }

      // Check hover state on cars or controls
      const target = e.target as HTMLElement | null
      const clickable = target?.closest('button, a, input, select, article, .card, .btn')
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

    // Render loop with realistic damping and steering return-to-center
    const render = () => {
      // Smooth lerp for position trailing (offset slightly so it floats near the pointer)
      wheelX += (mouseX - wheelX) * 0.2
      wheelY += (mouseY - wheelY) * 0.2

      // Smooth return to center when stopped (like real car power steering)
      steeringAngle += (targetAngle - steeringAngle) * 0.15
      targetAngle *= 0.88

      if (wheelRef.current) {
        const scale = isHovered ? 1.25 : 1.0
        wheelRef.current.style.transform = `translate3d(${wheelX + 18}px, ${wheelY + 18}px, 0) rotate(${steeringAngle}deg) scale(${scale})`
      }

      animId = requestAnimationFrame(render)
    }
    render()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mouseup', onMouseUp)
      document.removeEventListener('mouseleave', onMouseLeave)
      document.removeEventListener('mouseenter', onMouseEnter)
    }
  }, [isHovered])

  if (!isVisible) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {/* Precision Automotive Dot */}
      <div
        ref={dotRef}
        className="fixed left-0 top-0 -ml-1 -mt-1 h-2 w-2 rounded-full bg-signal shadow-[0_0_10px_#FFB020] will-change-transform"
      />

      {/* Interactive Floating Sports Steering Wheel Car Part */}
      <div
        ref={wheelRef}
        className={`fixed left-0 top-0 -ml-5 -mt-5 h-10 w-10 will-change-transform transition-[filter] duration-200 ${
          isClicked ? 'brightness-125' : ''
        } ${isHovered ? 'drop-shadow-[0_0_12px_rgba(255,176,32,0.7)]' : 'drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]'}`}
      >
        <svg
          viewBox="0 0 44 44"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-full w-full"
        >
          {/* Outer Leather Grip Rim */}
          <circle cx="22" cy="22" r="19" stroke="#1E293B" strokeWidth="4.8" />
          <circle
            cx="22"
            cy="22"
            r="19"
            stroke="#FFB020"
            strokeWidth="1.2"
            strokeDasharray="10 6"
            className="opacity-90"
          />

          {/* Red 12 O'Clock Racing Center Marker */}
          <rect x="20.5" y="0.5" width="3" height="4.5" fill="#EF4444" rx="1" />

          {/* Inner Rim Bezel */}
          <circle cx="22" cy="22" r="16.6" stroke="#334155" strokeWidth="1" />

          {/* Brushed Aluminum 3-Spoke Layout */}
          {/* Left Spoke */}
          <line
            x1="6"
            y1="22"
            x2="16"
            y2="22"
            stroke="#94A3B8"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          {/* Right Spoke */}
          <line
            x1="28"
            y1="22"
            x2="38"
            y2="22"
            stroke="#94A3B8"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          {/* Bottom Spoke */}
          <line
            x1="22"
            y1="28"
            x2="22"
            y2="38"
            stroke="#94A3B8"
            strokeWidth="3.2"
            strokeLinecap="round"
          />

          {/* Center Horn Boss & CarGo Logo Hub */}
          <circle cx="22" cy="22" r="6.8" fill="#0F172A" stroke="#FFB020" strokeWidth="1.6" />
          <circle cx="22" cy="22" r="3.2" fill="#FFB020" />
          <circle cx="22" cy="22" r="1.2" fill="#FFFFFF" />
        </svg>
      </div>
    </div>
  )
}
