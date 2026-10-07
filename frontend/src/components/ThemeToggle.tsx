import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'

type Theme = 'dark' | 'light'
const storageKey = 'slc-theme'

function readTheme(): Theme {
  try {
    return localStorage.getItem(storageKey) === 'light' ? 'light' : 'dark'
  } catch {
    return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
  }
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(readTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    const syncTheme = (event: StorageEvent) => {
      if (event.key === storageKey || event.key === null) setTheme(readTheme())
    }
    window.addEventListener('storage', syncTheme)
    return () => window.removeEventListener('storage', syncTheme)
  }, [])

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    try {
      localStorage.setItem(storageKey, next)
    } catch {
      // Switching still works when browser storage is unavailable.
    }
  }

  const label = `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`
  const Icon = theme === 'dark' ? Sun : Moon

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-outline bg-panel text-body transition hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
    >
      <Icon aria-hidden="true" className="h-5 w-5" />
    </button>
  )
}
