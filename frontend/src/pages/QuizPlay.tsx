import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import QuizQuestionCard from '../components/QuizQuestionCard'
import { scoreQuiz } from '../lib/quizApi'
import type { QuizAnswer, QuizQuestion } from '../types/quiz'

interface QuizPlayState {
  questions: QuizQuestion[]
}

export default function QuizPlay() {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as QuizPlayState | null

  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string | null>>({})

  if (!state?.questions?.length) {
    return <Navigate to="/quiz" replace />
  }

  const { questions } = state
  const currentQuestion = questions[currentIndex]
  const isFirst = currentIndex === 0
  const isLast = currentIndex === questions.length - 1

  function handleSelect(optionId: string) {
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: optionId }))
  }

  function handlePrevious() {
    setCurrentIndex((i) => Math.max(0, i - 1))
  }

  function handleNext() {
    if (!isLast) {
      setCurrentIndex((i) => i + 1)
      return
    }

    const quizAnswers: QuizAnswer[] = questions.map((q) => ({
      questionId: q.id,
      selectedOptionId: answers[q.id] ?? null,
    }))
    const result = scoreQuiz(questions, quizAnswers)
    navigate('/quiz/results', { state: { result } })
  }

  return (
    <section className="flex flex-1 items-center justify-center px-6 py-16">
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
      />
    </section>
  )
}
