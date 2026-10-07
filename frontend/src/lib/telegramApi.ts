import { ApiError, authorizedFetch } from './api'

export interface TelegramStatus {
  available: boolean
  connected: boolean
  bot_username: string | null
  username: string | null
  pending: { username: string; chat_id: string } | null
  daily_enabled: boolean
  timezone: string
  daily_time: string
  question_limit: number
}
export interface TelegramPreferences {
  daily_enabled: boolean
  timezone: string
  daily_time: string
}

async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await authorizedFetch(`/telegram/${path}`, {
    method, cache: 'no-store',
    ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
  })
  if (response.status === 204) return undefined as T
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new ApiError(typeof data?.detail === 'string' ? data.detail : 'Could not update Telegram. Please try again.', response.status)
  return data as T
}

export const getTelegramStatus = () => request<TelegramStatus>('status')
export const createTelegramLink = () => request<{ url: string; expires_in: number }>('link', 'POST')
export const confirmTelegram = (prefs: TelegramPreferences) => request<TelegramStatus>('confirm', 'POST', prefs)
export const saveTelegramPreferences = (prefs: TelegramPreferences) => request<TelegramStatus>('preferences', 'PATCH', prefs)
export const disconnectTelegram = () => request<void>('connection', 'DELETE')
