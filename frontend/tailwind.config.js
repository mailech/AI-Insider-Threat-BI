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
        threat: {
          bg: "#060913",
          card: "#0b1329",
          cardHover: "#111c3a",
          border: "#1e293b",
          borderLight: "#334155",
          accent: "#06b6d4",
          accentGlow: "rgba(6, 182, 212, 0.15)",
          low: "#10b981",
          medium: "#f59e0b",
          high: "#f97316",
          critical: "#ef4444"
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'cyber-cyan': '0 0 20px -5px rgba(6, 182, 212, 0.3)',
        'cyber-red': '0 0 20px -5px rgba(239, 68, 68, 0.4)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      }
    },
  },
  plugins: [],
}
