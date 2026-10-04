import { ApiError, authorizedFetch } from './api'
import { TOPICS_BY_SUBJECT } from './subjects'
import type { QuizAnswer, QuizConfig, QuizQuestion, QuizResult } from '../types/quiz'

export { TOPICS_BY_SUBJECT }

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

export async function generateQuiz(config: QuizConfig): Promise<{ quizId: string; questions: QuizQuestion[] }> {
  const res = await authorizedFetch('/quiz/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subject: config.subject,
      topic: config.topic,
      difficulty: config.difficulty,
      question_count: config.questionCount,
    }),
  })

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new ApiError(
      res.status === 401
        ? 'Your session has expired. Please log in again.'
        : (data?.detail ?? 'Something went wrong generating the quiz. Please try again.'),
      res.status,
    )
  }

  return { quizId: data.quiz_id, questions: (data.questions as QuizQuestionResponse[]).map((q) => ({
    id: q.id,
    subject: q.subject as QuizConfig['subject'],
    topic: q.topic,
    difficulty: q.difficulty as QuizConfig['difficulty'],
    prompt: q.prompt,
    options: q.options,
    correctOptionId: q.correct_option_id,
    explanation: q.explanation,
  })) }
}

export async function submitQuizAttempt(quizId: string, result: QuizResult): Promise<{ score_percent: number; correct_count: number; total_questions: number }> {
  const res = await authorizedFetch('/quiz/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      quiz_id: quizId,
      answers: result.answers.map((answer) => ({ question_id: answer.question.id, selected_option_id: answer.selectedOptionId })),
    }),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new ApiError(
      res.status === 401 ? 'Your session has expired. Please log in again.' : (data?.detail ?? 'Failed to save the quiz attempt.'),
      res.status,
    )
  }
  return res.json()
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
