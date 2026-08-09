import { describe, expect, it } from 'vitest'

import { formatBytes, formatDateTime, humanise, initials, parseTimestamp } from '../lib/format'

describe('formatBytes', () => {
  it('scales through the unit ladder', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(2048)).toBe('2.0 KB')
    expect(formatBytes(5 * 1024 ** 3)).toBe('5.0 GB')
  })
})

describe('parseTimestamp', () => {
  it('treats a naive backend timestamp as UTC', () => {
    const naive = parseTimestamp('2026-08-03T10:00:00')
    const explicit = parseTimestamp('2026-08-03T10:00:00Z')
    expect(naive.getTime()).toBe(explicit.getTime())
  })

  it('returns null for junk', () => {
    expect(parseTimestamp('')).toBeNull()
    expect(parseTimestamp('not-a-date')).toBeNull()
  })
})

describe('formatDateTime', () => {
  it('renders the stored UTC hour, so it agrees with the after-hours flag', () => {
    // 23:40 UTC is outside the 08:00-19:00 business window; the displayed hour
    // must not drift into business hours via the viewer's timezone.
    expect(formatDateTime('2026-08-03T23:40:00')).toContain('11:40')
    expect(formatDateTime('2026-08-03T10:00:00')).toContain('10:00')
  })

  it('returns a dash for a missing timestamp', () => {
    expect(formatDateTime(null)).toBe('—')
  })
})

describe('humanise', () => {
  it('turns enum names into prose', () => {
    expect(humanise('FILE_DOWNLOAD')).toBe('File Download')
    expect(humanise('LOGIN')).toBe('Login')
  })
})

describe('initials', () => {
  it('takes at most two initials', () => {
    expect(initials('Lakshmikanth M')).toBe('LM')
    expect(initials('Priya Ravi Raghavan')).toBe('PR')
    expect(initials('')).toBe('?')
  })
})
