import { beforeEach, describe, expect, it } from 'vitest'

import { tokenStore } from '../api/client'

describe('tokenStore', () => {
  beforeEach(() => {
    tokenStore.clear()
  })

  it('keeps the access token out of localStorage', () => {
    tokenStore.set({ access_token: 'access-abc', refresh_token: 'refresh-xyz' })

    expect(tokenStore.access).toBe('access-abc')
    expect(tokenStore.refresh).toBe('refresh-xyz')
    expect(JSON.stringify(localStorage)).not.toContain('access-abc')
  })

  it('keeps the existing refresh token when only an access token is returned', () => {
    tokenStore.set({ access_token: 'access-1', refresh_token: 'refresh-1' })
    tokenStore.set({ access_token: 'access-2' })

    expect(tokenStore.access).toBe('access-2')
    expect(tokenStore.refresh).toBe('refresh-1')
  })

  it('clears both tokens on logout', () => {
    tokenStore.set({ access_token: 'access-1', refresh_token: 'refresh-1' })
    tokenStore.clear()

    expect(tokenStore.access).toBeNull()
    expect(tokenStore.refresh).toBeNull()
  })
})
