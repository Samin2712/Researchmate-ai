import { ShieldCheck, UserRound, Sparkles } from 'lucide-react'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { useUser } from '../services/queries'
import { useAuth } from '../store/auth'
import { usePreferences } from '../store/preferences'
import { authService } from '../services/authService'
import { toast } from '../store/toasts'
import { Link } from 'react-router-dom'
import { errorMessage } from '../services/api'
import AIProviders from '../components/shared/AIProviders'

export default function Settings() {
  const { data: user } = useUser()
  const { reduceMotion, setReduceMotion, defaultExplanationMode, setDefaultExplanationMode } =
    usePreferences()
  const client = useQueryClient()

  const currentMode = user?.default_explanation_mode || defaultExplanationMode || 'standard'

  const updateMode = useMutation({
    mutationFn: async (mode: 'standard' | 'simple') => {
      if (user) {
        await authService.updateProfile({
          full_name: user.full_name || '',
          default_explanation_mode: mode,
        })
      }
    },
    onSuccess: (_, mode) => {
      setDefaultExplanationMode(mode)
      void client.invalidateQueries({ queryKey: ['user'] })
      toast('Default explanation style updated.')
    },
    onError: (error) => toast(errorMessage(error), 'error'),
  })
  return (
    <div className="page narrow-page">
      <header className="page-heading">
        <div>
          <h1>Your workspace, your way.</h1>
          <p>Account details and preferences for a focused research day.</p>
        </div>
      </header>
      <section className="settings-section">
        <h2>
          <UserRound size={20} />
          Your account
        </h2>
        <dl className="account-details">
          <div>
            <dt>Full name</dt>
            <dd>{user?.full_name || 'Not provided'}</dd>
          </div>
          <div>
            <dt>Email address</dt>
            <dd>{user?.email}</dd>
          </div>
          <div>
            <dt>Member since</dt>
            <dd>{user && new Date(user.created_at).toLocaleDateString()}</dd>
          </div>
        </dl>
        <Link className="button secondary small" to="/profile">Edit profile and photo</Link>
      </section>
      <section className="settings-section">
        <h2>
          <Sparkles size={20} />
          Explanation style preference
        </h2>
        <p className="text-sm text-slate-600 mb-4">
          Choose your preferred default style for AI research answers. You can always override this
          per question in the chat composer.
        </p>
        <div className="space-y-3">
          <label className="setting-row cursor-pointer" htmlFor="mode-standard">
            <span>
              <strong>Standard academic</strong>
              <small>
                Detailed academic explanations with full domain terminology and precision.
              </small>
            </span>
            <input
              id="mode-standard"
              name="explanation-mode"
              type="radio"
              checked={currentMode === 'standard'}
              disabled={updateMode.isPending || !user}
              onChange={() => updateMode.mutate('standard')}
            />
          </label>
          <label className="setting-row cursor-pointer" htmlFor="mode-simple">
            <span>
              <strong>Explain simply (beginner friendly)</strong>
              <small>
                Plain language, defined terms, and intuitive analogies, strictly preserving numerical
                results and citations.
              </small>
            </span>
            <input
              id="mode-simple"
              name="explanation-mode"
              type="radio"
              checked={currentMode === 'simple'}
              disabled={updateMode.isPending || !user}
              onChange={() => updateMode.mutate('simple')}
            />
          </label>
        </div>
      </section>
      {user && <AIProviders key={user.id} />}
      <section className="settings-section">
        <h2>Motion preferences</h2>
        <label className="setting-row" htmlFor="reduce-motion">
          <span>
            <strong>Reduce animations</strong>
            <small>
              Your operating system’s reduced-motion preference is always respected. You can also
              reduce animations just for this workspace.
            </small>
          </span>
          <input
            id="reduce-motion"
            type="checkbox"
            checked={reduceMotion}
            onChange={(event) => setReduceMotion(event.target.checked)}
          />
        </label>
        <p className="success-message" role="status">
          Preferences are saved on this device.
        </p>
      </section>
      <section className="settings-section">
        <h2>
          <ShieldCheck size={20} />
          Session
        </h2>
        <p className="muted mb-5">
          Your session is stored on this device. Sign out when you finish using a shared computer.
        </p>
        <button
          className="button secondary"
          onClick={() => {
            useAuth.getState().logout()
            client.clear()
          }}
        >
          Log out of ResearchMate
        </button>
      </section>
    </div>
  )
}
