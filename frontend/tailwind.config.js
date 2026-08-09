/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Chart surfaces and ink, taken from the validated dark palette so the
        // UI chrome and the chart marks sit on the same measured surface.
        plane: '#0d0f13',
        surface: '#16181d',
        raised: '#1d2027',
        hairline: '#262a32',
        ink: '#ffffff',
        'ink-secondary': '#c3c2b7',
        'ink-muted': '#898781',
        accent: '#3987e5',
        'accent-soft': '#1c5cab',
        good: '#0ca30c',
        warning: '#fab219',
        serious: '#ec835a',
        critical: '#d03b3b',
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
