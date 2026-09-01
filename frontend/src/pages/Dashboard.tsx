import { ArrowRight, BrainCircuit, ListChecks, Route, TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getStoredUser } from '../lib/api'
import { getProgressSummary } from '../lib/progressApi'
import type { ProgressSummary } from '../types/progress'

const features = [
  {
    to: '/quiz',
    icon: ListChecks,
    title: 'Interactive Quizzes',
    description: 'Practice tests generated on demand, tuned to exactly what you need to work on.',
  },
  {
    to: '/topics',
    icon: BrainCircuit,
    title: 'Topic Explanations',
    description: 'Stuck on a concept? Get a clear, AI-generated explanation in seconds.',
  },
  {
    to: '/learning-path',
    icon: Route,
    title: 'Personalized Learning Path',
    description: 'A study plan generated from your own performance, telling you what to tackle next.',
  },
  {
    to: '/progress',
    icon: TrendingUp,
    title: 'Progress Tracking',
    description: 'See your scores and activity across every subject and topic over time.',
  },
]

export default function Dashboard() {
  const user = getStoredUser()
  const [summary, setSummary] = useState<ProgressSummary | null>(null)

  useEffect(() => {
    getProgressSummary()
      .then(setSummary)
      .catch(() => setSummary(null))
  }, [])

  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-16">
      <div className="mb-10">
        <h1 className="text-3xl font-semibold text-white">Welcome back{user ? `, ${user.name}` : ''}</h1>
        <p className="mt-2 text-slate-400">Pick up where you left off, or jump into something new.</p>
      </div>

      {summary && summary.totalQuizzes + summary.totalTopicsExplained > 0 && (
        <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
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
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {features.map(({ to, icon: Icon, title, description }) => (
          <Link
            key={to}
            to={to}
            className="group flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-left backdrop-blur transition hover:border-violet-400/30 hover:bg-white/[0.06]"
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-cyan-400/20 text-violet-300 transition group-hover:scale-105">
              <Icon className="h-5 w-5" strokeWidth={2} />
            </div>
            <h3 className="text-base font-semibold text-white">{title}</h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-400">{description}</p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-violet-300">
              Open
              <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
