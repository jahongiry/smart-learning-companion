import { ApiError, authorizedFetch } from './api'
import type { TopicExplainConfig, TopicExplanation } from '../types/topic'

interface TopicExplainResponseBody {
  summary: string
  key_points: string[]
  example: string
  practice_tip: string
}

export async function explainTopic(config: TopicExplainConfig): Promise<TopicExplanation> {
  const res = await authorizedFetch('/topics/explain', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subject: config.subject,
      topic: config.topic,
      year_level: config.yearLevel,
    }),
  })

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new ApiError(
      res.status === 401
        ? 'Your session has expired. Please log in again.'
        : (data?.detail ?? 'Something went wrong generating the explanation. Please try again.'),
      res.status,
    )
  }

  const body = data as TopicExplainResponseBody
  return {
    summary: body.summary,
    keyPoints: body.key_points,
    example: body.example,
    practiceTip: body.practice_tip,
  }
}
