import { BookOpen, MessagesSquare, Network } from 'lucide-react'
export default function About() {
  return (
    <div className="page narrow-page">
      <header className="page-heading">
        <div>
          <h1>Built around your curiosity.</h1>
          <p>ResearchMate helps you move from a collection of PDFs to a clearer understanding.</p>
        </div>
      </header>
      <section className="about-intro">
        <BookOpen size={34} />
        <h2>Your sources. A new perspective.</h2>
        <p>
          Upload research papers, ask questions across your library, and trace each answer back to
          the text that informed it. Your account keeps your papers and conversations together.
        </p>
      </section>
      <section className="about-features">
        {[
          {
            icon: BookOpen,
            title: 'A library that works with you',
            text: 'Upload a PDF and let ResearchMate prepare the text for search. Processing status tells you when it is ready.',
          },
          {
            icon: MessagesSquare,
            title: 'A conversation with the evidence',
            text: 'Ask about findings, methods, and limitations. Expand sources to read text excerpts and find the relevant paper and page.',
          },
          {
            icon: Network,
            title: 'A wider view of your reading',
            text: 'Explore connections from shared authors and papers cited together. Export a summary or conversation to keep your notes.',
          },
        ].map(({ icon: Icon, title, text }) => (
          <article key={title}>
            <Icon size={22} />
            <div>
              <h2>{title}</h2>
              <p>{text}</p>
            </div>
          </article>
        ))}
      </section>
      <div className="notice">
        <h2 className="font-semibold mb-2">Keep your critical thinking close.</h2>
        <p>
          AI-generated answers can miss context or contain mistakes. Confidence reflects retrieval
          signals, not scientific certainty. Verify claims against the original paper before citing
          them.
        </p>
      </div>
    </div>
  )
}
