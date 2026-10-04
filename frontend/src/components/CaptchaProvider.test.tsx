import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StrictMode } from 'react'
import CaptchaProvider from './CaptchaProvider'
import { captchaHeaders } from '../lib/captcha'
import { loadTurnstile, type Turnstile } from '../lib/turnstile'

vi.mock('../lib/turnstile', () => ({ loadTurnstile: vi.fn() }))

const renderWidget = vi.fn<Turnstile['render']>()
const removeWidget = vi.fn()
const turnstile = { render: renderWidget, remove: removeWidget }

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ enabled: true, site_key: 'site-key' }) }))
  // jsdom does not implement native dialog methods.
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: function (this: HTMLDialogElement) { this.setAttribute('open', '') },
  })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: function (this: HTMLDialogElement) { this.removeAttribute('open') },
  })
  renderWidget.mockReturnValue('widget-id')
  vi.mocked(loadTurnstile).mockResolvedValue(turnstile)
})

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

async function startChallenge() {
  let result!: Promise<Record<string, string>>
  await act(async () => {
    result = captchaHeaders('/api', '/auth/login')
    // Attach immediately so testing a rejection never produces an unhandled promise.
    void result.catch(() => {})
  })
  await screen.findByRole('dialog', { name: 'Quick security check' })
  return { result }
}

describe('security verification dialog', () => {
  it('waits for the widget and removes it after success, including in StrictMode', async () => {
    render(<StrictMode><CaptchaProvider><p>Application</p></CaptchaProvider></StrictMode>)
    const { result } = await startChallenge()
    await waitFor(() => expect(renderWidget).toHaveBeenCalled())
    const options = renderWidget.mock.calls.at(-1)![1]
    expect(options.action).toBe('login')
    expect(options.sitekey).toBe('site-key')
    await act(async () => options.callback('one-use-token'))
    expect(await result).toEqual({ 'X-Turnstile-Token': 'one-use-token' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(removeWidget).toHaveBeenCalledWith('widget-id')
  })

  it('lets a visitor cancel without sending an operation', async () => {
    render(<CaptchaProvider><p>Application</p></CaptchaProvider>)
    const { result } = await startChallenge()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await expect(result).rejects.toThrow('cancelled')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(fetch).toHaveBeenCalledTimes(1) // Only public configuration was fetched.
  })

  it('supports retry when a browser blocks the script', async () => {
    vi.mocked(loadTurnstile).mockRejectedValueOnce(new Error('Could not load the security check.'))
    render(<CaptchaProvider><p>Application</p></CaptchaProvider>)
    const { result } = await startChallenge()
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load')
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    await waitFor(() => expect(renderWidget).toHaveBeenCalled())
    await act(async () => renderWidget.mock.calls.at(-1)![1].callback('retried-token'))
    expect(await result).toEqual({ 'X-Turnstile-Token': 'retried-token' })
  })

  it('handles expiry and Escape cancellation', async () => {
    render(<CaptchaProvider><p>Application</p></CaptchaProvider>)
    const { result } = await startChallenge()
    await waitFor(() => expect(renderWidget).toHaveBeenCalled())
    act(() => renderWidget.mock.calls.at(-1)![1]['expired-callback']())
    expect(screen.getByRole('alert')).toHaveTextContent('expired')
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { bubbles: false, cancelable: true }))
    await expect(result).rejects.toThrow('cancelled')
  })

  it('rejects pending work on unmount and ignores a late widget success', async () => {
    const view = render(<CaptchaProvider><p>Application</p></CaptchaProvider>)
    const { result } = await startChallenge()
    await waitFor(() => expect(renderWidget).toHaveBeenCalled())
    const callback = renderWidget.mock.calls.at(-1)![1].callback
    view.unmount()
    await expect(result).rejects.toThrow('cancelled')
    act(() => callback('late-token'))
    expect(removeWidget).toHaveBeenCalledWith('widget-id')
  })
})
