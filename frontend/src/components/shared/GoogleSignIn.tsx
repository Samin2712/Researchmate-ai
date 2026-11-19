import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../../services/authService'
import { errorMessage } from '../../services/api'
import { useAuth } from '../../store/auth'

type GoogleIdentity = {
  accounts: {
    id: {
      initialize: (options: {
        client_id: string
        callback: (response: { credential: string }) => void
      }) => void
      renderButton: (
        element: HTMLElement,
        options: { theme: string; size: string; text: string },
      ) => void
    }
  }
}
declare global {
  interface Window {
    google?: GoogleIdentity
  }
}

let googleScript: Promise<void> | undefined
function loadGoogle() {
  if (window.google?.accounts.id) return Promise.resolve()
  if (!googleScript)
    googleScript = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.onload = () => resolve()
      script.onerror = () => {
        script.remove()
        googleScript = undefined
        reject(new Error('Google sign-in could not load. Check your connection.'))
      }
      document.head.appendChild(script)
    })
  return googleScript
}

export default function GoogleSignIn() {
  const container = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [enabled, setEnabled] = useState(false)
  useEffect(() => {
    let active = true
    let configured = false
    void authService
      .providers()
      .then(async ({ google_client_id }) => {
        if (!google_client_id || !active) return
        configured = true
        setEnabled(true)
        await loadGoogle()
        if (!active || !container.current || !window.google) return
        window.google.accounts.id.initialize({
          client_id: google_client_id,
          callback: ({ credential }) => {
            if (!active) return
            setBusy(true)
            setError('')
            void authService
              .google(credential)
              .then(({ access_token }) => {
                if (!active) return
                useAuth.getState().setToken(access_token)
                navigate('/', { replace: true })
              })
              .catch((err: unknown) => {
                if (active) setError(errorMessage(err))
              })
              .finally(() => {
                if (active) setBusy(false)
              })
          },
        })
        window.google.accounts.id.renderButton(container.current, {
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
        })
      })
      .catch((err: unknown) => {
        // Provider discovery is optional; password sign-in remains available.
        if (active && configured) setError(errorMessage(err))
      })
    return () => {
      active = false
    }
  }, [navigate])
  return (
    <div className="google-signin" hidden={!enabled && !error} aria-busy={busy}>
      <div ref={container} aria-label="Google sign-in" hidden={!enabled || busy} />
      {busy && <p role="status">Signing in with Google…</p>}
      {error && (
        <p role="alert" className="upload-error">
          {error}
        </p>
      )}
    </div>
  )
}
