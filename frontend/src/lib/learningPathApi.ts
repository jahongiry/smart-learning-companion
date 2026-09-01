import { ApiError, authorizedFetch } from './api'
import type { LearningPath } from '../types/learningPath'

interface LearningPathResponseBody {
  summary: string
  recommendations: { subject: string; topic: string; reason: string; suggested_action: string }[]
}

export async function getLearningPath(focus?: string): Promise<LearningPath> {
  const query = focus?.trim() ? `?focus=${encodeURIComponent(focus.trim())}` : ''
  const res = await authorizedFetch(`/learning-path/generate${query}`)

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new ApiError(
      res.status === 401
        ? 'Your session has expired. Please log in again.'
        : (data?.detail ?? 'Failed to generate a learning path. Please try again.'),
      res.status,
    )
  }

  const body = data as LearningPathResponseBody
  return {
    summary: body.summary,
    recommendations: body.recommendations.map((r) => ({
      subject: r.subject,
      topic: r.topic,
      reason: r.reason,
      suggestedAction: r.suggested_action,
    })),
  }
}
