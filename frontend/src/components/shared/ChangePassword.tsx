import { useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { authService } from '../../services/authService'
import { errorMessage } from '../../services/api'
import { useAuth } from '../../store/auth'
import { toast } from '../../store/toasts'

export default function ChangePassword() {
  const client = useQueryClient()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const password = String(form.get('password'))
    if (password !== form.get('confirm')) {
      setError('The passwords do not match.')
      return
    }
    if (new TextEncoder().encode(password).length > 72) {
      setError('Use a password of 72 UTF-8 bytes or fewer.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const result = await authService.changePassword(String(form.get('current')), password)
      useAuth.getState().logout()
      client.clear()
      toast(result.message)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="settings-section">
      <form className="form-stack" onSubmit={(event) => void submit(event)}>
        <h2>Change password</h2>
        <p>After changing your password, sign in again on each device.</p>
        <label>
          Current password
          <input
            name="current"
            type="password"
            autoComplete="current-password"
            required
            disabled={busy}
          />
        </label>
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
        {error && (
          <p className="upload-error" role="alert">
            {error}
          </p>
        )}
        <div>
          <button className="button primary" disabled={busy}>
            {busy ? 'Changing password…' : 'Change password'}
          </button>
        </div>
      </form>
    </section>
  )
}
