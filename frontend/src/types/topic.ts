import type { QuizSubject } from './quiz'

export type YearLevel = 'Year 9' | 'Year 10' | 'Year 11' | 'Year 12'

export interface TopicExplainConfig {
  subject: QuizSubject
  topic: string
  yearLevel: YearLevel
}

export interface TopicExplanation {
  summary: string
  keyPoints: string[]
  example: string
  practiceTip: string
}
