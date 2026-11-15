import { useProjectBriefs, useDeleteProjectBrief } from '../../services/queries'
import type { ProjectBrief } from '../../types/analysis'
import { toast } from '../../store/toasts'

export function SavedProjectBriefs() {
  const briefs = useProjectBriefs()
  const remove = useDeleteProjectBrief()
  function download(b: ProjectBrief) {
    const text = `# ${b.title}\n\n${b.research_question}\n\n**Method:** ${b.method}\n\n**Data (requires verification):** ${b.data_sources}\n\n**Skills:** ${b.skills_required || 'Requires verification'}\n\n${b.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n**Success criteria:** ${b.success_criteria}\n\n**Time:** ${b.time_budget || 'Unspecified'}\n\n**Resources:** ${b.resource_budget || 'Unspecified'}\n\n## Assumptions requiring verification\n${b.assumptions.map(a => `- ${a}`).join('\n')}\n\n## Linked sources\n${b.linked_source_ids.map(s => `- [${s}]`).join('\n')}\n\nAnalysis run: ${b.analysis_run_id || 'Deleted'}\n`
    const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown' }))
    const a = document.createElement('a')
    a.href = url; a.download = `project-brief-${b.id}.md`; a.click()
    URL.revokeObjectURL(url)
  }
  return <section aria-label="Saved project briefs">
    <h2>Saved project briefs</h2>
    {briefs.isPending && <p role="status">Loading saved briefs…</p>}
    {briefs.isError && <p role="alert">Could not load saved briefs. <button onClick={() => void briefs.refetch()}>Retry</button></p>}
    {briefs.data?.length === 0 && <p className="muted">Save a candidate as a project brief to keep its proposal and assumptions here.</p>}
    {briefs.data?.map(b => <details key={b.id} className="gap-card">
      <summary>{b.title}</summary>
      <p>{b.research_question}</p><p>{b.method}</p>
      <p>Assumptions: {b.assumptions.join('; ') || 'None recorded'}</p>
      <p>Linked sources: {b.linked_source_ids.join(', ')}</p>
      <button className="button tertiary small" onClick={() => download(b)}>Export brief</button>
      <button className="button tertiary small" disabled={remove.isPending} onClick={() => remove.mutate(b.id, { onError: () => toast('Could not delete brief', 'error') })}>Delete brief</button>
    </details>)}
  </section>
}
