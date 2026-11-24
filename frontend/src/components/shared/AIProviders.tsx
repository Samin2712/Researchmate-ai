import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { KeyRound } from 'lucide-react'
import { api, errorMessage } from '../../services/api'

type Provider = 'gemini' | 'openai' | 'anthropic'
type State = {
  selected: 'default' | Provider
  available: boolean
  models: Record<Provider, string>
  connections: { provider: Provider; status: string; verified_at: string }[]
}
const names = { gemini: 'Google Gemini', openai: 'OpenAI', anthropic: 'Anthropic' }

export default function AIProviders() {
  const client = useQueryClient()
  const { data, isLoading, error: loadError } = useQuery({
    queryKey: ['ai-providers'],
    queryFn: async () => (await api.get<State>('/ai-providers')).data,
  })
  const [provider, setProvider] = useState<Provider>('gemini')
  // Secrets live only in component memory, never in query/mutation caches or storage.
  const [key, setKey] = useState('')
  const [receipt, setReceipt] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const saved = data?.connections.find((c) => c.provider === provider)

  async function act(action: 'verify' | 'save' | 'remove' | 'select', selected?: string) {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      if (action === 'verify') {
        setReceipt('')
        const result = (await api.post<{ status: string; message: string; verification_token?: string }>(
          '/ai-providers/verify', { provider, api_key: key.trim() },
        )).data
        if (result.status === 'verified') {
          setReceipt(result.verification_token || '')
          setMessage(result.message)
        } else setError(result.message)
      } else {
        const response = action === 'save'
          ? await api.put<State>('/ai-providers/connection', { provider, api_key: key.trim(), verification_token: receipt })
          : action === 'remove'
            ? await api.delete<State>(`/ai-providers/${provider}`)
            : await api.put<State>('/ai-providers/selection', { provider: selected })
        client.setQueryData(['ai-providers'], response.data)
        setKey('')
        setReceipt('')
        setMessage(action === 'save' ? 'Connection saved. Select it below to use it.'
          : action === 'remove' ? 'Connection removed. App default is used if this connection was selected.'
            : 'AI preference saved for chat and analysis.')
      }
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="settings-section ai-provider-settings">
      <h2><KeyRound size={20} /> AI providers <span className="muted text-sm">Optional</span></h2>
      <p className="muted mb-5">Use the app’s default AI, or connect your own key for chat and analysis.
        Personal usage is billed to your provider account. Embeddings continue to use the app configuration.</p>
      {isLoading && <p role="status">Loading connections…</p>}
      {loadError && <p className="error-message" role="alert">{errorMessage(loadError)}</p>}
      {data && <>
        <label className="setting-row" htmlFor="active-ai"><span><strong>AI for chat and analysis</strong>
          <small>App default uses the app’s credentials. A failed personal key never switches automatically.</small></span>
          <select id="active-ai" value={data.selected} disabled={busy} onChange={(e) => void act('select', e.target.value)}>
            <option value="default">App default</option>
            {data.connections.map((c) => <option key={c.provider} value={c.provider}>{names[c.provider]} · Personal</option>)}
          </select>
        </label>
        {!data.available && <p className="muted mb-4">Personal connections are not configured on this server. App default remains available.</p>}
        <div className="space-y-3 mt-4">
          <label className="setting-row" htmlFor="ai-provider"><span><strong>Provider</strong><small>Connect or manage a personal key.</small></span>
            <select id="ai-provider" value={provider} disabled={busy} onChange={(e) => {
              setProvider(e.target.value as Provider); setKey(''); setReceipt(''); setMessage(''); setError('')
            }}>
              {Object.entries(names).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
          </label>
          <p className="muted text-sm">Model: {data.models[provider]}</p>
          <p role="status">{saved ? `Connected · Last verified ${new Date(saved.verified_at).toLocaleString()}` : 'Not connected'}</p>
          <label className="block" htmlFor="ai-key">{saved ? 'Replacement API key' : 'API key'}</label>
          <input id="ai-key" className="w-full" type="password" value={key} disabled={busy || !data.available}
            autoComplete="off" spellCheck={false} autoCapitalize="none" placeholder={saved ? 'Enter a new key to replace the saved key' : 'Paste your provider API key'}
            onChange={(e) => { setKey(e.target.value); setReceipt(''); setMessage(''); setError('') }} />
          <p className="muted text-sm">Verification sends a minimal model request and may incur a small charge.
            Saved keys are encrypted on the server and are never shown again. Keys stay connected across logins and deployments.
            Removing the active connection restores App default.</p>
          <div className="flex flex-wrap gap-3">
            <button className="button secondary small" disabled={busy || !data.available || key.trim().length < 8}
              onClick={() => void act('verify')}>{busy ? 'Working…' : 'Verify connection'}</button>
            <button className="button primary small" disabled={busy || !receipt} onClick={() => void act('save')}>
              {saved ? 'Replace' : 'Save'}</button>
            {saved && <button className="button secondary small" disabled={busy} onClick={() => void act('remove')}>Remove</button>}
          </div>
        </div>
      </>}
      {message && <p className="success-message mt-4" role="status">{message}</p>}
      {error && <p className="error-message mt-4" role="alert">{error}</p>}
    </section>
  )
}
