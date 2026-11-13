import {
  ArrowRight,
  BookOpen,
  FileCheck2,
  MessagesSquare,
  Network,
  Plus,
  Sparkles,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useDocuments, useSessions, useUser } from '../services/queries'
import { EmptyState, ErrorState, Skeleton } from '../components/shared/Feedback'
import { errorMessage } from '../services/api'
import { DocumentCard } from '../components/documents/DocumentCard'

export default function Dashboard() {
  const documents = useDocuments()
  const sessions = useSessions()
  const { data: user } = useUser()
  const ready = documents.data?.documents.filter(
    (document) => document.status === 'completed',
  ).length
  return (
    <div className="page">
      <header className="page-heading">
        <div>
          <p className="greeting">
            Welcome{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ' to your workspace'}
          </p>
          <h1>What will you discover today?</h1>
          <p>Your papers, questions, and ideas. All connected.</p>
        </div>
        <span className="date-label">
          {new Date().toLocaleDateString(undefined, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </span>
      </header>
      <section className="workspace-banner">
        <div className="banner-copy">
          <span className="banner-mark">
            <Sparkles size={20} /> A little more clarity
          </span>
          <h2>
            Let your papers
            <br />
            talk to each other.
          </h2>
          <p>
            Ask a question across your library. Follow the sources. Find the connection you hadn’t
            seen.
          </p>
          <Link to="/chat" className="button banner-button">
            Start a research chat
            <ArrowRight size={17} />
          </Link>
        </div>
        <div className="banner-diagram" aria-hidden="true">
          <svg viewBox="0 0 360 230">
            <path d="M65 60L180 115L285 45M180 115L290 190M180 115L60 190" />
            <circle cx="180" cy="115" r="48" />
            <circle cx="65" cy="60" r="24" />
            <circle cx="285" cy="45" r="24" />
            <circle cx="290" cy="190" r="24" />
            <circle cx="60" cy="190" r="24" />
          </svg>
          <span className="diagram-center">
            <MessagesSquare size={31} />
          </span>
          <span className="diagram-paper dp1">
            <BookOpen size={19} />
          </span>
          <span className="diagram-paper dp2">
            <BookOpen size={19} />
          </span>
          <span className="diagram-paper dp3">
            <FileCheck2 size={19} />
          </span>
          <span className="diagram-paper dp4">
            <Sparkles size={19} />
          </span>
        </div>
      </section>
      <section className="stats-grid" aria-label="Workspace statistics">
        {[
          { icon: BookOpen, label: 'Papers in your library', value: documents.data?.total },
          { icon: FileCheck2, label: 'Ready for questions', value: ready },
          { icon: MessagesSquare, label: 'Research conversations', value: sessions.data?.length },
        ].map(({ icon: Icon, label, value }) => (
          <div className="stat" key={label}>
            <span className="stat-icon">
              <Icon size={21} />
            </span>
            <div>
              <strong>{value ?? '—'}</strong>
              <span>{label}</span>
            </div>
          </div>
        ))}
      </section>
      <div className="dashboard-columns">
        <section>
          <div className="section-heading">
            <h2>Recently added</h2>
            <Link to="/library" className="text-link">
              View library
              <ArrowRight size={15} />
            </Link>
          </div>
          {documents.isPending ? (
            <Skeleton rows={2} />
          ) : documents.isError ? (
            <ErrorState
              message={errorMessage(documents.error)}
              retry={() => void documents.refetch()}
            />
          ) : documents.data.documents.length ? (
            <div className="dashboard-papers">
              {documents.data.documents.slice(0, 2).map((document) => (
                <DocumentCard key={document.id} document={document} />
              ))}
            </div>
          ) : (
            <EmptyState icon={<BookOpen size={29} />} title="Build your reading collection">
              <p>Start with a paper you’d like to understand better.</p>
              <Link to="/library?upload=1" className="button primary mt-5">
                <Plus size={17} />
                Add your first paper
              </Link>
            </EmptyState>
          )}
        </section>
        <aside className="dashboard-aside" aria-label="More research tools">
          <div className="section-heading">
            <h2>Keep exploring</h2>
          </div>
          <Link className="explore-link" to="/graph">
            <span className="explore-icon">
              <Network size={22} />
            </span>
            <div>
              <h3>See the bigger picture</h3>
              <p>Explore shared authors and papers cited together.</p>
            </div>
            <ArrowRight size={17} />
          </Link>
          <div className="recent-sessions">
            <h3>Recent conversations</h3>
            {sessions.isPending ? (
              <Skeleton rows={1} />
            ) : sessions.isError ? (
              <ErrorState
                message={errorMessage(sessions.error)}
                retry={() => void sessions.refetch()}
              />
            ) : sessions.data.length ? (
              sessions.data.slice(0, 4).map((session) => (
                <Link key={session.id} to={`/chat?session=${session.id}`}>
                  <MessagesSquare size={16} />
                  <span>{session.title}</span>
                  <ArrowRight size={14} />
                </Link>
              ))
            ) : (
              <p className="muted">
                Your conversations will appear here. Start with a question about your papers.
              </p>
            )}
          </div>
          <div className="research-tip">
            <QuoteIcon />
            <h3>A good question opens doors.</h3>
            <p>Try asking how a paper reached its conclusions, or where two studies disagree.</p>
          </div>
        </aside>
      </div>
    </div>
  )
}
function QuoteIcon() {
  return (
    <span className="tip-quote" aria-hidden="true">
      “
    </span>
  )
}
