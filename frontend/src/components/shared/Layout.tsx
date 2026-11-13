import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { motion } from 'motion/react'
import { Sidebar } from './Sidebar'
import { Navbar } from './Navbar'
import { Modal } from './Modal'
export default function Layout() {
  const [menu, setMenu] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => {
    document.getElementById('main-content')?.focus({ preventScroll: true })
  }, [pathname])
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside className="desktop-sidebar" aria-label="Workspace navigation">
        <Sidebar />
      </aside>
      <div className="workspace-main">
        <Navbar onMenu={() => setMenu(true)} />
        <main id="main-content" tabIndex={-1}>
          <motion.div
            key={pathname}
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.16 }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
      {menu && (
        <Modal title="Navigation" onClose={() => setMenu(false)}>
          <div className="mobile-sidebar">
            <Sidebar onNavigate={() => setMenu(false)} />
          </div>
        </Modal>
      )}
    </div>
  )
}
