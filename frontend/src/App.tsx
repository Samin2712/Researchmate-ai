import { lazy, Suspense, useEffect, type ReactNode } from 'react'
import { Navigate, Route, Routes, Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { MotionConfig } from 'motion/react'
import Layout from './components/shared/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import { ErrorState, Loading } from './components/shared/Feedback'
import { useAuth, tokenExpiry } from './store/auth'
import { usePreferences } from './store/preferences'
import { useUser } from './services/queries'
import { errorMessage } from './services/api'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Library = lazy(() => import('./pages/Library'))
const Chat = lazy(() => import('./pages/Chat'))
const Graph = lazy(() => import('./pages/Graph'))
const Settings = lazy(() => import('./pages/Settings'))
const About = lazy(() => import('./pages/About'))

function VerifiedSession({ children }: { children: ReactNode }) {
  const user = useUser()
  if (user.isPending) return <Loading label="Restoring your session" />
  if (user.isError)
    return (
      <div className="session-error">
        <ErrorState message={errorMessage(user.error)} retry={() => void user.refetch()} />
        <button className="button secondary" onClick={() => useAuth.getState().logout()}>
          Back to sign in
        </button>
      </div>
    )
  return children
}
function ProtectedRoute() {
  const token = useAuth((state) => state.token)
  return token ? (
    <VerifiedSession>
      <Layout />
    </VerifiedSession>
  ) : (
    <Navigate to="/login" replace />
  )
}
export default function App() {
  const token = useAuth((state) => state.token)
  const reduceMotion = usePreferences((state) => state.reduceMotion)
  const client = useQueryClient()
  useEffect(() => {
    if (!token) {
      client.clear()
      return
    }
    const check = () => {
      const expiry = tokenExpiry(token)
      if (expiry != null && expiry <= Date.now()) useAuth.getState().logout(true)
    }
    check()
    const timer = window.setInterval(check, 15000)
    const sync = (event: StorageEvent) => {
      if (event.key === 'researchmate.token' && event.newValue !== token) {
        client.clear()
        if (event.newValue) useAuth.getState().setToken(event.newValue)
        else useAuth.getState().logout()
      }
    }
    window.addEventListener('focus', check)
    window.addEventListener('storage', sync)
    return () => {
      clearInterval(timer)
      window.removeEventListener('focus', check)
      window.removeEventListener('storage', sync)
    }
  }, [token, client])
  return (
    <MotionConfig reducedMotion={reduceMotion ? 'always' : 'user'}>
      <Suspense fallback={<Loading label="Opening page" />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route element={<ProtectedRoute />}>
            <Route index element={<Dashboard />} />
            <Route path="library" element={<Library />} />
            <Route path="chat" element={<Chat />} />
            <Route path="graph" element={<Graph />} />
            <Route path="settings" element={<Settings />} />
            <Route path="about" element={<About />} />
            <Route
              path="*"
              element={
                <div className="page">
                  <h1>Page not found</h1>
                  <p className="my-4">This page may have moved.</p>
                  <Link className="button primary" to="/">
                    Back to overview
                  </Link>
                </div>
              }
            />
          </Route>
        </Routes>
      </Suspense>
    </MotionConfig>
  )
}
