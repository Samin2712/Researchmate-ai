import { Link } from 'react-router-dom'
import { BookOpen, MessagesSquare, Network, ArrowRight } from 'lucide-react'
import PublicLayout from '../components/shared/PublicLayout'

export default function Home() {
  return (
    <PublicLayout>
      <section className="public-hero">
        <div>
          <p className="public-intro">ResearchMate AI</p>
          <h1>
            Your papers.
            <br />A clearer perspective.
          </h1>
          <p className="public-lede">
            A personal research workspace to organize papers, ask questions, and follow every answer
            back to its sources.
          </p>
          <div className="public-actions">
            <Link className="button primary" to="/register">
              Create your workspace <ArrowRight size={17} />
            </Link>
            <Link className="text-button" to="/login">
              Already a member? Sign in
            </Link>
          </div>
        </div>
        <aside className="public-reading-note" aria-label="How ResearchMate helps">
          <BookOpen size={29} />
          <h2>
            From reading
            <br />
            to understanding.
          </h2>
          <p>Bring a paper. Ask a question. Examine the evidence.</p>
          <div>
            <span>Paper library</span>
            <span>Source-backed answers</span>
            <span>Connected ideas</span>
          </div>
        </aside>
      </section>
      <section className="public-features" aria-label="Research tools">
        {[
          {
            Icon: BookOpen,
            title: 'Keep your reading together',
            text: 'Upload PDF research papers, organize your library, and keep notes alongside the work you are exploring.',
          },
          {
            Icon: MessagesSquare,
            title: 'Ask with the evidence in view',
            text: 'Ask about methods, findings, and limitations. Inspect cited excerpts and check the original paper before relying on an answer.',
          },
          {
            Icon: Network,
            title: 'See connections across papers',
            text: 'Compare studies, explore research gaps, and use a knowledge map to investigate connections in your library.',
          },
        ].map(({ Icon, title, text }) => (
          <article key={title}>
            <Icon size={25} />
            <h2>{title}</h2>
            <p>{text}</p>
          </article>
        ))}
      </section>
      <section className="public-data-note">
        <div>
          <h2>Know what you share.</h2>
          <p>
            Sign in with Google or an email/password account. Papers and questions are processed to
            provide research assistance; relevant content may be sent to our AI provider. Our
            privacy policy explains the details.
          </p>
        </div>
        <Link className="text-button" to="/privacy">
          Read the privacy policy <ArrowRight size={16} />
        </Link>
      </section>
      <p className="public-caution">
        AI can miss context or make mistakes. ResearchMate supports your reading; verify claims
        against original sources.
      </p>
    </PublicLayout>
  )
}
