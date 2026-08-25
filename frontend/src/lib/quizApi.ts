import { getToken } from './api'
import type { QuizAnswer, QuizConfig, QuizQuestion, QuizResult } from '../types/quiz'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'

export const TOPICS_BY_SUBJECT: Record<QuizConfig['subject'], string[]> = {
  Mathematics: ['Algebra', 'Geometry', 'Trigonometry', 'Statistics'],
  Science: ['Biology', 'Chemistry', 'Physics', 'Earth Science'],
}

class ApiError extends Error {}

interface QuizQuestionResponse {
  id: string
  subject: string
  topic: string
  difficulty: string
  prompt: string
  options: { id: string; text: string }[]
  correct_option_id: string
  explanation: string
}

function authHeaders(): HeadersInit {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function generateQuiz(config: QuizConfig): Promise<QuizQuestion[]> {
  const res = await fetch(`${API_URL}/quiz/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({
      subject: config.subject,
      topic: config.topic,
      difficulty: config.difficulty,
      question_count: config.questionCount,
    }),
  })

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new ApiError(data?.detail ?? 'Something went wrong generating the quiz. Please try again.')
  }

  return (data.questions as QuizQuestionResponse[]).map((q) => ({
    id: q.id,
    subject: q.subject as QuizConfig['subject'],
    topic: q.topic,
    difficulty: q.difficulty as QuizConfig['difficulty'],
    prompt: q.prompt,
    options: q.options,
    correctOptionId: q.correct_option_id,
    explanation: q.explanation,
  }))
}

export async function submitQuizAttempt(config: QuizConfig, result: QuizResult): Promise<void> {
  const res = await fetch(`${API_URL}/quiz/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({
      subject: config.subject,
      topic: config.topic,
      difficulty: config.difficulty,
      total_questions: result.totalQuestions,
      correct_count: result.correctCount,
    }),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new ApiError(data?.detail ?? 'Failed to save the quiz attempt.')
  }
}

export function scoreQuiz(questions: QuizQuestion[], answers: QuizAnswer[]): QuizResult {
  const answerByQuestionId = new Map(answers.map((a) => [a.questionId, a.selectedOptionId]))

  const reviewed = questions.map((question) => {
    const selectedOptionId = answerByQuestionId.get(question.id) ?? null
    return {
      question,
      selectedOptionId,
      isCorrect: selectedOptionId === question.correctOptionId,
    }
  })

  const correctCount = reviewed.filter((r) => r.isCorrect).length

  return {
    totalQuestions: questions.length,
    correctCount,
    scorePercent: Math.round((correctCount / questions.length) * 100),
    answers: reviewed,
  }
}
