import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'
import { useUIStore } from '../../store/ui'
import { useNodes } from '../hooks/useNodes'
import { EDGES, FAMILY_COLORS } from '../../lib/fixtures'
import { Mindmap } from '../components/Mindmap'
import type { FixtureNode, EdgePair } from '../../lib/fixtures'

const FAMILIES = ['creative', 'work', 'life', 'admin'] as const
type Family = typeof FAMILIES[number]

/** Build adjacency edges from real node data grouped by family. */
function computeEdges(nodes: FixtureNode[]): EdgePair[] {
  const edges: EdgePair[] = []
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
  // Thin cross-family spine connecting each family's hub
  for (let i = 0; i < hubs.length - 1; i++) {
    edges.push([hubs[i].id, hubs[i + 1].id])
  }
  return edges
}

export function MapView() {
  const { filter, setFilter, setView } = useUIStore()
  const nodes = useNodes()
  const realNodeCount = useLiveQuery(() => db.nodes.count(), []) ?? 0

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
      <Mindmap nodes={nodes} edges={realNodeCount > 0 ? computeEdges(nodes) : EDGES} />

      {/* Dispatch stamp */}
      <button className="h-stamp" onClick={() => setView('weekly')}>
        This week
        <span className="h-stamp-sub">dispatch →</span>
      </button>
    </div>
  )
}
