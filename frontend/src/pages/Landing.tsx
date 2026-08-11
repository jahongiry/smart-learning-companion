import { ArrowRight, BrainCircuit, ListChecks, Route, Sparkles, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'

const features = [
  {
    icon: Route,
    title: 'Personalized Learning Paths',
    description: 'AI-generated study plans that adapt to your performance, pace, and goals in maths and science.',
  },
  {
    icon: ListChecks,
    title: 'Interactive Quizzes',
    description: 'Practice tests and quizzes generated on demand, tuned to exactly what you need to work on.',
  },
  {
    icon: BrainCircuit,
    title: 'Topic Explanations',
    description: 'Stuck on a concept? Get clear, AI-generated explanations and summaries in seconds.',
  },
  {
    icon: TrendingUp,
    title: 'Progress Tracking',
    description: 'Watch your mastery grow over time, with materials that adapt as you improve.',
  },
]

export default function Landing() {
  return (
    <>
      <section className="mx-auto flex max-w-4xl flex-col items-center px-6 pt-20 pb-16 text-center sm:pt-28">
        <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-4 py-1.5 text-sm font-medium text-violet-300">
          <Sparkles className="h-4 w-4" />
          Powered by Claude AI
        </span>

        <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-6xl">
          Study smarter with a{' '}
          <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-300 bg-clip-text text-transparent">
            learning companion
          </span>{' '}
          built for you
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-slate-400">
          Smart Learning Companion uses GenAI to build personalized maths &amp; science learning paths,
          generate quizzes, explain tricky topics, and track your progress &mdash; all in one place.
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            to="/register"
            className="group inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-violet-500/25 transition hover:opacity-90"
          >
            Get started free
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-slate-200 backdrop-blur transition hover:bg-white/10"
          >
            I already have an account
          </Link>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-24">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="group rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-left backdrop-blur transition hover:border-violet-400/30 hover:bg-white/[0.06]"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-cyan-400/20 text-violet-300 transition group-hover:scale-105">
                <Icon className="h-5 w-5" strokeWidth={2} />
              </div>
              <h3 className="text-base font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-4xl px-6 pb-28 text-center">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-violet-500/10 via-transparent to-cyan-400/10 p-10 sm:p-14">
          <h2 className="text-2xl font-semibold text-white sm:text-3xl">Ready to level up your study sessions?</h2>
          <p className="mx-auto mt-3 max-w-lg text-slate-400">
            Built for high school STEM students &mdash; create your free account and get your first
            personalized learning path in minutes.
          </p>
          <Link
            to="/register"
            className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-violet-500/25 transition hover:opacity-90"
          >
            Create your account
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  )
}
