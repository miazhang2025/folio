import { useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'
import { useUIStore } from '../../store/ui'
import { useNodes } from '../hooks/useNodes'
import { EDGES, FAMILY_COLORS } from '../../lib/fixtures'
import { Mindmap } from '../components/Mindmap'
import { mergeNodes } from '../../data/queries'
import type { FixtureNode, EdgePair } from '../../lib/fixtures'

const FAMILIES = ['creative', 'work', 'life', 'admin'] as const
type Family = typeof FAMILIES[number]

/** Build adjacency edges from each node's related_node_ids (set by the clusterer).
 *  Falls back to a family-hub chain when no relationship data is available. */
function computeEdges(nodes: FixtureNode[]): EdgePair[] {
  const nodeIds = new Set(nodes.map((n) => n.id))
  const seen = new Set<string>()
  const edges: EdgePair[] = []

  // Primary: use semantic related_node_ids stored during clustering
  for (const n of nodes) {
    if (!n.related_node_ids?.length) continue
    for (const relId of n.related_node_ids) {
      if (!nodeIds.has(relId)) continue          // skip filtered-out nodes
      const key = [n.id, relId].sort().join('|')
      if (seen.has(key)) continue
      seen.add(key)
      edges.push([n.id, relId])
    }
  }

  if (edges.length > 0) return edges

  // Fallback: family spine (used when nodes have no related_node_ids yet)
  const byFamily = new Map<string, FixtureNode[]>()
  for (const n of nodes) {
    const arr = byFamily.get(n.family) ?? []
    arr.push(n)
    byFamily.set(n.family, arr)
  }
  const hubs: FixtureNode[] = []
  for (const [, group] of byFamily) {
    const sorted = [...group].sort((a, b) => b.count - a.count)
    hubs.push(sorted[0])
    for (let i = 0; i < sorted.length - 1; i++) {
      edges.push([sorted[i].id, sorted[i + 1].id])
    }
  }
  for (let i = 0; i < hubs.length - 1; i++) {
    edges.push([hubs[i].id, hubs[i + 1].id])
  }
  return edges
}

export function MapView() {
  const { filter, setFilter, setView, setSelected } = useUIStore()
  const nodes = useNodes()
  const realNodeCount = useLiveQuery(() => db.nodes.count(), []) ?? 0

  const handleMerge = useCallback(async (fromId: string, intoId: string) => {
    await mergeNodes(fromId, intoId)
    setSelected(intoId)
  }, [setSelected])

  return (
    <div className="h-map-wrap">
      {/* Lens filter strip */}
      <div className="h-filters">
        <span>Lens:</span>
        <button
          className={`h-filter${filter === 'all' ? ' active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        {FAMILIES.map((f) => {
          const colors = FAMILY_COLORS[f]
          return (
            <button
              key={f}
              className={`h-filter${filter === f ? ' active' : ''}`}
              onClick={() => setFilter(f as Family)}
            >
              <span
                className="h-filter-dot"
                style={{ background: colors.dot }}
              />
              {f}
            </button>
          )
        })}
      </div>

      {/* Mindmap canvas */}
      <Mindmap
        nodes={nodes}
        edges={realNodeCount > 0 ? computeEdges(nodes) : EDGES}
        onMerge={realNodeCount > 0 ? handleMerge : undefined}
      />

      {/* Dispatch stamp */}
      <button className="h-stamp" onClick={() => setView('weekly')}>
        This week
        <span className="h-stamp-sub">dispatch →</span>
      </button>
    </div>
  )
}
