import { ListChecks } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { TOPICS_BY_SUBJECT } from '../lib/quizApi'
import type { QuizConfig, QuizDifficulty, QuizSubject } from '../types/quiz'

const SUBJECTS: QuizSubject[] = ['Mathematics', 'Science']
const DIFFICULTIES: QuizDifficulty[] = ['Easy', 'Medium', 'Hard']
const QUESTION_COUNTS = [5, 10, 15]

const selectClass =
  'w-full appearance-none rounded-xl border border-white/10 bg-slate-950/50 px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/20'

interface QuizSetupFormProps {
  onGenerate: (config: QuizConfig) => void | Promise<void>
  isGenerating: boolean
  error: string
}

export default function QuizSetupForm({ onGenerate, isGenerating, error }: QuizSetupFormProps) {
  const [subject, setSubject] = useState<QuizSubject>('Mathematics')
  const [topic, setTopic] = useState(TOPICS_BY_SUBJECT.Mathematics[0])
  const [difficulty, setDifficulty] = useState<QuizDifficulty>('Medium')
  const [questionCount, setQuestionCount] = useState(5)

  function handleSubjectChange(next: QuizSubject) {
    setSubject(next)
    setTopic(TOPICS_BY_SUBJECT[next][0])
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void onGenerate({ subject, topic, difficulty, questionCount })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur"
    >
      <div>
        <label htmlFor="subject" className="mb-1.5 block text-sm font-medium text-slate-300">
          Subject
        </label>
        <select
          id="subject"
          value={subject}
          onChange={(e) => handleSubjectChange(e.target.value as QuizSubject)}
          className={selectClass}
        >
          {SUBJECTS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="topic" className="mb-1.5 block text-sm font-medium text-slate-300">
          Topic
        </label>
        <select id="topic" value={topic} onChange={(e) => setTopic(e.target.value)} className={selectClass}>
          {TOPICS_BY_SUBJECT[subject].map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="difficulty" className="mb-1.5 block text-sm font-medium text-slate-300">
          Difficulty
        </label>
        <select
          id="difficulty"
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value as QuizDifficulty)}
          className={selectClass}
        >
          {DIFFICULTIES.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="questionCount" className="mb-1.5 block text-sm font-medium text-slate-300">
          Number of questions
        </label>
        <select
          id="questionCount"
          value={questionCount}
          onChange={(e) => setQuestionCount(Number(e.target.value))}
          className={selectClass}
        >
          {QUESTION_COUNTS.map((count) => (
            <option key={count} value={count}>
              {count} questions
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-rose-400">{error}</p>}

      <button
        type="submit"
        disabled={isGenerating}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-violet-500/25 transition hover:opacity-90 disabled:opacity-60"
      >
        <ListChecks className="h-4 w-4" />
        {isGenerating ? 'Generating quiz…' : 'Generate quiz'}
      </button>
    </form>
  )
}
