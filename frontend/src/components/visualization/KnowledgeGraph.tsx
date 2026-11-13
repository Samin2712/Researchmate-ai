import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Background, Controls, ReactFlow, type Node } from '@xyflow/react'
import { useQuery } from '@tanstack/react-query'
import { useDocuments, useSessions } from '../../services/queries'
import { chatService } from '../../services/chatService'
import { errorMessage } from '../../services/api'
import { EmptyState, ErrorState, Loading } from '../shared/Feedback'
import { buildConnections } from './graph'
import '@xyflow/react/dist/style.css'
export default function KnowledgeGraph() {
  const documents = useDocuments()
  const sessions = useSessions()
  const sessionIds = sessions.data?.map((session) => session.id) || []
  const citations = useQuery({
    queryKey: ['graph-citations', sessionIds],
    queryFn: async ({ signal }) => {
      // Batches avoid firing hundreds of history requests at once.
      const messages = []
      for (let offset = 0; offset < sessionIds.length; offset += 5) {
        const results = await Promise.all(
          sessionIds.slice(offset, offset + 5).map((id) => chatService.session(id, signal)),
        )
        messages.push(...results.flatMap((session) => session.messages))
      }
      return messages
    },
    enabled: sessions.isSuccess,
  })
  const graph = useMemo(() => {
    const papers = documents.data?.documents || []
    const columns = Math.max(2, Math.ceil(Math.sqrt(papers.length)))
    const nodes: Node[] = papers.map((paper, index) => ({
      id: String(paper.id),
      position: { x: (index % columns) * 290, y: Math.floor(index / columns) * 190 },
      data: {
        label: (
          <Link className="graph-paper" to={`/library?document=${paper.id}`}>
            <span>{paper.status === 'completed' ? 'Ready paper' : 'Processing paper'}</span>
            <strong>{paper.title}</strong>
            <small>{paper.authors || 'Unknown author'}</small>
          </Link>
        ),
      },
      ariaLabel: `Paper ${paper.title}`,
      style: { width: 230 },
    }))
    return {
      nodes,
      edges: buildConnections(papers, citations.data || []).map((edge) => ({
        ...edge,
        style: { stroke: '#417b79', strokeWidth: 1.8 },
        labelStyle: { fontSize: 11, fill: '#193a51' },
        labelBgStyle: { fill: '#f5f8fa' },
      })),
    }
  }, [documents.data, citations.data])
  if (documents.isPending || sessions.isPending || (citations.isPending && sessions.isSuccess))
    return <Loading label="Connecting your research" />
  if (documents.isError)
    return (
      <ErrorState message={errorMessage(documents.error)} retry={() => void documents.refetch()} />
    )
  return (
    <>
      {(citations.isError || sessions.isError) && (
        <ErrorState
          message="Conversation connections could not be loaded. Shared-author connections are still shown."
          retry={() => {
            void sessions.refetch()
            void citations.refetch()
          }}
        />
      )}
      {!graph.nodes.length ? (
        <EmptyState title="A map begins with your papers.">
          <p>Add papers to your library to explore their connections.</p>
        </EmptyState>
      ) : (
        <>
          <div className="knowledge-graph" role="region" aria-label="Interactive knowledge map">
            <ReactFlow
              nodes={graph.nodes}
              edges={graph.edges}
              fitView
              nodesDraggable={false}
              nodesConnectable={false}
              minZoom={0.2}
              maxZoom={1.5}
            >
              <Background color="#cad8df" gap={22} />
              <Controls showInteractive={false} />
            </ReactFlow>
          </div>
          <p className="muted text-sm my-4">
            {graph.nodes.length} papers · {graph.edges.length} connections. Select a paper to open
            its details. Use Tab to focus a paper link and Enter to open it. Use the zoom controls
            or pinch to explore the map.
          </p>
          <details className="graph-accessible">
            <summary>Read connections as a list</summary>
            {graph.edges.length ? (
              <ul>
                {graph.edges.map((edge) => (
                  <li key={edge.id}>
                    {
                      documents.data?.documents.find((paper) => String(paper.id) === edge.source)
                        ?.title
                    }{' '}
                    ↔{' '}
                    {
                      documents.data?.documents.find((paper) => String(paper.id) === edge.target)
                        ?.title
                    }
                    : {edge.label}
                  </li>
                ))}
              </ul>
            ) : (
              <p>
                No connections found yet. Ask a question that cites multiple papers, or add papers
                with shared authors.
              </p>
            )}
          </details>
        </>
      )}
    </>
  )
}
