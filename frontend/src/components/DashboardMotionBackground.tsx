export type DashboardTheme = 'morning' | 'night'

interface Props {
  theme: DashboardTheme
}

export default function DashboardMotionBackground({ theme }: Props) {
  const isMorning = theme === 'morning'

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-ink-900">
      {/* ================= MORNING COCKPIT PERSPECTIVE ================= */}
      <div
        className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
          isMorning ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
        }`}
      >
        {/* Driver's POV: Steering wheel & open morning coastal road */}
        <div
          className="absolute inset-0 bg-cover bg-center animate-kenburns-morning opacity-35"
          style={{
            backgroundImage:
              'url("https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=1920&q=80&auto=format&fit=crop")',
          }}
        />

        {/* Morning Cockpit Ambient Lighting (Warm Golden Instrument Glow) */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 50% at 50% 10%, rgba(245, 158, 11, 0.22) 0%, transparent 70%), ' +
              'radial-gradient(circle 500px at 15% 90%, rgba(217, 119, 6, 0.18) 0%, transparent 65%), ' +
              'linear-gradient(to bottom, #08090b 0%, rgba(18, 10, 5, 0.85) 40%, #08090b 100%)',
          }}
        />

        {/* Ambient Sunrise Trim Pulse */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-400/50 to-transparent blur-[1px]" />
      </div>

      {/* ================= NIGHT DIGITAL COCKPIT PERSPECTIVE ================= */}
      <div
        className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
          !isMorning ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
        }`}
      >
        {/* Driver's POV: Digital instrument cluster, glowing gauges & night city highway */}
        <div
          className="absolute inset-0 bg-cover bg-center animate-kenburns-night opacity-30"
          style={{
            backgroundImage:
              'url("https://images.unsplash.com/photo-1508974239320-0a029497e820?w=1920&q=80&auto=format&fit=crop")',
          }}
        />

        {/* Night Cockpit Ambient Lighting (Cyan & Deep Indigo LED Ambient Strip) */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 50% at 50% 15%, rgba(56, 189, 248, 0.16) 0%, transparent 70%), ' +
              'radial-gradient(circle 550px at 85% 85%, rgba(99, 102, 241, 0.18) 0%, transparent 70%), ' +
              'linear-gradient(to bottom, #08090b 0%, rgba(5, 11, 24, 0.88) 40%, #08090b 100%)',
          }}
        />

        {/* Ambient Neon Cyan Trim Pulse */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent blur-[1px]" />
      </div>

      {/* ================= DIGITAL TELEMETRY HUD OVERLAY ================= */}
      <div className="absolute inset-0 pointer-events-none opacity-25">
        {/* Subtle HUD Grid Lines */}
        <div
          className="h-full w-full"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px), ' +
              'linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      {/* Deep Vignette Overlay for High Readability of Telemetry Stats */}
      <div className="absolute inset-0 bg-radial-gradient from-transparent via-ink-900/60 to-ink-900/95 pointer-events-none" />
    </div>
  )
}
