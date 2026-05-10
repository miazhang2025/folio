import JSZip from 'jszip'
import { db } from '../data/db'

/** Slugify a label for use as a filename. */
function slug(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

/**
 * Exports all synthesized notes from Dexie as a ZIP of Obsidian-compatible
 * Markdown files. Each file gets YAML frontmatter + the raw note markdown.
 * Also generates a `_index.md` with [[wikilinks]] to every note.
 * Downloads the ZIP immediately via Blob URL.
 */
export async function exportVault(): Promise<void> {
  const [nodes, notes] = await Promise.all([
    db.nodes.toArray(),
    db.notes.toArray(),
  ])

  if (!notes.length) {
    // Surface to user — no throw, just a visible message
    alert('No synthesized notes yet. Build the map first.')
    return
  }

  const noteMap = new Map(notes.map((n) => [n.node_id, n.markdown]))
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))

  const zip = new JSZip()
  const folder = zip.folder('folio-vault')!
  const today = new Date().toISOString().slice(0, 10)

  // One file per synthesized note
  for (const note of notes) {
    const node = nodeMap.get(note.node_id)
    if (!node) continue
    const filename = slug(node.label)
    const frontmatter = [
      '---',
      `title: "${node.label}"`,
      `family: ${node.family}`,
      `recency: ${node.recency}`,
      `conversations: ${node.conversation_ids.length}`,
      `exported: ${today}`,
      '---',
      '',
      '',
    ].join('\n')
    folder.file(`${filename}.md`, frontmatter + note.markdown)
  }

  // _index.md — lists every node with wikilinks to those that have notes
  const indexLines = nodes.map((n) => {
    const filename = slug(n.label)
    const hasNote = noteMap.has(n.id)
    const link = hasNote ? `[[${filename}|${n.label}]]` : n.label
    return `- ${link} · ${n.family} · ${n.conversation_ids.length} convs`
  })
  const indexContent = [
    '---',
    `title: "Folio vault index"`,
    `exported: ${today}`,
    `nodes: ${nodes.length}`,
    `notes: ${notes.length}`,
    '---',
    '',
    '# Folio',
    '',
    ...indexLines,
    '',
  ].join('\n')
  folder.file('_index.md', indexContent)

  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `folio-vault-${today}.zip`
  a.click()
  URL.revokeObjectURL(url)
}
