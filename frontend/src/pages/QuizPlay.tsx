import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import QuizQuestionCard from '../components/QuizQuestionCard'
import { scoreQuiz, submitQuizAttempt } from '../lib/quizApi'
import type { QuizAnswer, QuizQuestion } from '../types/quiz'

interface QuizPlayState {
  questions: QuizQuestion[]
  quizId: string
}

export default function QuizPlay() {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as QuizPlayState | null

  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string | null>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  if (!state?.questions?.length || !state.quizId) {
    return <Navigate to="/quiz" replace />
  }

  const { questions, quizId } = state
  const currentQuestion = questions[currentIndex]
  const isFirst = currentIndex === 0
  const isLast = currentIndex === questions.length - 1

  function handleSelect(optionId: string) {
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: optionId }))
  }

  function handlePrevious() {
    setCurrentIndex((i) => Math.max(0, i - 1))
  }

  async function handleNext() {
    if (isSaving) return
    if (!isLast) {
      setCurrentIndex((i) => i + 1)
      return
    }

    const quizAnswers: QuizAnswer[] = questions.map((q) => ({
      questionId: q.id,
      selectedOptionId: answers[q.id] ?? null,
    }))
    const result = scoreQuiz(questions, quizAnswers)
    setIsSaving(true)
    setError('')
    try {
      const saved = await submitQuizAttempt(quizId, result)
      navigate('/quiz/results', { state: { result: { ...result, scorePercent: saved.score_percent,
        correctCount: saved.correct_count, totalQuestions: saved.total_questions } } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your answers. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16">
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <QuizQuestionCard
        question={currentQuestion}
        questionNumber={currentIndex + 1}
        totalQuestions={questions.length}
        selectedOptionId={answers[currentQuestion.id] ?? null}
        onSelect={handleSelect}
        onPrevious={handlePrevious}
        onNext={handleNext}
        isFirst={isFirst}
        isLast={isLast}
        isSaving={isSaving}
      />
    </section>
  )
}
