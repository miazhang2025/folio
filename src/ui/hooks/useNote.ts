import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'
import { NOTES, NODES, fallbackNote } from '../../lib/fixtures'
import type { FixtureNote, FixtureNode } from '../../lib/fixtures'

export type NoteResult =
  | { kind: 'markdown'; markdown: string; nodeId: string }
  | { kind: 'fixture';  note: FixtureNote }

/**
 * Returns the synthesized note for a node.
 * Priority: Dexie notes table → fixture notes → DB node placeholder → null.
 */
export function useNote(nodeId: string): NoteResult | null {
  // Both hooks called unconditionally before any early returns
  const dbNote = useLiveQuery(() => db.notes.get(nodeId), [nodeId])
  const dbNode = useLiveQuery(() => db.nodes.get(nodeId), [nodeId])

  if (dbNote) {
    return { kind: 'markdown', markdown: dbNote.markdown, nodeId }
  }

  if (NOTES[nodeId]) return { kind: 'fixture', note: NOTES[nodeId] }

  const fixtureNode = NODES.find((n) => n.id === nodeId)
  if (fixtureNode) return { kind: 'fixture', note: fallbackNote(fixtureNode) }

  // Real DB node without a synthesized note yet — show a placeholder
  if (dbNode) {
    const fake: FixtureNode = {
      id: dbNode.id,
      label: dbNode.label,
      family: dbNode.family,
      recency: dbNode.recency,
      position: dbNode.position,
      manual_edits: dbNode.manual_edits,
      count: dbNode.conversation_ids?.length ?? 0,
      x: 0.5,
      y: 0.5,
    }
    return { kind: 'fixture', note: fallbackNote(fake) }
  }

  return null
}
