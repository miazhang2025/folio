import * as d3 from 'd3'
import type { FixtureNode, EdgePair } from '../lib/fixtures'

export interface LayoutNode extends FixtureNode {
  px: number   // pixel x (mutable by simulation)
  py: number   // pixel y (mutable by simulation)
}

/**
 * Run a D3-force simulation on the given nodes and edges.
 * For nodes with a pinned `position`, the simulation respects those coords.
 * Returns a list of nodes with computed px/py pixel positions.
 *
 * This is run once (not continuously) — we snapshot the final positions.
 */
export function computeForceLayout(
  nodes: FixtureNode[],
  edges: EdgePair[],
  width: number,
  height: number,
): LayoutNode[] {
  // Seed positions: use proportional x/y or pinned position if available
  const simNodes: (d3.SimulationNodeDatum & LayoutNode)[] = nodes.map((n) => ({
    ...n,
    px: n.position ? n.position.x : n.x * width,
    py: n.position ? n.position.y : n.y * height,
    x:  n.position ? n.position.x : n.x * width,
    y:  n.position ? n.position.y : n.y * height,
    fx: n.position?.x,    // pin nodes that have user-set positions
    fy: n.position?.y,
  }))

  const simLinks: d3.SimulationLinkDatum<typeof simNodes[number]>[] = edges
    .map(([src, tgt]) => ({
      source: simNodes.find((n) => n.id === src)!,
      target: simNodes.find((n) => n.id === tgt)!,
    }))
    .filter((l) => l.source && l.target)

  const sim = d3.forceSimulation(simNodes)
    .force('link', d3.forceLink(simLinks).distance(120).strength(0.4))
    .force('charge', d3.forceManyBody().strength(-300))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide(40))
    .stop()

  // Run to completion synchronously (200 ticks is enough to converge)
  sim.tick(200)

  return simNodes.map((n) => ({
    ...n,
    px: n.x ?? n.px,
    py: n.y ?? n.py,
  }))
}
