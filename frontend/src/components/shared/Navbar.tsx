import { Menu, Plus } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
const names: Record<string, string> = {
  '/': 'Workspace overview',
  '/library': 'Paper library',
  '/chat': 'Research chat',
  '/graph': 'Knowledge map',
  '/settings': 'Settings',
  '/about': 'About ResearchMate',
}
export function Navbar({ onMenu }: { onMenu: () => void }) {
  const { pathname } = useLocation()
  return (
    <header className="topbar">
      <div className="flex items-center gap-3">
        <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={onMenu}>
          <Menu size={22} />
        </button>
        <span className="breadcrumb">
          Workspace <span>/</span> <strong>{names[pathname] || 'Page'}</strong>
        </span>
      </div>
      <Link to="/library?upload=1" className="button primary small">
        <Plus size={17} />
        <span>Add papers</span>
      </Link>
    </header>
  )
}
