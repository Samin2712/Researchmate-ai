import {
  BookOpen,
  ChartNoAxesCombined,
  CircleHelp,
  LayoutDashboard,
  LogOut,
  MessagesSquare,
  Network,
  Settings2,
  Sparkles,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../store/auth'
import { useUser } from '../../services/queries'

const links = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
  { to: '/library', label: 'Paper library', icon: BookOpen },
  { to: '/chat', label: 'Research chat', icon: MessagesSquare },
  { to: '/graph', label: 'Knowledge map', icon: Network },
]
export function Brand() {
  return (
    <span className="brand">
      <span className="brand-symbol">
        <ChartNoAxesCombined size={23} strokeWidth={2.3} />
      </span>
      <span>
        ResearchMate<span className="brand-ai"> AI</span>
      </span>
    </span>
  )
}
export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { data: user } = useUser()
  const queryClient = useQueryClient()
  const logout = () => {
    useAuth.getState().logout()
    queryClient.clear()
  }
  return (
    <div className="sidebar-content">
      <NavLink to="/" className="brand-link" onClick={onNavigate} aria-label="ResearchMate AI home">
        <Brand />
      </NavLink>
      <div className="workspace-label">
        <span className="workspace-dot" /> Personal workspace
      </div>
      <nav aria-label="Main navigation">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            end={to === '/'}
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <Icon size={19} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-note">
        <Sparkles size={20} />
        <p>
          Better questions.
          <br />
          <strong>Deeper understanding.</strong>
        </p>
        <span>Bring your papers together and follow the evidence.</span>
      </div>
      <nav className="sidebar-bottom" aria-label="Account navigation">
        <NavLink to="/settings" className="nav-link" onClick={onNavigate}>
          <Settings2 size={19} />
          Settings
        </NavLink>
        <NavLink to="/about" className="nav-link" onClick={onNavigate}>
          <CircleHelp size={19} />
          About ResearchMate
        </NavLink>
      </nav>
      <div className="profile">
        <span className="avatar">
          {(user?.full_name || user?.email || 'R').slice(0, 1).toUpperCase()}
        </span>
        <div>
          <strong>{user?.full_name || 'Researcher'}</strong>
          <span title={user?.email}>{user?.email}</span>
        </div>
        <button className="icon-button" aria-label="Log out" onClick={logout}>
          <LogOut size={18} />
        </button>
      </div>
    </div>
  )
}
