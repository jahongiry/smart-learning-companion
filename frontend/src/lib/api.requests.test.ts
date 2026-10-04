import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { authorizedFetch, loginUser, registerUser } from './api'
import { captchaHeaders } from './captcha'

vi.mock('./captcha', () => ({ captchaHeaders: vi.fn().mockResolvedValue({}) }))

function jsonResponse(body: unknown, ok: boolean, status = ok ? 200 : 400): Response {
  return { ok, status, json: () => Promise.resolve(body) } as Response
}

describe('loginUser / registerUser', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    vi.mocked(captchaHeaders).mockReset().mockResolvedValue({})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('posts credentials to /auth/login and returns the parsed response', async () => {
    const auth = {
      access_token: 't',
      token_type: 'bearer',
      user: { id: 1, name: 'A', email: 'a@b.com', created_at: 'x' },
    }
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(auth, true))

    const result = await loginUser('a@b.com', 'password123')

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/login'),
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'a@b.com', password: 'password123' }),
      }),
    )
    expect(result).toEqual(auth)
  })

  it('posts name/email/password to /auth/register', async () => {
    const auth = {
      access_token: 't',
      token_type: 'bearer',
      user: { id: 2, name: 'B', email: 'b@c.com', created_at: 'x' },
    }
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(auth, true))

    await registerUser('B', 'b@c.com', 'password123')

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/register'),
      expect.objectContaining({
        body: JSON.stringify({ name: 'B', email: 'b@c.com', password: 'password123' }),
      }),
    )
  })

  it('throws the server-provided detail message on a failed request', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ detail: 'Incorrect email or password' }, false, 401))

    await expect(loginUser('a@b.com', 'wrong')).rejects.toThrow('Incorrect email or password')
  })

  it('falls back to a generic message when the error response has no JSON body', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('not json')),
    } as unknown as Response)

    await expect(loginUser('a@b.com', 'wrong')).rejects.toThrow('Something went wrong. Please try again.')
  })

  it('attaches verification to authentication requests', async () => {
    vi.mocked(captchaHeaders).mockResolvedValue({ 'X-Turnstile-Token': 'verified' })
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({}, true))
    await loginUser('a@b.com', 'password123')
    expect(captchaHeaders).toHaveBeenCalledWith(expect.any(String), '/auth/login')
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/auth/login'), expect.objectContaining({
      headers: { 'Content-Type': 'application/json', 'X-Turnstile-Token': 'verified' },
    }))
  })

  it('does not send credentials or call a protected endpoint when verification fails', async () => {
    vi.mocked(captchaHeaders).mockRejectedValue(new Error('Security check failed'))
    await expect(loginUser('a@b.com', 'password123')).rejects.toThrow('Security check failed')
    await expect(authorizedFetch('/quiz/generate')).rejects.toThrow('Security check failed')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('preserves headers and authentication when attaching a CAPTCHA token', async () => {
    localStorage.setItem('slc_token', 'session-token')
    vi.mocked(captchaHeaders).mockResolvedValue({ 'X-Turnstile-Token': 'verified' })
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({}, true))
    try {
      await authorizedFetch('/tutor/chat', { method: 'POST', headers: new Headers({ 'Content-Type': 'application/json' }) })
      const headers = vi.mocked(fetch).mock.calls[0][1]?.headers as Headers
      expect(headers.get('Authorization')).toBe('Bearer session-token')
      expect(headers.get('Content-Type')).toBe('application/json')
      expect(headers.get('X-Turnstile-Token')).toBe('verified')
    } finally {
      localStorage.clear()
    }
  })
})
