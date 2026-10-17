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
          dark: '#0a0b10',
          base: '#0f111a',
          surface: '#161824',
          card: '#1a1c2b',
          border: 'rgba(255, 255, 255, 0.08)',
          'border-hover': 'rgba(122, 162, 247, 0.3)',
          orange: '#ff9e64',
          cyan: '#7dcfff',
          blue: '#7aa2f7',
          purple: '#bb9af7',
          green: '#73daca',
          yellow: '#e0af68',
          red: '#f7768e',
          text: '#c0caf5',
          subtext: '#7982a9',
          muted: '#414868',
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
        'pulse-subtle': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(0.98)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'shiny-text': 'shiny-text 8s infinite',
        'pulse-subtle': 'pulse-subtle 3s ease-in-out infinite',
        shimmer: 'shimmer 2.5s infinite',
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
