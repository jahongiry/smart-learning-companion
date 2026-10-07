interface TurnstileOptions {
  sitekey: string
  action: string
  theme: 'dark' | 'light'
  size: 'flexible'
  callback: (token: string) => void
  'error-callback': () => void
  'expired-callback': () => void
  'timeout-callback': () => void
}

export interface Turnstile {
  render: (container: HTMLElement, options: TurnstileOptions) => string
  remove: (id: string) => void
}

declare global {
  interface Window {
    turnstile?: Turnstile
  }
}

let scriptPromise: Promise<Turnstile> | null = null

export function loadTurnstile(): Promise<Turnstile> {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise<Turnstile>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    const timeout = window.setTimeout(failed, 15000)
    function failed() {
      window.clearTimeout(timeout)
      script.onload = null
      script.onerror = null
      script.remove()
      reject(new Error('Could not load the security check. Please retry or check your connection.'))
    }
    script.onload = () => {
      if (!window.turnstile) return failed()
      window.clearTimeout(timeout)
      resolve(window.turnstile)
    }
    script.onerror = failed
    document.head.appendChild(script)
  }).catch((error: unknown) => {
    scriptPromise = null
    throw error
  })
  return scriptPromise
}
