import { BookOpen, Lightbulb, ListChecks, Sparkles } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError } from '../lib/api'
import { TOPICS_BY_SUBJECT } from '../lib/subjects'
import { explainTopic } from '../lib/topicApi'
import type { TopicExplanation, YearLevel } from '../types/topic'
import type { QuizSubject } from '../types/quiz'

const YEAR_LEVELS: YearLevel[] = ['Year 9', 'Year 10', 'Year 11', 'Year 12']

const selectClass =
  'w-full appearance-none rounded-xl border border-white/10 bg-slate-950/50 px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/20'

export default function TopicExplain() {
  const navigate = useNavigate()
  const [subject, setSubject] = useState<QuizSubject>('Mathematics')
  const [topic, setTopic] = useState(TOPICS_BY_SUBJECT.Mathematics[0])
  const [yearLevel, setYearLevel] = useState<YearLevel>('Year 10')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [explanation, setExplanation] = useState<TopicExplanation | null>(null)

  function handleSubjectChange(next: QuizSubject) {
    setSubject(next)
    setTopic(TOPICS_BY_SUBJECT[next][0])
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsLoading(true)
    setExplanation(null)
    try {
      const result = await explainTopic({ subject, topic, yearLevel })
      setExplanation(result)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        navigate('/login', { state: { message: err.message } })
        return
      }
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="flex flex-1 justify-center px-6 py-16">
      <div className="w-full max-w-2xl">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 text-slate-950 shadow-lg shadow-violet-500/30">
            <BookOpen className="h-6 w-6" strokeWidth={2.5} />
          </span>
          <h1 className="mt-4 text-2xl font-semibold text-white">Explain a topic</h1>
          <p className="mt-1 text-sm text-slate-400">Pick a subject and topic, and we&apos;ll break it down for you.</p>
        </div>

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
              {(Object.keys(TOPICS_BY_SUBJECT) as QuizSubject[]).map((s) => (
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

          {error && <p className="text-sm text-rose-400">{error}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-violet-500/25 transition hover:opacity-90 disabled:opacity-60"
          >
            <Sparkles className="h-4 w-4" />
            {isLoading ? 'Explaining…' : 'Explain this topic'}
          </button>
        </form>

        {explanation && (
          <div className="mt-6 space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
            <div>
              <h2 className="text-lg font-semibold text-white">
                {subject} &middot; {topic}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{explanation.summary}</p>
            </div>

            <div>
              <h3 className="flex items-center gap-2 text-sm font-medium text-violet-300">
                <ListChecks className="h-4 w-4" />
                Key points
              </h3>
              <ul className="mt-2 space-y-1.5 text-sm text-slate-300">
                {explanation.keyPoints.map((point, index) => (
                  <li key={index} className="flex gap-2">
                    <span className="text-violet-400">&bull;</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-medium text-violet-300">Example</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{explanation.example}</p>
            </div>

            <div className="flex items-start gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
              <p className="text-sm text-cyan-100">{explanation.practiceTip}</p>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
