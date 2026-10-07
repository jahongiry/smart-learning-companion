import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react'
import type { QuizQuestion } from '../types/quiz'

interface QuizQuestionCardProps {
  question: QuizQuestion
  questionNumber: number
  totalQuestions: number
  selectedOptionId: string | null
  onSelect: (optionId: string) => void
  onPrevious: () => void
  onNext: () => void
  isFirst: boolean
  isLast: boolean
  isSaving?: boolean
}

export default function QuizQuestionCard({
  question,
  questionNumber,
  totalQuestions,
  selectedOptionId,
  onSelect,
  onPrevious,
  onNext,
  isFirst,
  isLast,
  isSaving = false,
}: QuizQuestionCardProps) {
  const progress = (questionNumber / totalQuestions) * 100

  return (
    <div className="w-full max-w-2xl rounded-2xl border border-outline bg-panel p-8 backdrop-blur">
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-sm text-muted">
          <span>
            Question {questionNumber} of {totalQuestions}
          </span>
          <span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-2.5 py-0.5 text-xs font-medium text-accent">
            {question.difficulty}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-subtle">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <h2 className="mb-6 text-lg font-semibold leading-relaxed text-heading">{question.prompt}</h2>

      <div className="space-y-3">
        {question.options.map((option) => {
          const isSelected = option.id === selectedOptionId
          return (
            <button
              key={option.id}
              type="button"
              disabled={isSaving}
              onClick={() => onSelect(option.id)}
              className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition ${
                isSelected
                  ? 'border-violet-400/60 bg-violet-500/10 text-heading'
                  : 'border-outline bg-field text-body hover:border-strong hover:bg-subtle'
              }`}
            >
              {option.text}
              {isSelected && <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" />}
            </button>
          )
        })}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <button
          type="button"
          onClick={onPrevious}
          disabled={isFirst || isSaving}
          className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-body transition hover:text-heading disabled:opacity-40 disabled:hover:text-body"
        >
          <ArrowLeft className="h-4 w-4" />
          Previous
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!selectedOptionId || isSaving}
          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-violet-500/25 transition hover:opacity-90 disabled:opacity-40"
        >
          {isSaving ? 'Saving answers…' : isLast ? 'Submit quiz' : 'Next'}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
