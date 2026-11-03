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
        emerald: { 300: 'rgb(var(--md-sys-color-success-rgb, 126 199 137) / <alpha-value>)', 400: 'rgb(var(--md-sys-color-success-rgb, 126 199 137) / <alpha-value>)', 500: 'rgb(var(--md-sys-color-success-rgb, 126 199 137) / <alpha-value>)' },
        green: { 300: 'rgb(var(--md-sys-color-success-rgb, 126 199 137) / <alpha-value>)', 400: 'rgb(var(--md-sys-color-success-rgb, 126 199 137) / <alpha-value>)', 500: 'rgb(var(--md-sys-color-success-rgb, 126 199 137) / <alpha-value>)' },
        red: { 300: 'rgb(var(--md-sys-color-error-rgb, 255 180 171) / <alpha-value>)', 400: 'rgb(var(--md-sys-color-error-rgb, 255 180 171) / <alpha-value>)', 500: 'rgb(var(--md-sys-color-error-rgb, 255 180 171) / <alpha-value>)' },
        amber: { 300: 'rgb(var(--md-sys-color-warning-rgb, 239 193 102) / <alpha-value>)', 400: 'rgb(var(--md-sys-color-warning-rgb, 239 193 102) / <alpha-value>)', 500: 'rgb(var(--md-sys-color-warning-rgb, 239 193 102) / <alpha-value>)' },
        sky: { 300: 'rgb(var(--md-sys-color-primary-rgb, 144 206 243) / <alpha-value>)', 400: 'rgb(var(--md-sys-color-primary-rgb, 144 206 243) / <alpha-value>)', 500: 'rgb(var(--md-sys-color-primary-rgb, 144 206 243) / <alpha-value>)' },
        blue: { 300: 'rgb(var(--md-sys-color-primary-rgb, 144 206 243) / <alpha-value>)', 400: 'rgb(var(--md-sys-color-primary-rgb, 144 206 243) / <alpha-value>)', 500: 'rgb(var(--md-sys-color-primary-rgb, 144 206 243) / <alpha-value>)' },
        cyan: { 300: 'rgb(var(--md-sys-color-primary-rgb, 144 206 243) / <alpha-value>)', 400: 'rgb(var(--md-sys-color-primary-rgb, 144 206 243) / <alpha-value>)', 500: 'rgb(var(--md-sys-color-primary-rgb, 144 206 243) / <alpha-value>)' },
        purple: { 300: 'rgb(var(--md-sys-color-tertiary-rgb, 202 193 233) / <alpha-value>)', 400: 'rgb(var(--md-sys-color-tertiary-rgb, 202 193 233) / <alpha-value>)', 500: 'rgb(var(--md-sys-color-tertiary-rgb, 202 193 233) / <alpha-value>)' },
        'surface': 'rgb(var(--md-sys-color-surface-rgb, 9 14 24) / <alpha-value>)',
        'surface-dim': 'rgb(var(--md-sys-color-surface-dim-rgb, 7 10 19) / <alpha-value>)',
        'surface-bright': 'rgb(var(--md-sys-color-surface-bright-rgb, 42 50 66) / <alpha-value>)',
        'surface-container-lowest': 'rgb(var(--md-sys-color-surface-container-lowest-rgb, 5 7 15) / <alpha-value>)',
        'surface-container-low': 'rgb(var(--md-sys-color-surface-container-low-rgb, 12 18 31) / <alpha-value>)',
        'surface-container': 'rgb(var(--md-sys-color-surface-container-rgb, 16 24 40) / <alpha-value>)',
        'surface-container-high': 'rgb(var(--md-sys-color-surface-container-high-rgb, 21 32 52) / <alpha-value>)',
        'surface-container-highest': 'rgb(var(--md-sys-color-surface-container-highest-rgb, 28 41 64) / <alpha-value>)',
        'primary': 'rgb(var(--md-sys-color-primary-rgb, 143 205 247) / <alpha-value>)',
        'on-primary': 'rgb(var(--md-sys-color-on-primary-rgb, 0 52 74) / <alpha-value>)',
        'primary-container': 'rgb(var(--md-sys-color-primary-container-rgb, 0 76 106) / <alpha-value>)',
        'on-primary-container': 'rgb(var(--md-sys-color-on-primary-container-rgb, 200 230 255) / <alpha-value>)',
        'secondary': 'rgb(var(--md-sys-color-secondary-rgb, 185 201 215) / <alpha-value>)',
        'on-secondary': 'rgb(var(--md-sys-color-on-secondary-rgb, 35 50 61) / <alpha-value>)',
        'secondary-container': 'rgb(var(--md-sys-color-secondary-container-rgb, 58 73 84) / <alpha-value>)',
        'on-secondary-container': 'rgb(var(--md-sys-color-on-secondary-container-rgb, 213 229 243) / <alpha-value>)',
        'on-surface': 'rgb(var(--md-sys-color-on-surface-rgb, 224 229 237) / <alpha-value>)',
        'on-surface-variant': 'rgb(var(--md-sys-color-on-surface-variant-rgb, 193 200 212) / <alpha-value>)',
        'outline': 'rgb(var(--md-sys-color-outline-rgb, 139 147 159) / <alpha-value>)',
        'outline-variant': 'rgb(var(--md-sys-color-outline-variant-rgb, 63 71 85) / <alpha-value>)',
        'error': 'rgb(var(--md-sys-color-error-rgb, 255 180 171) / <alpha-value>)',
        'on-error': 'rgb(var(--md-sys-color-on-error-rgb, 105 0 5) / <alpha-value>)',
        tinapple: {
          dark: 'rgb(var(--md-sys-color-surface-rgb, 9 14 24) / <alpha-value>)',       // Deepest OLED midnight navy
          base: 'rgb(var(--md-sys-color-surface-container-lowest-rgb, 5 7 15) / <alpha-value>)',       // Foundation deep navy
          surface: 'rgb(var(--md-sys-color-surface-container-rgb, 16 24 40) / <alpha-value>)',    // Raised dark blue panel
          card: 'rgb(var(--md-sys-color-surface-container-low-rgb, 12 18 31) / <alpha-value>)',       // Glass dark blue card surface
          cardhover: 'rgb(var(--md-sys-color-surface-container-high-rgb, 21 32 52) / <alpha-value>)',  // Card active hover
          border: 'rgb(var(--md-sys-color-outline-variant-rgb, 63 71 85) / <alpha-value>)',
          'border-hover': 'rgba(56, 189, 248, 0.35)',
          'border-green': 'rgba(59, 130, 246, 0.35)',
          gold: 'rgb(var(--tinapple-accent-rgb, 56 189 248) / <alpha-value>)',
          amber: '#38bdf8',
          green: 'rgb(var(--md-sys-color-success-rgb, 126 199 137) / <alpha-value>)',
          sage: '#60a5fa',
          emerald: '#38bdf8',
          teal: '#0ea5e9',
          red: '#f87171',
          text: 'rgb(var(--md-sys-color-on-surface-rgb, 224 229 237) / <alpha-value>)',       // High-contrast clean white
          subtext: 'rgb(var(--md-sys-color-on-surface-variant-rgb, 193 200 212) / <alpha-value>)',    // Clean legible slate blue
          muted: 'rgb(var(--md-sys-color-on-surface-variant-rgb, 193 200 212) / <alpha-value>)',      // Subdued metadata
        }
      },
      borderRadius: { 'm3-card': '28px', 'm3-inner': '12px' },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Roboto Flex Variable', 'Google Sans', 'system-ui', '-apple-system', 'sans-serif'],
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
