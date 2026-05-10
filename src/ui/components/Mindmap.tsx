import { useCallback, useEffect, useRef, useState } from 'react'
import { useUIStore } from '../../store/ui'
import { db } from '../../data/db'
import { FAMILY_COLORS, RECENCY_OPACITY } from '../../lib/fixtures'
import { computeForceLayout } from '../../clustering/layout'
import type { FixtureNode, EdgePair } from '../../lib/fixtures'
import type { LayoutNode } from '../../clustering/layout'

interface MindmapProps {
  nodes: FixtureNode[]
  edges: EdgePair[]
}

interface DragState {
  id: string
  startClientX: number
  startClientY: number
}

interface Viewport { x: number; y: number; scale: number }
interface PanStart { startX: number; startY: number; startVpX: number; startVpY: number }

const DRAG_THRESHOLD = 5   // px before a move is treated as a drag
const SCALE_MIN = 0.15
const SCALE_MAX = 4
const LERP = 0.12          // fraction to move each frame (lower = smoother/slower)

export function Mindmap({ nodes, edges }: MindmapProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [dims, setDims] = useState({ w: 900, h: 640 })
  const [layoutNodes, setLayoutNodes] = useState<LayoutNode[]>([])
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, scale: 1 })
  const [isPanning, setIsPanning] = useState(false)
  // Target viewport that we lerp toward each rAF tick
  const targetVpRef = useRef<Viewport>({ x: 0, y: 0, scale: 1 })
  const currentVpRef = useRef<Viewport>({ x: 0, y: 0, scale: 1 })
  const rafRef = useRef<number | null>(null)
  const panStartRef = useRef<PanStart | null>(null)
  // Ref tracks whether the current press crossed the drag threshold —
  // checked in onClick to distinguish click from drag-release.
  const dragMovedRef = useRef(false)
  const { selected, hover, setSelected, setHover } = useUIStore()

  // Measure container
  useEffect(() => {
    const measure = () => {
      if (!wrapRef.current) return
      const r = wrapRef.current.getBoundingClientRect()
      if (r.width > 0 && r.height > 0) setDims({ w: r.width, h: r.height })
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (wrapRef.current) ro.observe(wrapRef.current)
    return () => ro.disconnect()
  }, [])

  // Recompute D3-force layout whenever nodes or dims change
  useEffect(() => {
    if (!nodes.length || dims.w < 100) return
    const layout = computeForceLayout(nodes, edges, dims.w, dims.h)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- D3 layout sync
    setLayoutNodes(layout)
  }, [nodes, edges, dims])

  // ── Lerp animation loop ───────────────────────────────────────────────────
  useEffect(() => {
    const tick = () => {
      const t = targetVpRef.current
      const c = currentVpRef.current
      const dx = t.x - c.x
      const dy = t.y - c.y
      const ds = t.scale - c.scale
      const eps = 0.0005
      if (Math.abs(dx) > eps || Math.abs(dy) > eps || Math.abs(ds) > eps) {
        const next = {
          x:     c.x     + dx * LERP,
          y:     c.y     + dy * LERP,
          scale: c.scale + ds * LERP,
        }
        currentVpRef.current = next
        setViewport(next)
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current != null) cancelAnimationFrame(rafRef.current) }
  }, [])

  // ── Pinch/wheel zoom ──────────────────────────────────────────────────────
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      const delta = e.deltaY < 0 ? 1.1 : 0.9
      const vp = targetVpRef.current
      const newScale = Math.min(SCALE_MAX, Math.max(SCALE_MIN, vp.scale * delta))
      const ratio = newScale / vp.scale
      targetVpRef.current = {
        scale: newScale,
        x: mx - ratio * (mx - vp.x),
        y: my - ratio * (my - vp.y),
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // ── Convert client coords → canvas coords (accounting for viewport) ──────
  const toCanvasCoords = useCallback((clientX: number, clientY: number) => {
    if (!wrapRef.current) return { x: 0, y: 0 }
    const rect = wrapRef.current.getBoundingClientRect()
    const mx = clientX - rect.left
    const my = clientY - rect.top
    // Use current (rendered) viewport for accurate hit position
    const vp = currentVpRef.current
    return {
      x: (mx - vp.x) / vp.scale,
      y: (my - vp.y) / vp.scale,
    }
  }, [])

  // ── SVG background pan (mousedown on SVG background, not on a node) ──────
  const handleSVGMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (e.target !== svgRef.current && (e.target as SVGElement).closest('.h-node')) return
    panStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startVpX: targetVpRef.current.x,
      startVpY: targetVpRef.current.y,
    }
    dragMovedRef.current = false
    setIsPanning(true)
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    // ── Node drag ──
    if (dragState) {
      const dx = e.clientX - dragState.startClientX
      const dy = e.clientY - dragState.startClientY
      if (Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD) return
      dragMovedRef.current = true
      const { x, y } = toCanvasCoords(e.clientX, e.clientY)
      setLayoutNodes((prev) =>
        prev.map((n) => n.id === dragState.id ? { ...n, px: x, py: y } : n),
      )
      return
    }
    // ── Canvas pan ──
    if (panStartRef.current) {
      const dx = e.clientX - panStartRef.current.startX
      const dy = e.clientY - panStartRef.current.startY
      if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) dragMovedRef.current = true
      targetVpRef.current = {
        ...targetVpRef.current,
        x: panStartRef.current.startVpX + dx,
        y: panStartRef.current.startVpY + dy,
      }
    }
  }, [dragState, toCanvasCoords])

  const handleMouseUp = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (dragState && dragMovedRef.current) {
      // Persist pinned node position; silently ignore fixture nodes
      const { x, y } = toCanvasCoords(e.clientX, e.clientY)
      db.nodes.update(dragState.id, {
        position: { x: x / dims.w, y: y / dims.h },
        manual_edits: { pinned: true },
      }).catch(() => {})
    }
    setDragState(null)
    panStartRef.current = null
    setIsPanning(false)
  }, [dragState, toCanvasCoords, dims])

  const handleZoomIn = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    const vp = targetVpRef.current
    targetVpRef.current = { ...vp, scale: Math.min(SCALE_MAX, vp.scale * 1.25) }
  }, [])

  const handleZoomOut = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    const vp = targetVpRef.current
    targetVpRef.current = { ...vp, scale: Math.max(SCALE_MIN, vp.scale * 0.8) }
  }, [])

  const handleZoomReset = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    targetVpRef.current = { x: 0, y: 0, scale: 1 }
  }, [])

  const nodeIds = new Set(nodes.map((n) => n.id))
  const visibleEdges = edges.filter(([a, b]) => nodeIds.has(a) && nodeIds.has(b))

  const activeId = hover ?? selected
  const connectedIds = new Set(
    visibleEdges
      .filter(([a, b]) => a === activeId || b === activeId)
      .flatMap(([a, b]) => [a, b]),
  )

  const posMap = new Map(layoutNodes.map((n) => [n.id, { x: n.px, y: n.py }]))
  const pos = (n: FixtureNode) =>
    posMap.get(n.id) ?? { x: n.x * dims.w, y: n.y * dims.h }

  const isPinned = (id: string) => layoutNodes.find((n) => n.id === id)?.position != null

  // Cursor: grabbing when dragging a node or panning; grab when hovering background
  const svgCursor = (dragState || isPanning) ? 'grabbing' : 'grab'

  return (
    <div ref={wrapRef} className="h-canvas" style={{ overflow: 'hidden' }}>
      <svg
        ref={svgRef}
        className="h-svg"
        width={dims.w}
        height={dims.h}
        style={{ cursor: svgCursor }}
        onMouseDown={handleSVGMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Viewport transform group */}
        <g transform={`translate(${viewport.x},${viewport.y}) scale(${viewport.scale})`}>
          {/* Edges */}
          <g>
            {visibleEdges.map(([a, b]) => {
              const na = nodes.find((n) => n.id === a)
              const nb = nodes.find((n) => n.id === b)
              if (!na || !nb) return null
              const pa = pos(na), pb = pos(nb)
              const isLit = connectedIds.has(a) && connectedIds.has(b)
              const isDim = hover != null && !isLit
              return (
                <line
                  key={`${a}-${b}`}
                  className={`h-edge${isDim ? ' dim' : ''}${isLit ? ' lit' : ''}`}
                  x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y}
                />
              )
            })}
          </g>

          {/* Nodes */}
          <g>
            {nodes.map((n) => {
              const { x, y } = pos(n)
              const colors = FAMILY_COLORS[n.family] ?? FAMILY_COLORS.creative
              const opacity = RECENCY_OPACITY[n.recency] ?? 1
              const isSelected = n.id === selected
              const isDragging = dragState?.id === n.id
              const dotR = 6 + Math.min(n.count * 0.35, 8)
              const ringR = dotR + 8

              return (
                <g
                  key={n.id}
                  className={`h-node${isSelected ? ' selected' : ''}`}
                  transform={`translate(${x},${y})`}
                  opacity={opacity}
                  style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                  onMouseDown={(e) => {
                    e.stopPropagation()
                    panStartRef.current = null
                    dragMovedRef.current = false
                    setDragState({ id: n.id, startClientX: e.clientX, startClientY: e.clientY })
                  }}
                  onClick={() => {
                    if (!dragMovedRef.current) setSelected(n.id)
                  }}
                  onMouseEnter={() => setHover(n.id)}
                  onMouseLeave={() => setHover(null)}
                >
                  <circle
                    className="h-node-pulse"
                    r={ringR}
                    fill={colors.ring}
                    fillOpacity={isSelected ? 0.5 : 0.2}
                  />
                  <circle className="h-node-dot" r={dotR} fill={colors.dot} />
                  {isPinned(n.id) && (
                    <text
                      style={{ fontSize: 7, fill: colors.ink, userSelect: 'none', pointerEvents: 'none' }}
                      x={0} y={-dotR - 4} textAnchor="middle"
                    >
                      ⊕
                    </text>
                  )}
                  <text className="h-node-label" x={dotR + 6} y={4}>
                    {n.label}
                  </text>
                  <text className="h-node-meta" x={dotR + 6} y={16}>
                    {n.count} convs
                  </text>
                </g>
              )
            })}
          </g>
        </g>

        {/* Zoom controls — fixed in SVG space, top-right corner */}
        <g transform={`translate(${dims.w - 56}, 16)`} style={{ pointerEvents: 'all' }}>
          <g transform="translate(0,0)" onClick={handleZoomIn} style={{ cursor: 'pointer' }}>
            <rect width={28} height={26} rx={3} fill="var(--paper)" stroke="var(--rule)" strokeWidth={1} fillOpacity={0.92} />
            <text x={14} y={17} textAnchor="middle" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fill: 'var(--ink)', userSelect: 'none', pointerEvents: 'none' }}>+</text>
          </g>
          <g transform="translate(0,32)" onClick={handleZoomOut} style={{ cursor: 'pointer' }}>
            <rect width={28} height={26} rx={3} fill="var(--paper)" stroke="var(--rule)" strokeWidth={1} fillOpacity={0.92} />
            <text x={14} y={17} textAnchor="middle" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fill: 'var(--ink)', userSelect: 'none', pointerEvents: 'none' }}>−</text>
          </g>
          <g transform="translate(0,64)" onClick={handleZoomReset} style={{ cursor: 'pointer' }}>
            <rect width={28} height={26} rx={3} fill="var(--paper)" stroke="var(--rule)" strokeWidth={1} fillOpacity={0.92} />
            <text x={14} y={17} textAnchor="middle" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fill: 'var(--ink)', userSelect: 'none', pointerEvents: 'none' }}>⌂</text>
          </g>
        </g>
      </svg>
    </div>
  )
}
