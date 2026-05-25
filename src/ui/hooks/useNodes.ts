import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'
import { NODES } from '../../lib/fixtures'
import { useUIStore } from '../../store/ui'
import type { FixtureNode } from '../../lib/fixtures'
import type { Node } from '../../data/schema'

/** Map a DB Node to the FixtureNode shape expected by the map UI. */
function dbNodeToFixture(n: Node, idx: number, total: number): FixtureNode {
  // Spread into a grid if no position was stored
  const cols = Math.ceil(Math.sqrt(total))
  const col = idx % cols
  const row = Math.floor(idx / cols)
  const margin = 0.12
  const step = (1 - 2 * margin) / Math.max(cols - 1, 1)

  // Count conversations for this node (we'll derive from distills table)
  return {
    id: n.id,
    label: n.label,
    family: n.family,
    recency: n.recency,
    count: 0,                           // updated below asynchronously; D3 will lay out
    x: n.position ? n.position.x : margin + col * step,
    y: n.position ? n.position.y : margin + row * step,
    position: n.position,
    manual_edits: n.manual_edits,
    related_node_ids: n.related_node_ids,
  }
}

/**
 * Returns the visible nodes filtered by the current lens.
 * Prefers real Dexie data when available; falls back to fixtures.
 */
export function useNodes(): FixtureNode[] {
  const filter = useUIStore((s) => s.filter)

  const dbNodes = useLiveQuery(
    async () => {
      const nodes = await db.nodes.toArray()
      if (!nodes.length) return null

      // Compute per-node conversation counts from the distills table
      const counts = new Map<string, number>()
      const distills = await db.distills.toArray()
      for (const d of distills) counts.set(d.node_id, (counts.get(d.node_id) ?? 0) + 1)

      return nodes.map((n, i) => {
        const fx = dbNodeToFixture(n, i, nodes.length)
        fx.count = counts.get(n.id) ?? 0
        return fx
      })
    },
    [],
  )

  const source: FixtureNode[] = dbNodes ?? NODES

  if (filter === 'all') return source
  return source.filter((n) => n.family === filter)
}
