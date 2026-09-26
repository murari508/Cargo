/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          900: '#08090B',   // page
          800: '#0E1013',   // raised surface
          700: '#15181D',   // card
          600: '#1D2229',   // border-ish
          500: '#2A3039',
        },
        signal: {
          DEFAULT: '#FFB020', // headlight amber - the one loud colour
          soft: '#FFD27A',
          deep: '#B87400',
        },
        road: '#3FBFA8',      // secondary, used only for availability states
      },
      fontFamily: {
        display: ['Sora', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: { xl2: '1.25rem' },
      boxShadow: {
        lift: '0 24px 60px -30px rgba(0,0,0,0.9)',
        glow: '0 0 0 1px rgba(255,176,32,0.35), 0 12px 40px -12px rgba(255,176,32,0.35)',
      },
      keyframes: {
        pulseRing: {
          '0%': { transform: 'scale(0.9)', opacity: '0.7' },
          '100%': { transform: 'scale(1.8)', opacity: '0' },
        },
        bar: {
          '0%,100%': { transform: 'scaleY(0.3)' },
          '50%': { transform: 'scaleY(1)' },
        },
      },
      animation: {
        'pulse-ring': 'pulseRing 1.6s ease-out infinite',
        bar: 'bar 0.9s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
