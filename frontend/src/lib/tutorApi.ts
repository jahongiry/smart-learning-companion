import { ApiError, authorizedFetch } from './api'
import type { ChatMessage, MemorySource } from '../types/tutor'

interface TutorChatResponseBody {
  reply: string
  sources: MemorySource[]
}

export async function sendTutorMessage(message: string, requestId: string): Promise<TutorChatResponseBody> {
  const res = await authorizedFetch('/tutor/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, request_id: requestId }),
  })

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new ApiError(
      res.status === 401
        ? 'Your session has expired. Please log in again.'
        : (data?.detail ?? 'The tutor is unavailable right now. Please try again.'),
      res.status,
    )
  }

  return data as TutorChatResponseBody
}

export async function loadTutorHistory(): Promise<ChatMessage[]> {
  const res = await authorizedFetch('/tutor/history', { cache: 'no-store' })
  if (!res.ok) throw new ApiError('Could not load your saved conversations. Please try again.', res.status)
  return (await res.json()).messages
}

export async function clearTutorHistory(): Promise<void> {
  const res = await authorizedFetch('/tutor/history', { method: 'DELETE' })
  if (!res.ok) throw new ApiError('Could not clear your conversations. Please try again.', res.status)
}
