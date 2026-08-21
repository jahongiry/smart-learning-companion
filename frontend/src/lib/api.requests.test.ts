import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loginUser, registerUser } from './api'

function jsonResponse(body: unknown, ok: boolean, status = ok ? 200 : 400): Response {
  return { ok, status, json: () => Promise.resolve(body) } as Response
}

describe('loginUser / registerUser', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
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
})
