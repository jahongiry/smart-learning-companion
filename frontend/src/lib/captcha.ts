const ACTIONS: Record<string, string> = {
  '/auth/login': 'login',
  '/auth/register': 'register',
  '/quiz/generate': 'quiz',
  '/topics/explain': 'explain',
  '/learning-path/generate': 'learning_path',
  '/tutor/chat': 'tutor',
}

type ChallengeHandler = (siteKey: string, action: string) => Promise<string>
let challengeHandler: ChallengeHandler | null = null

export function registerChallengeHandler(handler: ChallengeHandler): () => void {
  challengeHandler = handler
  return () => {
    if (challengeHandler === handler) challengeHandler = null
  }
}

export async function captchaHeaders(apiUrl: string, path: string): Promise<Record<string, string>> {
  const action = ACTIONS[path.split('?')[0]]
  if (!action) return {}

  let config: { enabled?: boolean; site_key?: string }
  try {
    const response = await fetch(`${apiUrl}/security/captcha`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    })
    if (!response.ok) throw new Error('Configuration unavailable')
    config = await response.json()
    if (!config || typeof config.enabled !== 'boolean') throw new Error('Invalid configuration')
  } catch {
    throw new Error('Could not load the security check. Please try again.')
  }

  if (config.enabled === false) return {}
  if (!config.site_key || !challengeHandler) {
    throw new Error('Security verification is unavailable. Please refresh and try again.')
  }
  // Tokens are never cached: Cloudflare consumes each token after one verification.
  const token = await challengeHandler(config.site_key, action)
  if (!token) throw new Error('Please complete the security check and try again.')
  return { 'X-Turnstile-Token': token }
}
