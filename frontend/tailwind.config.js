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
        soc: {
          dark: "#0a0e17",
          panel: "#111827",
          card: "#182234",
          border: "#1f2e46",
          accent: "#06b6d4",
          red: "#ef4444",
          amber: "#f59e0b",
          green: "#10b981",
          purple: "#8b5cf6"
        }
      }
    },
  },
  plugins: [],
}
