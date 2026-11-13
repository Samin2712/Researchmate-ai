import KnowledgeGraph from '../components/visualization/KnowledgeGraph'
export default function Graph() {
  return (
    <div className="page">
      <header className="page-heading">
        <div>
          <h1>See your research connect.</h1>
          <p>A map of the papers and evidence in your workspace.</p>
        </div>
      </header>
      <div className="map-legend">
        <span>
          <i className="legend-dot" />
          Your papers
        </span>
        <span>
          <i className="legend-line" />
          Shared authors or cited together
        </span>
      </div>
      <KnowledgeGraph />
      <div className="map-note">
        <h2>Connections you can trace.</h2>
        <p>
          Lines show matching author metadata or two papers cited in the same answer. This map does
          not infer scientific agreement or formal citation relationships.
        </p>
      </div>
    </div>
  )
}
