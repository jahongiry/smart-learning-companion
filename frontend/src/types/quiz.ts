export type QuizSubject = 'Mathematics' | 'Science'
export type QuizDifficulty = 'Easy' | 'Medium' | 'Hard'

export interface QuizConfig {
  subject: QuizSubject
  topic: string
  difficulty: QuizDifficulty
  questionCount: number
}

export interface QuizOption {
  id: string
  text: string
}

export interface QuizQuestion {
  id: string
  subject: QuizSubject
  topic: string
  difficulty: QuizDifficulty
  prompt: string
  options: QuizOption[]
  correctOptionId: string
  explanation: string
}

export interface QuizAnswer {
  questionId: string
  selectedOptionId: string | null
}

export interface QuizAnswerReview {
  question: QuizQuestion
  selectedOptionId: string | null
  isCorrect: boolean
}

export interface QuizResult {
  totalQuestions: number
  correctCount: number
  scorePercent: number
  answers: QuizAnswerReview[]
}
