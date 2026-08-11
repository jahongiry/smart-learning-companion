import { GraduationCap } from 'lucide-react'
import { Link, Outlet, useLocation } from 'react-router-dom'

export default function Layout() {
  const { pathname } = useLocation()
  const isAuthPage = pathname === '/login' || pathname === '/register'

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-slate-950">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-[-10%] -z-10 h-[600px] bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(124,58,237,0.35),transparent)]"
      />

      <header className="sticky top-0 z-50 border-b border-white/5 bg-slate-950/70 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2 font-display text-lg font-semibold text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 text-slate-950 shadow-lg shadow-violet-500/30">
              <GraduationCap className="h-5 w-5" strokeWidth={2.5} />
            </span>
            Smart Learning Companion
          </Link>

          {!isAuthPage && (
            <nav className="flex items-center gap-3">
              <Link
                to="/login"
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 transition hover:text-white"
              >
                Log in
              </Link>
              <Link
                to="/register"
                className="rounded-lg bg-gradient-to-r from-violet-500 to-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-violet-500/20 transition hover:opacity-90"
              >
                Get started
              </Link>
            </nav>
          )}
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        <Outlet />
      </main>

      <footer className="border-t border-white/5 py-8 text-center text-sm text-slate-500">
        Smart Learning Companion &middot; COIT20273 Capstone Project &middot; {new Date().getFullYear()}
      </footer>
    </div>
  )
}
