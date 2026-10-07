import type { LearningPathRecommendation } from '../types/learningPath'
import type { QuizDifficulty, QuizSubject } from '../types/quiz'

export function readLearningSelection(params: URLSearchParams): {
  subject?: QuizSubject
  topic?: string
  difficulty?: QuizDifficulty
} {
  const subject = params.get('subject')
  const difficulty = params.get('difficulty')
  return {
    subject: subject === 'Mathematics' || subject === 'Science' ? subject : undefined,
    topic: params.get('topic')?.trim() || undefined,
    difficulty: difficulty === 'Easy' || difficulty === 'Medium' || difficulty === 'Hard'
      ? difficulty : undefined,
  }
}

export function recommendationLink(rec: LearningPathRecommendation) {
  // Older servers provide only prose; prefer structured actions when available.
  const action = rec.actionType ?? (/\b(read|explanation|explain)\b/i.test(rec.suggestedAction) ? 'explanation' : 'quiz')
  const subject = /^(science|biology|chemistry|physics|earth science)$/i.test(rec.subject.trim())
    ? 'Science' : 'Mathematics'
  const params = new URLSearchParams({ subject, topic: rec.topic.trim() })
  if (action === 'quiz') {
    const legacyDifficulty = rec.suggestedAction.match(/\b(Easy|Medium|Hard)\b/i)?.[1]
    const difficulty = rec.difficulty ?? (legacyDifficulty
      ? legacyDifficulty[0].toUpperCase() + legacyDifficulty.slice(1).toLowerCase() : undefined)
    if (difficulty) params.set('difficulty', difficulty)
  }
  return {
    to: `${action === 'explanation' ? '/topics' : '/quiz'}?${params}`,
    label: action === 'explanation' ? 'Read explanation' : 'Practice this',
  }
}
