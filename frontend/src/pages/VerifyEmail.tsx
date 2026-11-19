import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Brand } from '../components/shared/Sidebar'
import { authService } from '../services/authService'
import { errorMessage } from '../services/api'

export default function VerifyEmail() {
  const location = useLocation()
  const [token, setToken] = useState(
    () => new URLSearchParams(location.hash.slice(1)).get('token') || '',
  )
  const [email, setEmail] = useState(() => new URLSearchParams(location.search).get('email') || '')
  const [busy, setBusy] = useState(false)
  const [verified, setVerified] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  useEffect(() => {
    const next = new URLSearchParams(location.hash.slice(1)).get('token')
    if (next) {
      setToken(next)
      setVerified(false)
      setError('')
      setMessage('')
    }
    // Remove email/secret from the address bar without retaining it in storage.
    window.history.replaceState(null, '', window.location.pathname)
  }, [location.hash])
  async function verify() {
    setBusy(true)
    setError('')
    try {
      const result = await authService.verifyEmail(token)
      setVerified(true)
      setToken('')
      setMessage(result.message)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }
  async function resend(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    try {
      setMessage((await authService.resendVerification(email.trim())).message)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }
  return (
    <main className="password-recovery-page">
      <div className="auth-form">
        <Brand />
        <h1>{verified ? 'Email verified' : 'Verify your email'}</h1>
        {!verified && (
          <p>
            {token
              ? 'Confirm your email address to finish creating your account.'
              : 'Open the verification link in your email before signing in. Check your spam folder too. You can request another link below.'}
          </p>
        )}
        {message && (
          <p className="notice" role="status">
            {message}
          </p>
        )}
        {error && (
          <p className="upload-error" role="alert">
            {error}
          </p>
        )}
        {token && !verified && (
          <div className="form-stack">
            <button className="button primary" disabled={busy} onClick={() => void verify()}>
              {busy ? 'Verifying…' : 'Verify email address'}
            </button>
          </div>
        )}
        {!verified && (!token || error) && (
          <form className="form-stack" onSubmit={(event) => void resend(event)}>
            <label>
              Email address
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                disabled={busy}
              />
            </label>
            <button className="button primary" disabled={busy}>
              {busy ? 'Please wait…' : 'Resend verification email'}
            </button>
          </form>
        )}
        <p className="auth-switch">
          <Link to="/login">Back to sign in</Link>
        </p>
      </div>
    </main>
  )
}
