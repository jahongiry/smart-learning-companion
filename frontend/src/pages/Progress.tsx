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
        <h1 className="mt-4 text-2xl font-semibold text-white">Your progress</h1>
        <p className="mt-1 text-sm text-slate-400">Track how your scores and activity are building up over time.</p>
      </div>

      {isLoading && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center text-sm text-slate-400 backdrop-blur">
          Loading your progress…
        </div>
      )}

      {!isLoading && error && (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-400/5 p-6 text-sm text-rose-300">{error}</div>
      )}

      {!isLoading && !error && summary && summary.totalQuizzes + summary.totalTopicsExplained === 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center text-sm text-slate-400 backdrop-blur">
          No activity yet — take a quiz or explain a topic to start building your progress.
        </div>
      )}

      {!isLoading && !error && summary && summary.totalQuizzes + summary.totalTopicsExplained > 0 && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
              <p className="text-sm text-slate-400">Quizzes taken</p>
              <p className="mt-1 text-3xl font-semibold text-white">{summary.totalQuizzes}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
              <p className="text-sm text-slate-400">Average score</p>
              <p className="mt-1 text-3xl font-semibold text-white">{summary.averageScore}%</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
              <p className="text-sm text-slate-400">Topics explored</p>
              <p className="mt-1 text-3xl font-semibold text-white">{summary.totalTopicsExplained}</p>
            </div>
          </div>

          {summary.bySubject.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-medium text-slate-300">By subject</h2>
              <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400">
                      <th className="px-5 py-3 font-medium">Subject</th>
                      <th className="px-5 py-3 font-medium">Quizzes taken</th>
                      <th className="px-5 py-3 font-medium">Average score</th>
                      <th className="px-5 py-3 font-medium">Topics explained</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.bySubject.map((s) => (
                      <tr key={s.subject} className="border-b border-white/5 last:border-0 text-slate-200">
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
              <h2 className="mb-3 text-sm font-medium text-slate-300">Recent activity</h2>
              <div className="space-y-2">
                {summary.recentActivity.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 backdrop-blur"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/20 to-cyan-400/20 text-violet-300">
                      {item.type === 'quiz' ? (
                        <ListChecks className="h-4 w-4" />
                      ) : (
                        <BookOpen className="h-4 w-4" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">
                        {item.subject} &middot; {item.topic}
                      </p>
                      <p className="truncate text-xs text-slate-400">{item.detail}</p>
                    </div>
                    <p className="shrink-0 text-xs text-slate-500">{formatDate(item.createdAt)}</p>
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
