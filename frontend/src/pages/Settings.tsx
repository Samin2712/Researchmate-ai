import { ShieldCheck, UserRound } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useUser } from '../services/queries'
import { useAuth } from '../store/auth'
import { usePreferences } from '../store/preferences'
import { Link } from 'react-router-dom'
export default function Settings() {
  const { data: user } = useUser()
  const { reduceMotion, setReduceMotion } = usePreferences()
  const client = useQueryClient()
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
