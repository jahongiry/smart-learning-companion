import { BookOpen, ListChecks, TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError } from '../lib/api'
import { getProgressSummary } from '../lib/progressApi'
import type { ProgressSummary as ProgressSummaryData } from '../types/progress'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function Progress() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [summary, setSummary] = useState<ProgressSummaryData | null>(null)

  useEffect(() => {
    let cancelled = false

    getProgressSummary()
      .then((result) => {
        if (!cancelled) setSummary(result)
      })
      .catch((err) => {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 401) {
          navigate('/login', { state: { message: err.message } })
          return
        }
        setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <section className="mx-auto w-full max-w-4xl px-6 py-16">
      <div className="mb-8 flex flex-col items-center text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 text-slate-950 shadow-lg shadow-violet-500/30">
          <TrendingUp className="h-6 w-6" strokeWidth={2.5} />
        </span>
        <h1 className="mt-4 text-2xl font-semibold text-heading">Your progress</h1>
        <p className="mt-1 text-sm text-muted">Track how your scores and activity are building up over time.</p>
      </div>

      {isLoading && (
        <div className="rounded-2xl border border-outline bg-panel p-10 text-center text-sm text-muted backdrop-blur">
          Loading your progress…
        </div>
      )}

      {!isLoading && error && (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-400/5 p-6 text-sm text-danger">{error}</div>
      )}

      {!isLoading && !error && summary && summary.totalQuizzes + summary.totalTopicsExplained === 0 && (
        <div className="rounded-2xl border border-outline bg-panel p-10 text-center text-sm text-muted backdrop-blur">
          No activity yet — take a quiz or explain a topic to start building your progress.
        </div>
      )}

      {!isLoading && !error && summary && summary.totalQuizzes + summary.totalTopicsExplained > 0 && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-outline bg-panel p-6 backdrop-blur">
              <p className="text-sm text-muted">Quizzes taken</p>
              <p className="mt-1 text-3xl font-semibold text-heading">{summary.totalQuizzes}</p>
            </div>
            <div className="rounded-2xl border border-outline bg-panel p-6 backdrop-blur">
              <p className="text-sm text-muted">Average score</p>
              <p className="mt-1 text-3xl font-semibold text-heading">{summary.averageScore}%</p>
            </div>
            <div className="rounded-2xl border border-outline bg-panel p-6 backdrop-blur">
              <p className="text-sm text-muted">Topics explored</p>
              <p className="mt-1 text-3xl font-semibold text-heading">{summary.totalTopicsExplained}</p>
            </div>
          </div>

          {summary.bySubject.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-medium text-body">By subject</h2>
              <div className="overflow-x-auto rounded-2xl border border-outline bg-panel backdrop-blur">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-outline text-muted">
                      <th className="px-5 py-3 font-medium">Subject</th>
                      <th className="px-5 py-3 font-medium">Quizzes taken</th>
                      <th className="px-5 py-3 font-medium">Average score</th>
                      <th className="px-5 py-3 font-medium">Topics explained</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.bySubject.map((s) => (
                      <tr key={s.subject} className="border-b border-divider last:border-0 text-body">
                        <td className="px-5 py-3 font-medium">{s.subject}</td>
                        <td className="px-5 py-3">{s.quizzesTaken}</td>
                        <td className="px-5 py-3">{s.averageScore}%</td>
                        <td className="px-5 py-3">{s.topicsExplained}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {summary.recentActivity.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-medium text-body">Recent activity</h2>
              <div className="space-y-2">
                {summary.recentActivity.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 rounded-xl border border-outline bg-panel px-4 py-3 backdrop-blur"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/20 to-cyan-400/20 text-accent">
                      {item.type === 'quiz' ? (
                        <ListChecks className="h-4 w-4" />
                      ) : (
                        <BookOpen className="h-4 w-4" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-heading">
                        {item.subject} &middot; {item.topic}
                      </p>
                      <p className="truncate text-xs text-muted">{item.detail}</p>
                    </div>
                    <p className="shrink-0 text-xs text-faint">{formatDate(item.createdAt)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
