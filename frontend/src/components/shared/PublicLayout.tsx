import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Brand } from './Sidebar'
import { useAuth } from '../../store/auth'

export function PolicyLinks() {
  return (
    <nav className="policy-links" aria-label="Legal information">
      <Link to="/privacy">Privacy policy</Link>
      <Link to="/terms">Terms of service</Link>
      <a href="mailto:researchmateai123@gmail.com">Contact</a>
    </nav>
  )
}

export default function PublicLayout({ children }: { children: ReactNode }) {
  const token = useAuth((state) => state.token)
  return (
    <div className="public-site">
      <a className="sr-only public-skip" href="#public-content">
        Skip to content
      </a>
      <header className="public-header">
        <Link to="/" aria-label="ResearchMate AI home">
          <Brand />
        </Link>
        <nav aria-label="Website navigation">
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <Link className="button secondary small" to={token ? '/library' : '/login'}>
            {token ? 'Open workspace' : 'Sign in'}
          </Link>
        </nav>
      </header>
      <main id="public-content" tabIndex={-1}>
        {children}
      </main>
      <footer className="public-footer">
        <p>
          ResearchMate AI
          <br />
          <span>A thoughtful space for your research.</span>
        </p>
        <PolicyLinks />
      </footer>
    </div>
  )
}
