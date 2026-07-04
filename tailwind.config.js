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
        lime: {
          DEFAULT: 'var(--lime)',
          dark: 'var(--lime-dark)',
          muted: 'var(--lime-muted)',
          glow: 'var(--lime-glow)'
        },
        panel: {
          bg: 'var(--panel-bg)',
          dark: 'var(--panel-dark)'
        },
        canvas: {
          bg: 'var(--canvas-bg)'
        },
        ink: {
          DEFAULT: 'var(--ink)',
          muted: 'var(--ink-muted)'
        },
        traffic: {
          close: 'var(--red-close)',
          min: 'var(--yellow-min)',
          max: 'var(--green-max)'
        }
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace']
      }
    },
  },
  plugins: [],
}
