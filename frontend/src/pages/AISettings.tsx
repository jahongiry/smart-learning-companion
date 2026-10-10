import { CheckCircle2, KeyRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

const providers = { anthropic: 'Anthropic (Claude)', openai: 'OpenAI' }
type Provider = keyof typeof providers
const fieldClass = 'mt-2 w-full rounded-xl border border-outline bg-field px-3 py-2.5 text-heading'

export default function AISettings() {
  const [provider, setProvider] = useState<Provider>('openai')
  const [connection, setConnection] = useState<string | null>(null)
  const [allowTelegram, setAllowTelegram] = useState(false)
  const [notice, setNotice] = useState('')

  function connect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setConnection(providers[provider])
    setNotice('Demo connection ready. No key was verified and no AI billing has changed.')
  }

  function disconnect() {
    setConnection(null)
    setAllowTelegram(false)
    setNotice('Demo connection removed.')
  }

  return <section className="mx-auto w-full max-w-3xl px-6 py-12">
    <Link to="/dashboard" className="text-sm text-accent">← Dashboard</Link>
    <div className="mb-6 mt-6 flex items-center gap-3">
      <KeyRound aria-hidden="true" className="h-8 w-8 text-accent" />
      <div><h1 className="text-2xl font-semibold text-heading">AI connections</h1>
        <p className="mt-1 text-muted">Your learning. Your choice of AI.</p></div>
    </div>
    <div className="mb-6 rounded-2xl border border-violet-300 bg-violet-50 p-5 text-violet-950 dark:border-violet-700 dark:bg-violet-950 dark:text-violet-100">
      <p className="font-semibold">Presentation demo</p>
      <p className="mt-1 text-sm">Explore the connection experience with a sample key. No credentials are sent or saved, and these controls do not change AI requests or billing. Demo settings reset when you leave this page.</p>
    </div>
    <div className="space-y-6 rounded-2xl border border-outline bg-panel p-6">
      <div className="flex items-start gap-3">
        {connection && <CheckCircle2 aria-hidden="true" className="mt-1 h-6 w-6 shrink-0 text-success" />}
        <div><h2 className="text-lg font-semibold text-heading">{connection ? `${connection} connected (demo)` : 'No demo connection yet'}</h2>
          <p className="mt-2 text-sm text-muted">{connection ? 'Preview a personal connection for quizzes, explanations, learning paths and the AI tutor.' : 'Try connecting a personal AI provider below.'}</p>
        </div>
      </div>
      <form onSubmit={connect} className="space-y-5 border-t border-outline pt-6">
        <h2 className="text-lg font-semibold text-heading">Connect an API provider</h2>
        <label className="block text-sm font-medium text-body">AI provider
          <select value={provider} onChange={(event) => setProvider(event.target.value as Provider)} className={fieldClass}>
            <option value="openai">OpenAI</option><option value="anthropic">Anthropic (Claude)</option>
          </select>
        </label>
        <label className="block text-sm font-medium text-body">Demo API key
          <input readOnly value="demo-key-for-presentation" className={fieldClass} aria-describedby="demo-key-help" />
        </label>
        <p id="demo-key-help" className="text-sm text-muted">This sample key is for the presentation only. API billing is separate from ChatGPT and Claude subscriptions.</p>
        <button className="rounded-xl bg-violet-600 px-4 py-2.5 font-medium text-white hover:bg-violet-700">Connect demo provider</button>
      </form>
      {connection && <div className="space-y-4 border-t border-outline pt-5">
        <label className="flex items-start gap-3 text-sm text-body">
          <input type="checkbox" className="mt-1" checked={allowTelegram} onChange={(event) => setAllowTelegram(event.target.checked)} />
          <span>Include Telegram learning (demo preference)</span>
        </label>
        <p className="text-sm text-muted">{allowTelegram ? 'Demo scope: website and Telegram tutor.' : 'Demo scope: website only.'}</p>
        <button onClick={disconnect} className="text-sm text-danger underline">Disconnect demo connection</button>
      </div>}
      {notice && <p role="status" className="text-sm text-success">{notice}</p>}
    </div>
    <div className="mt-6 rounded-2xl border border-outline bg-panel p-6">
      <h2 className="text-lg font-semibold text-heading">ChatGPT subscription</h2>
      <p className="mt-2 text-sm text-muted">Preview how connecting a ChatGPT account could look. Subscription access is not enabled in this app; a real connection requires a supported integration and applicable approval.</p>
      <button onClick={() => { setConnection('ChatGPT'); setNotice('ChatGPT connection preview only. No sign-in occurred and no subscription was connected.') }} className="mt-4 rounded-xl border border-outline px-4 py-2.5 font-medium text-heading hover:text-accent">Preview ChatGPT connection</button>
    </div>
  </section>
}
