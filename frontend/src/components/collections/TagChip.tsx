import type { Tag } from '../../types/collections'

interface TagChipProps {
  tag: Tag
  onRemove?: (tagId: number) => void
}

export function TagChip({ tag, onRemove }: TagChipProps) {
  const color = tag.color || '#116e64'
  // Compute a light background from the color (20% opacity approximation)
  const bg = hexToRgba(color, 0.12)

  return (
    <span
      className="tag-chip"
      style={{ backgroundColor: bg, color, borderColor: hexToRgba(color, 0.3) }}
    >
      {tag.name}
      {onRemove && (
        <button
          className="tag-chip-remove"
          aria-label={`Remove tag ${tag.name}`}
          onClick={() => onRemove(tag.id)}
          type="button"
        >
          ×
        </button>
      )}
    </span>
  )
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '')
  if (clean.length !== 6) return `rgba(17,110,100,${alpha})`
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}
