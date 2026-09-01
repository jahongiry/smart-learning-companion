import { ApiError, authorizedFetch } from './api'
import type { ChatMessage } from '../types/tutor'

interface TutorChatResponseBody {
  reply: string
}

export async function sendTutorMessage(messages: ChatMessage[]): Promise<string> {
  const res = await authorizedFetch('/tutor/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
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

  return (data as TutorChatResponseBody).reply
}
