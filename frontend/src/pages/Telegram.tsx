import { Send } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError } from '../lib/api'
import { confirmTelegram, createTelegramLink, disconnectTelegram, getTelegramStatus, saveTelegramPreferences,
  type TelegramPreferences, type TelegramStatus } from '../lib/telegramApi'

const fieldClass = 'w-full rounded-xl border border-outline bg-field px-3 py-2 text-heading'

export default function Telegram() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<TelegramStatus | null>(null)
  const [prefs, setPrefs] = useState<TelegramPreferences>({ daily_enabled: false, timezone: 'Australia/Sydney', daily_time: '18:00' })
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  function showError(err: unknown) {
    if (err instanceof ApiError && err.status === 401) {
      navigate('/login')
      return
    }
    setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
  }

  useEffect(() => {
    let active = true
    getTelegramStatus().then((value) => {
      if (!active) return
      setStatus(value)
      setPrefs({ daily_enabled: value.daily_enabled, timezone: value.timezone, daily_time: value.daily_time })
    }).catch((err) => { if (active) showError(err) })
    return () => { active = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // A user returns from Telegram to approve the actual account before sharing learning data.
  useEffect(() => {
    if (!url || status?.connected) return
    let active = true
    const check = () => {
      if (document.visibilityState === 'hidden') return
      getTelegramStatus().then((value) => { if (active) setStatus(value) }).catch(() => {})
    }
    const timer = window.setInterval(check, 5000)
    window.addEventListener('focus', check)
    return () => { active = false; window.clearInterval(timer); window.removeEventListener('focus', check) }
  }, [url, status?.connected])

  async function act(operation: () => Promise<void>) {
    setBusy(true); setError(''); setNotice('')
    try { await operation() } catch (err) { showError(err) } finally { setBusy(false) }
  }

  return <section className="mx-auto w-full max-w-2xl px-6 py-12">
    <Link to="/dashboard" className="text-sm text-accent">← Dashboard</Link>
    <div className="mb-8 mt-6 flex items-center gap-3">
      <Send aria-hidden="true" className="h-8 w-8 text-accent" />
      <div><h1 className="text-2xl font-semibold text-heading">Learn on Telegram</h1>
        <p className="mt-1 text-muted">Your tutor and a little daily practice, wherever you are.</p></div>
    </div>
    <div className="space-y-5 rounded-2xl border border-outline bg-panel p-6">
      <p className="text-body">Ask maths and science questions using your learning history. Opt in to five daily quiz questions and one new fact based on what you’ve been studying.</p>
      {!status && !error && <p role="status" className="text-muted">Loading Telegram settings…</p>}
      {status && !status.available && <p role="status" className="text-muted">Telegram is not available yet. You can keep using the tutor on the website.</p>}
      {status?.available && <>
        <p className="text-sm text-muted">When connected, your questions, answers and personalised lessons are sent through Telegram and our AI tutor. Chat history and completed quiz scores are saved to your website account. You can disconnect at any time.</p>
        {!status.connected && !status.pending && <>
          <button disabled={busy} onClick={() => act(async () => {
            const link = await createTelegramLink(); setUrl(link.url)
          })} className="rounded-xl bg-violet-600 px-4 py-2 font-medium text-white disabled:opacity-50">
            {busy ? 'Creating link…' : url ? 'Create a new connection link' : 'Connect Telegram'}
          </button>
          {url && <div className="space-y-3 rounded-xl bg-subtle p-4">
            <a href={url} target="_blank" rel="noopener noreferrer" className="font-medium text-accent underline">Open Telegram and press Start</a>
            <p className="text-sm text-body">Then return here to confirm your account. The link expires in 10 minutes. If confirmation does not appear, select Check connection.</p>
            <button disabled={busy} onClick={() => act(async () => { setStatus(await getTelegramStatus()) })} className="text-sm text-accent underline">Check connection</button>
          </div>}
        </>}
        {(status.connected || status.pending) && <form className="space-y-5" onSubmit={(event) => {
          event.preventDefault()
          void act(async () => {
            const result = status.connected ? await saveTelegramPreferences(prefs) : await confirmTelegram(prefs)
            setStatus(result); setUrl(''); setNotice(status.connected ? 'Preferences saved.' : 'Telegram connected. You can now send the bot a question.')
          })
        }}>
          <div className="rounded-xl bg-subtle p-4 text-body">
            {status.connected ? <>Connected to <strong>{status.username}</strong>.</> : <>
              Confirm this is your Telegram account: <strong>{status.pending?.username}</strong>
              <p className="mt-1 text-sm text-muted">Telegram ID: {status.pending?.chat_id}</p>
            </>}
          </div>
          <label className="flex items-start gap-3 text-body">
            <input type="checkbox" checked={prefs.daily_enabled} onChange={(e) => setPrefs({ ...prefs, daily_enabled: e.target.checked })} className="mt-1" />
            <span>Send me five quiz questions and one new fact each day.</span>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm text-body"><span>Daily delivery time</span>
              <input type="time" required value={prefs.daily_time} onChange={(e) => setPrefs({ ...prefs, daily_time: e.target.value })} className={fieldClass} />
            </label>
            <label className="space-y-2 text-sm text-body"><span>Timezone</span>
              <input required list="telegram-timezones" value={prefs.timezone} onChange={(e) => setPrefs({ ...prefs, timezone: e.target.value })} className={fieldClass} />
              <datalist id="telegram-timezones">{['Australia/Sydney', 'Asia/Tashkent', 'Asia/Kolkata', 'Europe/London', 'America/New_York', 'UTC'].map((z) => <option key={z} value={z} />)}</datalist>
            </label>
          </div>
          <p className="text-xs text-muted">Delivery starts after your chosen time, when the scheduler runs. Notifications depend on your Telegram settings. Tutor limit: {status.question_limit} questions per day, resetting at midnight UTC.</p>
          <button disabled={busy} className="rounded-xl bg-violet-600 px-4 py-2 font-medium text-white disabled:opacity-50">{busy ? 'Saving…' : status.connected ? 'Save preferences' : 'Confirm my Telegram account'}</button>
        </form>}
        {(status.connected || status.pending || url) && <button disabled={busy} onClick={() => act(async () => {
          await disconnectTelegram(); setUrl(''); setStatus(await getTelegramStatus()); setNotice('Telegram disconnected. Daily messages are off.')
        })} className="text-sm text-danger underline">{status.connected ? 'Disconnect Telegram' : 'Cancel connection'}</button>}
        {status.connected && <p className="text-sm text-body">Open <a className="text-accent underline" href={`https://t.me/${status.bot_username}`} target="_blank" rel="noopener noreferrer">@{status.bot_username}</a> to ask a question. Send /stop to pause daily messages, /resume to restart, or /disconnect to unlink.</p>}
      </>}
      {notice && <p role="status" className="text-success">{notice}</p>}
      {error && <p role="alert" className="text-danger">{error}</p>}
    </div>
  </section>
}
