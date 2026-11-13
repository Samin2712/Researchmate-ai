import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { MotionConfig } from 'motion/react'
import App from './App'
import { ErrorBoundary, Toasts } from './components/shared/Feedback'
import './styles.css'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: true, staleTime: 15000 } },
})
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <MotionConfig reducedMotion="user" transition={{ duration: 0.18 }}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
          <Toasts />
        </MotionConfig>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
