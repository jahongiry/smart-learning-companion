import { GraduationCap, LogOut } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { getStoredUser, logout, type AuthUser } from '../lib/api'
import TutorChat from './TutorChat'
import ThemeToggle from './ThemeToggle'

export default function Layout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const isAuthPage = pathname === '/login' || pathname === '/register'
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser())

  useEffect(() => {
    setUser(getStoredUser())
  }, [pathname])

  function handleLogout() {
    logout()
    setUser(null)
    navigate('/')
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-canvas">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-[-10%] -z-10 h-[600px] bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(124,58,237,0.35),transparent)]"
      />

      <header className="sticky top-0 z-50 border-b border-divider bg-canvas/70 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2 font-display text-lg font-semibold text-heading">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 text-slate-950 shadow-lg shadow-violet-500/30">
              <GraduationCap className="h-5 w-5" strokeWidth={2.5} />
            </span>
            <span className="text-sm sm:text-lg">Smart Learning Companion</span>
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <ThemeToggle />
            {!isAuthPage && (
              <nav className="flex flex-wrap items-center gap-1 sm:gap-3">
                {user ? (
                  <>
                    <Link
                      to="/dashboard"
                      className="rounded-lg px-3 py-2 text-sm font-medium text-body transition hover:text-heading"
                    >
                      Dashboard
                    </Link>
                    <Link
                      to="/quiz"
                      className="rounded-lg px-3 py-2 text-sm font-medium text-body transition hover:text-heading"
                    >
                      Quiz
                    </Link>
                    <Link
                      to="/topics"
                      className="rounded-lg px-3 py-2 text-sm font-medium text-body transition hover:text-heading"
                    >
                      Explain
                    </Link>
                    <Link
                      to="/learning-path"
                      className="rounded-lg px-3 py-2 text-sm font-medium text-body transition hover:text-heading"
                    >
                      Path
                    </Link>
                    <Link
                      to="/progress"
                      className="rounded-lg px-3 py-2 text-sm font-medium text-body transition hover:text-heading"
                    >
                      Progress
                    </Link>
                    <span className="hidden text-sm text-body lg:inline">
                      Signed in as <span className="font-medium text-heading">{user.name}</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-body transition hover:text-heading"
                    >
                      <LogOut className="h-4 w-4" />
                      Log out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      className="rounded-lg px-4 py-2 text-sm font-medium text-body transition hover:text-heading"
                    >
                      Log in
                    </Link>
                    <Link
                      to="/register"
                      className="rounded-lg bg-gradient-to-r from-violet-500 to-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-violet-500/20 transition hover:opacity-90"
                    >
                      Get started
                    </Link>
                  </>
                )}
              </nav>
            )}
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        <Outlet />
      </main>

      <footer className="border-t border-divider py-8 text-center text-sm text-faint">
        Smart Learning Companion &middot; COIT20273 Capstone Project &middot; {new Date().getFullYear()}
      </footer>

      {!isAuthPage && user && <TutorChat key={user.id} />}
    </div>
  )
}
