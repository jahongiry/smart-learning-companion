import { ApiError, authorizedFetch } from './api'
import type { ProgressSummary } from '../types/progress'

interface ProgressSummaryResponseBody {
  total_quizzes: number
  average_score: number
  total_topics_explained: number
  by_subject: { subject: string; quizzes_taken: number; average_score: number; topics_explained: number }[]
  recent_activity: { type: 'quiz' | 'topic'; subject: string; topic: string; detail: string; created_at: string }[]
}

export async function getProgressSummary(): Promise<ProgressSummary> {
  const res = await authorizedFetch('/progress/summary')

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new ApiError(
      res.status === 401
        ? 'Your session has expired. Please log in again.'
        : (data?.detail ?? 'Failed to load your progress. Please try again.'),
      res.status,
    )
  }

  const body = data as ProgressSummaryResponseBody
  return {
    totalQuizzes: body.total_quizzes,
    averageScore: body.average_score,
    totalTopicsExplained: body.total_topics_explained,
    bySubject: body.by_subject.map((s) => ({
      subject: s.subject,
      quizzesTaken: s.quizzes_taken,
      averageScore: s.average_score,
      topicsExplained: s.topics_explained,
    })),
    recentActivity: body.recent_activity.map((a) => ({
      type: a.type,
      subject: a.subject,
      topic: a.topic,
      detail: a.detail,
      createdAt: a.created_at,
    })),
  }
}
