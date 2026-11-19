import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Brand } from '../components/shared/Sidebar'
import { authService } from '../services/authService'
import { errorMessage } from '../services/api'

function passwordError(password: string, confirm: string) {
  if (password !== confirm) return 'The passwords do not match.'
  if (new TextEncoder().encode(password).length > 72)
    return 'Use a password of 72 UTF-8 bytes or fewer.'
  return ''
}

export default function PasswordRecovery({ reset = false }: { reset?: boolean }) {
  const location = useLocation()
  // Fragment keeps the secret out of HTTP access logs and Referer headers.
  const [token, setToken] = useState(() => {
    const value = new URLSearchParams(window.location.hash.slice(1)).get('token') || ''
    return value
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  useEffect(() => {
    const next = new URLSearchParams(location.hash.slice(1)).get('token')
    if (next) {
      setToken(next)
      setError('')
      setMessage('')
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [location.hash])
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const password = String(form.get('password') || '')
    const validation = reset ? passwordError(password, String(form.get('confirm'))) : ''
    if (validation) {
      setError(validation)
      return
    }
    setBusy(true)
    setError('')
    try {
      const result = reset
        ? await authService.resetPassword(token, password)
        : await authService.forgotPassword(String(form.get('email')).trim())
      setMessage(result.message)
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
        <h1>{reset ? 'Choose a new password' : 'Forgot your password?'}</h1>
        <p>
          {reset
            ? 'Use a new password for your email/password account.'
            : 'Enter your email to receive a password reset link. If you signed up with Google, continue with Google on the sign-in page.'}
        </p>
        {message ? (
          <p className="notice" role="status">
            {message}
          </p>
        ) : reset && !token ? (
          <p role="alert">
            This reset link is missing or invalid.{' '}
            <Link to="/forgot-password">Request a new link</Link>.
          </p>
        ) : (
          <form className="form-stack" onSubmit={(event) => void submit(event)}>
            {reset ? (
              <>
                <label>
                  New password
                  <input
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    minLength={6}
                    maxLength={100}
                    required
                    disabled={busy}
                  />
                </label>
                <label>
                  Confirm new password
                  <input
                    name="confirm"
                    type="password"
                    autoComplete="new-password"
                    required
                    disabled={busy}
                  />
                </label>
              </>
            ) : (
              <label>
                Email address
                <input name="email" type="email" autoComplete="email" required disabled={busy} />
              </label>
            )}
            {error && (
              <p className="upload-error" role="alert">
                {error}
              </p>
            )}
            <button className="button primary" disabled={busy}>
              {busy ? 'Please wait…' : reset ? 'Reset password' : 'Send reset link'}
            </button>
            {reset && error && <Link to="/forgot-password">Request a new reset link</Link>}
          </form>
        )}
        <p className="auth-switch">
          <Link to="/login">Back to sign in</Link>
        </p>
      </div>
    </main>
  )
}
