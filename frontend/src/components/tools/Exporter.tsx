import { useState } from 'react'
import { Download } from 'lucide-react'
import { toast } from '../../store/toasts'
import { errorMessage } from '../../services/api'

function saveText(text: string, name: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export function Exporter({
  title,
  content,
  disabled = false,
}: {
  title: string
  content: string
  disabled?: boolean
}) {
  const [format, setFormat] = useState('md')
  const [busy, setBusy] = useState(false)
  async function exportFile() {
    setBusy(true)
    try {
      const name =
        title
          .replace(/[^\p{L}\p{N} -]/gu, '')
          .trim()
          .slice(0, 70) || 'ResearchMate'
      if (format === 'md') saveText(`# ${title}\n\n${content}`, `${name}.md`)
      else {
        const { jsPDF } = await import('jspdf')
        const pdf = new jsPDF()
        const lines = pdf.splitTextToSize(`${title}\n\n${content}`, 175) as string[]
        pdf.setFontSize(11)
        // Paginate rather than clipping long conversations.
        for (let i = 0; i < lines.length; i += 46) {
          if (i) pdf.addPage()
          pdf.text(lines.slice(i, i + 46), 18, 22)
          pdf.setFontSize(9)
          pdf.text(`ResearchMate · ${Math.floor(i / 46) + 1}`, 18, 285)
          pdf.setFontSize(11)
        }
        pdf.save(`${name}.pdf`)
      }
      toast('Export downloaded.')
    } catch (error) {
      toast(errorMessage(error), 'error')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="export-controls">
      <label className="sr-only" htmlFor="export-format">
        Export format
      </label>
      <select
        id="export-format"
        value={format}
        onChange={(event) => setFormat(event.target.value)}
        disabled={busy || disabled}
      >
        <option value="md">Markdown</option>
        <option value="pdf">PDF (Latin text)</option>
      </select>
      <button
        className="button secondary small"
        onClick={() => void exportFile()}
        disabled={busy || disabled || !content.trim()}
      >
        <Download size={16} />
        {busy ? 'Exporting…' : 'Export'}
      </button>
    </div>
  )
}
