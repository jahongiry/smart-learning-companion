import { ArrowRight, Route, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError } from '../lib/api'
import { getLearningPath } from '../lib/learningPathApi'
import type { LearningPath as LearningPathData } from '../types/learningPath'

export default function LearningPath() {
  const navigate = useNavigate()
  const [focus, setFocus] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [path, setPath] = useState<LearningPathData | null>(null)
  const requestId = useRef(0)

  function loadPath(focusValue?: string) {
    const thisRequest = ++requestId.current
    setIsLoading(true)
    setError('')

    getLearningPath(focusValue)
      .then((result) => {
        if (requestId.current === thisRequest) setPath(result)
      })
      .catch((err) => {
        if (requestId.current !== thisRequest) return
        if (err instanceof ApiError && err.status === 401) {
          navigate('/login', { state: { message: err.message } })
          return
        }
        setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      })
      .finally(() => {
        if (requestId.current === thisRequest) setIsLoading(false)
      })
  }

  useEffect(() => {
    loadPath()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    loadPath(focus)
  }

  return (
    <section className="flex flex-1 justify-center px-6 py-16">
      <div className="w-full max-w-2xl">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 text-slate-950 shadow-lg shadow-violet-500/30">
            <Route className="h-6 w-6" strokeWidth={2.5} />
          </span>
          <h1 className="mt-4 text-2xl font-semibold text-white">Your learning path</h1>
          <p className="mt-1 text-sm text-slate-400">
            Personalized recommendations based on your quiz history and topics you&apos;ve explored.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mb-6 flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
            placeholder="Want to focus on something specific? e.g. Trigonometry"
            className="flex-1 rounded-xl border border-white/10 bg-slate-950/50 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/20"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/10 disabled:opacity-60"
          >
            {isLoading ? 'Generating…' : 'Update path'}
          </button>
        </form>

        {isLoading && (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-sm text-slate-400 backdrop-blur">
            <Sparkles className="h-4 w-4 animate-pulse text-violet-300" />
            Generating your learning path…
          </div>
        )}

        {!isLoading && error && (
          <div className="rounded-2xl border border-rose-400/20 bg-rose-400/5 p-6 text-sm text-rose-300">{error}</div>
        )}

        {!isLoading && !error && path && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
              <p className="text-sm leading-relaxed text-slate-300">{path.summary}</p>
            </div>

            {path.recommendations.map((rec, index) => (
              <div
                key={index}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur"
              >
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-violet-300">
                  {rec.subject}
                </div>
                <h3 className="mt-1 text-base font-semibold text-white">{rec.topic}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{rec.reason}</p>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-medium text-cyan-300">{rec.suggestedAction}</p>
                  <Link
                    to="/quiz"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-slate-200 transition hover:bg-white/10"
                  >
                    Practice this
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
