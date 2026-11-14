import { describe, it, expect } from 'vitest'
import { exportAsCSV, exportAsMarkdown } from './analysisService'
import type { AnalysisRun } from '../types/analysis'
const base: AnalysisRun = { id:1,user_id:1,kind:'comparison',status:'completed',document_ids:[1,2],progress_percent:100,created_at:'2026-11-15' }
const ref = { source_id:'doc1_chunk1',document_id:1,chunk_id:1,page_number:1,quote:'Known evidence',title:'Paper one' }
describe('analysis exports', () => {
  it('preserves full cells, evidence and neutralizes spreadsheet formulas including leading whitespace', () => {
    const run: AnalysisRun = { ...base, result:{document_ids:[1,2], document_titles:{1:'=CMD()',2:'Paper | two'},coverage:{1:{findings:true},2:{findings:true}},warnings:[],rows:[{field:'findings',label:'Findings',cells:{1:{value:' \t@SUM(1)',evidence:[ref]},2:{value:'A'.repeat(220)+'|tail',evidence:[]}}}]} }
    expect(exportAsCSV(run)).toContain("'=CMD()")
    expect(exportAsCSV(run)).toContain("' \t@SUM(1)")
    expect(exportAsMarkdown(run)).toContain('A'.repeat(220)+'\\|tail')
    expect(exportAsMarkdown(run)).toContain('[doc1_chunk1]')
    expect(exportAsMarkdown(run)).toContain('Coverage')
  })
  it('exports saved edits, references and coverage and rejects unresolved IDs', () => {
    const run: AnalysisRun = { ...base,kind:'literature_review',result:{title:'Draft',abstract:'Scope',sections:[],themes:[],coverage:{1:'included'},bibliography:{doc1_chunk1:ref}} }
    const text = exportAsMarkdown(run,'Changed claim [doc1_chunk1]')
    expect(text).toContain('Changed claim [doc1_chunk1]')
    expect(text).toContain('not been revalidated')
    expect(text).toContain('Known evidence')
    expect(() => exportAsMarkdown(run,'Bad [doc999_chunk9]')).toThrow('Unresolved')
  })
})
