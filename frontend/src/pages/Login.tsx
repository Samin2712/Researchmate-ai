import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ArrowRight, BookOpen, Eye, EyeOff, Quote } from 'lucide-react'
import { motion } from 'motion/react'
import { authService } from '../services/authService'
import { errorMessage } from '../services/api'
import { useAuth } from '../store/auth'
import { Brand } from '../components/shared/Sidebar'
import { ErrorState } from '../components/shared/Feedback'
export function AuthForm({ register = false }: { register?: boolean }) {
  const navigate = useNavigate()
  const { token, expired, setToken } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [show, setShow] = useState(false)
  const [registered, setRegistered] = useState(false)
  if (token) return <Navigate to="/" replace />
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email')).trim()
    const password = String(form.get('password'))
    const name = String(form.get('name') || '').trim()
    if (register && password !== form.get('confirm')) {
      setError('The passwords do not match. Please enter them again.')
      return
    }
    // bcrypt accepts at most 72 UTF-8 bytes.
    if (new TextEncoder().encode(password).length > 72) {
      setError('Use a password of 72 UTF-8 bytes or fewer.')
      return
    }
    setBusy(true)
    setError('')
    try {
      if (register && !registered) {
        await authService.register(email, password, name)
        setRegistered(true)
      }
      const result = await authService.login(email, password)
      setToken(result.access_token)
      navigate('/', { replace: true })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="auth-page">
      <section className="auth-story">
        <Link to="/login" aria-label="ResearchMate AI home">
          <Brand />
        </Link>
        <div className="auth-story-main">
          <span className="auth-emblem">
            <BookOpen size={36} />
          </span>
          <h1>
            Make room for
            <br />
            your next discovery.
          </h1>
          <p>
            A thoughtful workspace for your papers, questions, and the connections between them.
          </p>
          <div className="research-illustration" aria-hidden="true">
            <div className="paper-sheet back">
              <div />
              <div />
              <div />
            </div>
            <div className="paper-sheet front">
              <Quote size={25} />
              <span>
                From reading
                <br />
                to understanding.
              </span>
              <div />
              <div />
              <div className="highlight" />
            </div>
            <span className="connection-node n1" />
            <span className="connection-node n2" />
            <span className="connection-node n3" />
          </div>
        </div>
        <p className="auth-footer">Your sources stay at the heart of every answer.</p>
      </section>
      <main className="auth-main">
        <div className="auth-mobile-brand">
          <Brand />
        </div>
        <motion.div
          className="auth-form"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <span className="auth-kicker">Your personal research workspace</span>
          <h2>{register ? 'Start a new chapter.' : 'Welcome back.'}</h2>
          <p>
            {register
              ? 'Create an account to bring your research together.'
              : 'Pick up where your curiosity left off.'}
          </p>
          {expired && (
            <div className="notice" role="status">
              Your session expired. Sign in to continue.
            </div>
          )}
          {registered && (
            <div className="notice" role="status">
              Your account was created. Sign in to continue.
            </div>
          )}
          <form onSubmit={submit} className="form-stack">
            {register && (
              <label>
                Full name
                <input
                  name="name"
                  autoComplete="name"
                  required
                  maxLength={100}
                  placeholder="Alex Morgan"
                  disabled={busy}
                />
              </label>
            )}
            <label>
              Email address
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@university.edu"
                disabled={busy}
              />
            </label>
            <label>
              Password
              <span className="password-field">
                <input
                  name="password"
                  type={show ? 'text' : 'password'}
                  autoComplete={register ? 'new-password' : 'current-password'}
                  minLength={register ? 6 : undefined}
                  maxLength={100}
                  required
                  placeholder={register ? 'At least 6 characters' : 'Enter your password'}
                  disabled={busy}
                />
                <button
                  type="button"
                  className="icon-button"
                  aria-label={show ? 'Hide password' : 'Show password'}
                  onClick={() => setShow(!show)}
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
            </label>
            {register && (
              <label>
                Confirm password
                <input
                  name="confirm"
                  type={show ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  disabled={busy}
                />
              </label>
            )}
            {error && <ErrorState message={error} />}
            <button className="button primary auth-submit" disabled={busy}>
              {busy
                ? register && !registered
                  ? 'Creating account…'
                  : 'Signing in…'
                : register
                  ? registered
                    ? 'Sign in'
                    : 'Create account'
                  : 'Sign in'}
              {!busy && <ArrowRight size={18} />}
            </button>
          </form>
          <p className="auth-switch">
            {register ? 'Already have an account?' : 'New to ResearchMate?'}{' '}
            <Link to={register ? '/login' : '/register'}>
              {register ? 'Sign in' : 'Create an account'}
            </Link>
          </p>
          <p className="auth-fine">Built for focused reading and evidence-backed thinking.</p>
        </motion.div>
      </main>
    </div>
  )
}
export default function Login() {
  return <AuthForm />
}
