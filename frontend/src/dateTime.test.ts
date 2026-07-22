import { describe, expect, it } from 'vitest'
import { formatDateTime, validTimeZone } from './dateTime'

describe('profile time-zone utilities', () => {
  it('rejects unsupported identifiers before suggesting them', () => {
    expect(validTimeZone('America/Vancouver')).toBe(true)
    expect(validTimeZone('Not/A_Zone')).toBe(false)
  })

  it('renders the daylight-saving jump in the persisted zone', () => {
    const before = formatDateTime('2026-03-08T09:30:00Z', 'America/Vancouver')
    const after = formatDateTime('2026-03-08T10:30:00Z', 'America/Vancouver')

    expect(before).toMatch(/1:30|01:30/)
    expect(after).toMatch(/3:30|03:30/)
  })

  it('renders one instant differently when a profile uses another zone', () => {
    const instant = '2026-07-20T16:00:00Z'
    expect(formatDateTime(instant, 'America/Vancouver')).not.toBe(formatDateTime(instant, 'Asia/Tokyo'))
  })
})
