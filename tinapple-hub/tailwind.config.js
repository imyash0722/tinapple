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
          dark: '#060709',       // Deepest OLED obsidian black
          base: '#0a0c0f',       // Foundation void
          surface: '#111419',    // Raised panel
          card: '#15181f',       // Glass card surface
          cardhover: '#1a1f28',  // Card active hover
          border: 'rgba(255, 255, 255, 0.06)',
          'border-hover': 'rgba(229, 181, 103, 0.32)',
          'border-green': 'rgba(126, 199, 137, 0.32)',
          gold: 'rgb(var(--tinapple-accent-rgb, 229 181 103) / <alpha-value>)',       // Pineapple core amber / gold
          amber: '#f59e0b',
          green: 'rgb(var(--tinapple-secondary-rgb, 126 199 137) / <alpha-value>)',      // Fresh palm / crown green
          sage: '#98c379',
          emerald: '#10b981',
          teal: '#2dd4bf',
          red: '#f87171',
          text: '#f3f4f6',       // High-contrast clean white
          subtext: '#9ca3af',    // Clean legible slate
          muted: '#4b5563',      // Subdued metadata
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
