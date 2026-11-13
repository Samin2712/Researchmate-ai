import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertCircle, Check, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useToasts } from '../../store/toasts'
export function Toasts() {
  const { items, dismiss } = useToasts()
  return (
    <div className="toast-stack" role="region" aria-label="Notifications">
      <AnimatePresence>
        {items.map((item) => (
          <motion.div
            className={`toast ${item.kind}`}
            role={item.kind === 'error' ? 'alert' : 'status'}
            key={item.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {item.kind === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
            <span>{item.text}</span>
            <button
              className="icon-button"
              aria-label="Dismiss notification"
              onClick={() => dismiss(item.id)}
            >
              <X size={16} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
export function Loading({ label = 'Loading workspace' }: { label?: string }) {
  return (
    <div className="loading-area" role="status">
      <span className="spinner" />
      <span>{label}…</span>
    </div>
  )
}
export function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-4" aria-label="Loading" role="status">
      {Array.from({ length: rows }, (_, i) => (
        <div className="skeleton" key={i} />
      ))}
    </div>
  )
}
export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="error-state" role="alert">
      <AlertCircle size={20} />
      <p>{message}</p>
      {retry && (
        <button className="button secondary" onClick={retry}>
          Try again
        </button>
      )}
    </div>
  )
}
export function EmptyState({
  icon,
  title,
  children,
}: {
  icon?: ReactNode
  title: string
  children: ReactNode
}) {
  return (
    <div className="empty-state">
      {icon && <div className="empty-icon">{icon}</div>}
      <h2>{title}</h2>
      <div>{children}</div>
    </div>
  )
}
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false }
  static getDerivedStateFromError() {
    return { error: true }
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Workspace error', error, info.componentStack)
  }
  render() {
    return this.state.error ? (
      <main className="p-8">
        <ErrorState
          message="This page could not be displayed. Reload to recover."
          retry={() => window.location.reload()}
        />
      </main>
    ) : (
      this.props.children
    )
  }
}
