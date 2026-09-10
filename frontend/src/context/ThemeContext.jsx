import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const ThemeContext = createContext(null)
const STORAGE_KEY = 'itbis.theme'

/** 'system' follows the OS; 'light' and 'dark' stamp the root element. */
const MODES = ['light', 'dark', 'system']

function readStored() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return MODES.includes(stored) ? stored : 'system'
  } catch {
    return 'system'
  }
}

function applyMode(mode) {
  const root = document.documentElement
  if (mode === 'system') {
    root.removeAttribute('data-theme')
  } else {
    root.setAttribute('data-theme', mode)
  }
}

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(readStored)
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false,
  )

  useEffect(() => {
    applyMode(mode)
    try {
      localStorage.setItem(STORAGE_KEY, mode)
    } catch {
      /* private browsing - the theme simply does not persist */
    }
  }, [mode])

  useEffect(() => {
    const query = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!query) return undefined
    const listener = (event) => setSystemDark(event.matches)
    query.addEventListener('change', listener)
    return () => query.removeEventListener('change', listener)
  }, [])

  const resolved = mode === 'system' ? (systemDark ? 'dark' : 'light') : mode

  const cycle = useCallback(() => {
    setMode((current) => MODES[(MODES.indexOf(current) + 1) % MODES.length])
  }, [])

  const value = useMemo(
    () => ({ mode, resolved, setMode, cycle, isDark: resolved === 'dark' }),
    [mode, resolved, cycle],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used inside ThemeProvider')
  return context
}

/**
 * Resolve design tokens to concrete values.
 *
 * Recharts needs real colour strings rather than `var(--x)`, so charts read the
 * computed values and re-read them whenever the theme changes.
 */
export function useTokens() {
  const { resolved } = useTheme()
  return useMemo(() => {
    const styles = getComputedStyle(document.documentElement)
    const token = (name, fallback) => (styles.getPropertyValue(name) || fallback).trim()
    return {
      surface: token('--surface', '#fcfcfb'),
      ink: token('--ink', '#0b0b0b'),
      inkSecondary: token('--ink-secondary', '#52514e'),
      inkMuted: token('--ink-muted', '#898781'),
      line: token('--line', '#e1e0d9'),
      grid: token('--grid', '#e1e0d9'),
      axis: token('--axis', '#c3c2b7'),
      series: [
        token('--series-1', '#2a78d6'),
        token('--series-2', '#eb6834'),
        token('--series-3', '#1baf7a'),
        token('--series-4', '#eda100'),
        token('--series-5', '#e87ba4'),
        token('--series-6', '#008300'),
        token('--series-7', '#4a3aa7'),
        token('--series-8', '#e34948'),
      ],
      severity: {
        informational: token('--sev-informational', '#898781'),
        low: token('--sev-low', '#0ca30c'),
        medium: token('--sev-medium', '#fab219'),
        high: token('--sev-high', '#ec835a'),
        critical: token('--sev-critical', '#d03b3b'),
      },
      mode: resolved,
    }
  }, [resolved])
}
