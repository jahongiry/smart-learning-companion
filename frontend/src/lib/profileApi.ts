import { ApiError, authorizedFetch } from './api'
import type { UserProfileConfig } from '../types/profile'

interface UserProfileResponseBody {
  year_level: string
  subjects: string[]
  goal: string
  confidence: string
}

function fromResponseBody(body: UserProfileResponseBody): UserProfileConfig {
  return {
    yearLevel: body.year_level as UserProfileConfig['yearLevel'],
    subjects: body.subjects as UserProfileConfig['subjects'],
    goal: body.goal as UserProfileConfig['goal'],
    confidence: body.confidence as UserProfileConfig['confidence'],
  }
}

export async function getProfile(): Promise<UserProfileConfig | null> {
  const res = await authorizedFetch('/profile/me')

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new ApiError(
      res.status === 401
        ? 'Your session has expired. Please log in again.'
        : (data?.detail ?? 'Failed to load your profile.'),
      res.status,
    )
  }

  return data ? fromResponseBody(data as UserProfileResponseBody) : null
}

export async function saveProfile(config: UserProfileConfig): Promise<UserProfileConfig> {
  const res = await authorizedFetch('/profile/me', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      year_level: config.yearLevel,
      subjects: config.subjects,
      goal: config.goal,
      confidence: config.confidence,
    }),
  })

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new ApiError(
      res.status === 401
        ? 'Your session has expired. Please log in again.'
        : (data?.detail ?? 'Failed to save your profile. Please try again.'),
      res.status,
    )
  }

  return fromResponseBody(data as UserProfileResponseBody)
}
