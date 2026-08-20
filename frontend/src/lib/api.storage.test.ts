import { beforeEach, describe, expect, it } from 'vitest'
import { getStoredUser, logout, storeAuth, type AuthResponse } from './api'

const sampleAuth: AuthResponse = {
  access_token: 'test-token',
  token_type: 'bearer',
  user: {
    id: 1,
    name: 'Jane Doe',
    email: 'jane@example.com',
    created_at: '2026-01-01T00:00:00Z',
  },
}

describe('auth storage helpers', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns null when nothing has been stored', () => {
    expect(getStoredUser()).toBeNull()
  })

  it('persists the token and user on storeAuth', () => {
    storeAuth(sampleAuth)
    expect(localStorage.getItem('slc_token')).toBe('test-token')
    expect(getStoredUser()).toEqual(sampleAuth.user)
  })

  it('clears the token and user on logout', () => {
    storeAuth(sampleAuth)
    logout()
    expect(localStorage.getItem('slc_token')).toBeNull()
    expect(getStoredUser()).toBeNull()
  })

  it('returns null instead of throwing when the stored user JSON is corrupted', () => {
    localStorage.setItem('slc_user', '{not valid json')
    expect(getStoredUser()).toBeNull()
  })
})
