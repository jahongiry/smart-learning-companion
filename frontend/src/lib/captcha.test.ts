import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { captchaHeaders, registerChallengeHandler } from './captcha'

const apiUrl = 'https://api.example.com/api'
let unregister: (() => void) | undefined

beforeEach(() => { vi.stubGlobal('fetch', vi.fn()) })
afterEach(() => { unregister?.(); vi.unstubAllGlobals() })

function configuration(body: unknown, ok = true) {
  vi.mocked(fetch).mockResolvedValue({ ok, json: async () => body } as Response)
}

describe('CAPTCHA requests', () => {
  it('leaves progress reads and quiz score saves unaffected', async () => {
    expect(await captchaHeaders(apiUrl, '/progress/summary')).toEqual({})
    expect(await captchaHeaders(apiUrl, '/quiz/submit')).toEqual({})
    expect(fetch).not.toHaveBeenCalled()
  })

  it('only skips verification when the backend explicitly disables it', async () => {
    configuration({ enabled: false, site_key: null })
    expect(await captchaHeaders(apiUrl, '/auth/login')).toEqual({})
  })

  it.each([
    ['/auth/login', 'login'], ['/auth/register', 'register'], ['/quiz/generate', 'quiz'],
    ['/topics/explain', 'explain'], ['/learning-path/generate?focus=Algebra', 'learning_path'], ['/tutor/chat', 'tutor'],
  ])('requests a new token for %s with its expected action', async (path, action) => {
    configuration({ enabled: true, site_key: 'public-site-key' })
    const handler = vi.fn().mockResolvedValueOnce('first').mockResolvedValueOnce('second')
    unregister = registerChallengeHandler(handler)
    expect(await captchaHeaders(apiUrl, path)).toEqual({ 'X-Turnstile-Token': 'first' })
    expect(await captchaHeaders(apiUrl, path)).toEqual({ 'X-Turnstile-Token': 'second' })
    expect(handler).toHaveBeenCalledWith('public-site-key', action)
    expect(handler).toHaveBeenCalledTimes(2)
  })

  it.each([null, {}, { enabled: 'false' }])('fails closed for invalid configuration %j', async (body) => {
    configuration(body)
    await expect(captchaHeaders(apiUrl, '/auth/login')).rejects.toThrow('Could not load')
  })

  it('fails closed when the configuration endpoint is unavailable', async () => {
    configuration({}, false)
    await expect(captchaHeaders(apiUrl, '/auth/login')).rejects.toThrow('Could not load')
    vi.mocked(fetch).mockRejectedValue(new Error('Network failed'))
    await expect(captchaHeaders(apiUrl, '/auth/login')).rejects.toThrow('Could not load')
  })

  it('fails closed if the widget is unavailable or returns no token', async () => {
    configuration({ enabled: true, site_key: 'public-site-key' })
    await expect(captchaHeaders(apiUrl, '/auth/login')).rejects.toThrow('Security verification is unavailable')
    unregister = registerChallengeHandler(async () => '')
    await expect(captchaHeaders(apiUrl, '/auth/login')).rejects.toThrow('Please complete')
  })
})
