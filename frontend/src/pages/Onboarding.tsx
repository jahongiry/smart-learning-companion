import { Sparkles } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError } from '../lib/api'
import { saveProfile } from '../lib/profileApi'
import type { Confidence, LearningGoal, UserProfileConfig } from '../types/profile'
import type { QuizSubject } from '../types/quiz'
import type { YearLevel } from '../types/topic'

const YEAR_LEVELS: YearLevel[] = ['Year 9', 'Year 10', 'Year 11', 'Year 12']
const SUBJECTS: QuizSubject[] = ['Mathematics', 'Science']
const GOALS: LearningGoal[] = [
  'Catch up on the basics',
  'Keep pace with class',
  'Get ahead / go deeper',
  'Prepare for an upcoming exam',
]
const CONFIDENCE_LEVELS: Confidence[] = ['Just starting out', 'Fairly confident', 'Very confident']

const selectClass =
  'w-full appearance-none rounded-xl border border-white/10 bg-slate-950/50 px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/20'

export default function Onboarding() {
  const navigate = useNavigate()
  const [yearLevel, setYearLevel] = useState<YearLevel>('Year 10')
  const [subjects, setSubjects] = useState<QuizSubject[]>(['Mathematics'])
  const [goal, setGoal] = useState<LearningGoal>('Keep pace with class')
  const [confidence, setConfidence] = useState<Confidence>('Fairly confident')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function toggleSubject(subject: QuizSubject) {
    setSubjects((prev) =>
      prev.includes(subject) ? prev.filter((s) => s !== subject) : [...prev, subject],
    )
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (subjects.length === 0) {
      setError('Pick at least one subject.')
      return
    }
    setError('')
    setIsSubmitting(true)
    try {
      const config: UserProfileConfig = { yearLevel, subjects, goal, confidence }
      await saveProfile(config)
      navigate('/dashboard')
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        navigate('/login', { state: { message: err.message } })
        return
      }
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 text-slate-950 shadow-lg shadow-violet-500/30">
            <Sparkles className="h-6 w-6" strokeWidth={2.5} />
          </span>
          <h1 className="mt-4 text-2xl font-semibold text-white">Tell us about yourself</h1>
          <p className="mt-1 text-sm text-slate-400">
            A few quick questions so we can recommend the right quizzes, topics and learning path for you.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur"
        >
          <div>
            <label htmlFor="yearLevel" className="mb-1.5 block text-sm font-medium text-slate-300">
              Year level
            </label>
            <select
              id="yearLevel"
              value={yearLevel}
              onChange={(e) => setYearLevel(e.target.value as YearLevel)}
              className={selectClass}
            >
              {YEAR_LEVELS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="mb-1.5 block text-sm font-medium text-slate-300">Subjects you care about</span>
            <div className="flex gap-3">
              {SUBJECTS.map((subject) => (
                <label
                  key={subject}
                  className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-medium transition ${
                    subjects.includes(subject)
                      ? 'border-violet-400/50 bg-violet-500/10 text-white'
                      : 'border-white/10 bg-slate-950/50 text-slate-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={subjects.includes(subject)}
                    onChange={() => toggleSubject(subject)}
                    className="sr-only"
                  />
                  {subject}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="goal" className="mb-1.5 block text-sm font-medium text-slate-300">
              What&apos;s your main goal right now?
            </label>
            <select
              id="goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value as LearningGoal)}
              className={selectClass}
            >
              {GOALS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="confidence" className="mb-1.5 block text-sm font-medium text-slate-300">
              How confident do you feel overall?
            </label>
            <select
              id="confidence"
              value={confidence}
              onChange={(e) => setConfidence(e.target.value as Confidence)}
              className={selectClass}
            >
              {CONFIDENCE_LEVELS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-sm text-rose-400">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-violet-500/25 transition hover:opacity-90 disabled:opacity-60"
          >
            {isSubmitting ? 'Saving…' : 'Save and continue'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="font-medium text-violet-300 hover:text-violet-200"
          >
            Skip for now
          </button>
        </p>
      </div>
    </section>
  )
}
