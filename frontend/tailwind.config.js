/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      // Every colour resolves through a CSS custom property, so a theme change
      // is one attribute on <html> rather than a class swap across the tree.
      colors: {
        plane: 'var(--plane)',
        surface: {
          DEFAULT: 'var(--surface)',
          sunken: 'var(--surface-sunken)',
          hover: 'var(--surface-hover)',
        },
        ink: {
          DEFAULT: 'var(--ink)',
          secondary: 'var(--ink-secondary)',
          muted: 'var(--ink-muted)',
          faint: 'var(--ink-faint)',
        },
        line: {
          DEFAULT: 'var(--line)',
          strong: 'var(--line-strong)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          ink: 'var(--accent-ink)',
          wash: 'var(--accent-wash)',
        },
        sev: {
          informational: 'var(--sev-informational)',
          low: 'var(--sev-low)',
          medium: 'var(--sev-medium)',
          high: 'var(--sev-high)',
          critical: 'var(--sev-critical)',
        },
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace'],
      },
      fontSize: {
        '2xs': ['11px', { lineHeight: '15px' }],
      },
      borderRadius: {
        DEFAULT: '5px',
        panel: '6px',
      },
    },
  },
  plugins: [],
}
