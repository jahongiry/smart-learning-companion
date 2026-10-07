import { expect, it } from 'vitest'
import { recommendationLink } from './learningNavigation'

it('uses structured actions and difficulty instead of interpreting ambiguous prose', () => {
  const link = recommendationLink({
    subject: 'Physics', topic: 'Forces & motion', reason: 'Practice',
    suggestedAction: 'Read each question and explain your answer', actionType: 'quiz', difficulty: 'Medium',
  })
  expect(link.label).toBe('Practice this')
  expect(link.to).toBe('/quiz?subject=Science&topic=Forces+%26+motion&difficulty=Medium')
})
