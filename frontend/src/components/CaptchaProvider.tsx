import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { registerChallengeHandler } from '../lib/captcha'
import { loadTurnstile } from '../lib/turnstile'

interface Challenge {
  siteKey: string
  action: string
  resolve: (token: string) => void
  reject: (error: Error) => void
}

function CaptchaDialog({ challenge, onFinish }: { challenge: Challenge; onFinish: (token?: string) => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const widgetRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])

  useEffect(() => {
    let disposed = false
    let removeWidget: (() => void) | undefined
    const timer = window.setTimeout(() => {
      if (!disposed) {
        disposed = true
        removeWidget?.()
        removeWidget = undefined
        setError('The security check timed out. Please retry.')
      }
    }, 120000)
    loadTurnstile().then((turnstile) => {
      if (disposed || !widgetRef.current) return
      const id = turnstile.render(widgetRef.current, {
        sitekey: challenge.siteKey,
        action: challenge.action,
        theme: 'dark',
        size: 'flexible',
        callback: (token) => { if (!disposed) onFinish(token) },
        'error-callback': () => { if (!disposed) setError('The security check failed. Please retry.') },
        'expired-callback': () => { if (!disposed) setError('The security check expired. Please retry.') },
        'timeout-callback': () => { if (!disposed) setError('The security check timed out. Please retry.') },
      })
      removeWidget = () => turnstile.remove(id)
    }).catch((err: unknown) => {
      if (!disposed) setError(err instanceof Error ? err.message : 'Could not load the security check.')
    })
    return () => {
      disposed = true
      window.clearTimeout(timer)
      removeWidget?.()
    }
  }, [challenge, attempt, onFinish])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="captcha-title"
      aria-describedby="captcha-description"
      onCancel={(event) => { event.preventDefault(); onFinish() }}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-6 text-white shadow-2xl backdrop:bg-slate-950/80"
    >
      <h2 id="captcha-title" className="text-lg font-semibold">Quick security check</h2>
      <p id="captcha-description" className="mb-5 mt-2 text-sm text-slate-300">
        Please verify you&apos;re human to continue.
      </p>
      <div ref={widgetRef} className="min-h-16" />
      {error && <p role="alert" className="mt-3 text-sm text-rose-300">{error}</p>}
      <div className="mt-5 flex justify-end gap-3">
        <button type="button" onClick={() => onFinish()} className="rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5">
          Cancel
        </button>
        {error && (
          <button type="button" onClick={() => { setError(''); setAttempt((value) => value + 1) }} className="rounded-lg bg-violet-500 px-3 py-2 text-sm font-medium text-white">
            Retry
          </button>
        )}
      </div>
    </dialog>
  )
}

export default function CaptchaProvider({ children }: { children: ReactNode }) {
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const pending = useRef<Challenge | null>(null)

  const finish = useCallback((token?: string) => {
    const current = pending.current
    pending.current = null
    setChallenge(null)
    if (token) current?.resolve(token)
    else current?.reject(new Error('Security check cancelled. Please try again when you are ready.'))
  }, [])

  useLayoutEffect(() => {
    const unregister = registerChallengeHandler((siteKey, action) => new Promise<string>((resolve, reject) => {
      if (pending.current) {
        reject(new Error('Please finish the current security check, then try again.'))
        return
      }
      const next = { siteKey, action, resolve, reject }
      pending.current = next
      setChallenge(next)
    }))
    return () => {
      unregister()
      pending.current?.reject(new Error('Security check cancelled. Please try again.'))
      pending.current = null
    }
  }, [])

  return <>{children}{challenge && <CaptchaDialog challenge={challenge} onFinish={finish} />}</>
}
