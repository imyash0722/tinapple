/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        tinapple: {
          dark: '#050a16',       // Deepest OLED midnight navy
          base: '#070f22',       // Foundation deep navy
          surface: '#0d1835',    // Raised dark blue panel
          card: '#101f42',       // Glass dark blue card surface
          cardhover: '#152854',  // Card active hover
          border: 'rgba(56, 189, 248, 0.08)',
          'border-hover': 'rgba(56, 189, 248, 0.35)',
          'border-green': 'rgba(59, 130, 246, 0.35)',
          gold: 'rgb(var(--tinapple-accent-rgb, 56 189 248) / <alpha-value>)',
          amber: '#38bdf8',
          green: 'rgb(var(--tinapple-secondary-rgb, 59 130 246) / <alpha-value>)',
          sage: '#60a5fa',
          emerald: '#38bdf8',
          teal: '#0ea5e9',
          red: '#f87171',
          text: '#f1f5f9',       // High-contrast clean white
          subtext: '#94a3b8',    // Clean legible slate blue
          muted: '#475569',      // Subdued metadata
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      keyframes: {
        'shiny-text': {
          '0%, 90%, 100%': {
            'background-position': 'calc(-100% - var(--shiny-width, 100px)) 0',
          },
          '30%, 60%': {
            'background-position': 'calc(100% + var(--shiny-width, 100px)) 0',
          },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '1', filter: 'drop-shadow(0 0 8px rgba(126, 199, 137, 0.6))' },
          '50%': { opacity: '0.6', filter: 'drop-shadow(0 0 2px rgba(126, 199, 137, 0.2))' },
        },
        'gold-glow': {
          '0%, 100%': { filter: 'drop-shadow(0 0 10px rgba(229, 181, 103, 0.5))' },
          '50%': { filter: 'drop-shadow(0 0 3px rgba(229, 181, 103, 0.15))' },
        },
      },
      animation: {
        'shiny-text': 'shiny-text 8s infinite',
        'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
        'gold-glow': 'gold-glow 4s ease-in-out infinite',
      },
      backdropBlur: {
        xs: '2px',
        '2xl': '24px',
        '3xl': '32px',
      }
    },
  },
  plugins: [],
}
