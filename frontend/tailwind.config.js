/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        base: {
          950: "#0a0f14",
          900: "#0f1620",
          800: "#141d2a",
          700: "#1c2836",
          600: "#2a3a4d",
        },
        signal: {
          amber: "#e8a33d",
          cyan: "#3fb8c9",
          red: "#d9534f",
          green: "#4caf7d",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
}
