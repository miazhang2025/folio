import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useUIStore } from '../../store/ui'
import { db } from '../../data/db'
import { generateDispatch } from '../../llm/pipeline'
import { WEEKLY, NODES, FAMILY_COLORS } from '../../lib/fixtures'
import { InlineLoader } from '../components/Loader'
import type { Dispatch, IgnoredAdvice } from '../../data/schema'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function VerdictBadge({ verdict }: { verdict: IgnoredAdvice['verdict'] }) {
  return (
    <span className={`h-verdict h-verdict-${verdict}`}>
      {verdict === 'will-regret' ? 'will regret' : verdict}
    </span>
  )
}

function weekRange(d: Dispatch): string {
  const fmt = (ms: number) =>
    new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  return `${fmt(d.week_start)} – ${fmt(d.week_end)}`
}

// ─── Real-data version ────────────────────────────────────────────────────────

function RealDispatch({ dispatch }: { dispatch: Dispatch }) {
  const { setView, setSelected } = useUIStore()
  const [generating, setGenerating] = useState(false)

  const allNodes = useLiveQuery(() => db.nodes.toArray(), []) ?? []

  const handleRegenerate = async () => {
    setGenerating(true)
    try {
      await generateDispatch(dispatch.week_start, dispatch.week_end, true)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="h-weekly" style={{ gridColumn: '1 / -1' }}>
      <p className="h-weekly-range">{weekRange(dispatch)}</p>
      <h1 className="h-weekly-title">This week in your head</h1>
      <p className="h-weekly-narrative">{dispatch.narrative}</p>

      {/* Active nodes */}
      {dispatch.active_node_ids.length > 0 && (
        <>
          <p className="h-weekly-section-label">Active this week</p>
          <div className="h-weekly-nodes">
            {dispatch.active_node_ids.map((id) => {
              const node = allNodes.find((n) => n.id === id)
              if (!node) return null
              const colors = FAMILY_COLORS[node.family]
              return (
                <button
                  key={id}
                  className="h-weekly-node"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit' }}
                  onClick={() => { setSelected(id); setView('map') }}
                >
                  <span className="h-filter-dot" style={{ background: colors.dot }} />
                  {node.label}
                  {dispatch.emerged_node_ids.includes(id) && (
                    <span className="h-weekly-node-new">✦ new</span>
                  )}
                </button>
              )
            })}
          </div>
        </>
      )}

      {/* Keywords */}
      {dispatch.keywords.length > 0 && (
        <>
          <p className="h-weekly-section-label">Keywords</p>
          <div className="h-weekly-tags">
            {dispatch.keywords.map((kw) => (
              <span key={kw} className="h-weekly-tag">{kw}</span>
            ))}
          </div>
        </>
      )}

      {/* Ignored advice */}
      {dispatch.ignored_advice.length > 0 && (
        <>
          <p className="h-weekly-section-label">You asked Claude, then ignored Claude</p>
          <table className="h-ignored-table">
            <thead>
              <tr>
                <th>Day</th>
                <th>You asked</th>
                <th>Claude said</th>
                <th>You did</th>
                <th>Verdict</th>
              </tr>
            </thead>
            <tbody>
              {dispatch.ignored_advice.map((row, i) => (
                <tr key={i}>
                  <td className="h-ignored-day">{row.day}</td>
                  <td>{row.q}</td>
                  <td style={{ fontStyle: 'italic', color: 'var(--ink-soft)' }}>{row.advice}</td>
                  <td>{row.mia}</td>
                  <td><VerdictBadge verdict={row.verdict} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button className="h-filter" style={{ fontFamily: 'var(--mono)', fontSize: 11 }} onClick={() => setView('map')}>
          ← back to map
        </button>
        <button
          className="h-filter"
          style={{ fontFamily: 'var(--mono)', fontSize: 11, opacity: generating ? 0.5 : 1 }}
          disabled={generating}
          onClick={handleRegenerate}
        >
          {generating ? <><InlineLoader size={14} /> generating…</> : '↺ regenerate'}
        </button>
      </div>
    </div>
  )
}

// ─── Fixture fallback version ─────────────────────────────────────────────────

function FixtureDispatch() {
  const { setView, setSelected } = useUIStore()
  const [generating, setGenerating] = useState(false)

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      await generateDispatch()
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="h-weekly" style={{ gridColumn: '1 / -1' }}>
      <p className="h-weekly-range">{WEEKLY.range}</p>
      <h1 className="h-weekly-title">This week in your head</h1>
      <p className="h-weekly-narrative">{WEEKLY.narrative}</p>

      <p className="h-weekly-section-label">Active this week</p>
      <div className="h-weekly-nodes">
        {WEEKLY.active.map((id) => {
          const node = NODES.find((n) => n.id === id)
          if (!node) return null
          const colors = FAMILY_COLORS[node.family]
          return (
            <button
              key={id}
              className="h-weekly-node"
              style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit' }}
              onClick={() => { setSelected(id); setView('map') }}
            >
              <span className="h-filter-dot" style={{ background: colors.dot }} />
              {node.label}
              {WEEKLY.emerged.includes(id) && (
                <span className="h-weekly-node-new">✦ new</span>
              )}
            </button>
          )
        })}
      </div>

      <p className="h-weekly-section-label">Keywords</p>
      <div className="h-weekly-tags">
        {WEEKLY.keywords.map((kw) => (
          <span key={kw} className="h-weekly-tag">{kw}</span>
        ))}
      </div>

      <p className="h-weekly-section-label">You asked Claude, then ignored Claude</p>
      <table className="h-ignored-table">
        <thead>
          <tr>
            <th>Day</th>
            <th>You asked</th>
            <th>Claude said</th>
            <th>You did</th>
            <th>Verdict</th>
          </tr>
        </thead>
        <tbody>
          {WEEKLY.ignored.map((row, i) => (
            <tr key={i}>
              <td className="h-ignored-day">{row.day}</td>
              <td>{row.q}</td>
              <td style={{ fontStyle: 'italic', color: 'var(--ink-soft)' }}>{row.advice}</td>
              <td>{row.mia}</td>
              <td><VerdictBadge verdict={row.verdict} /></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button className="h-filter" style={{ fontFamily: 'var(--mono)', fontSize: 11 }} onClick={() => setView('map')}>
          ← back to map
        </button>
        <button
          className="h-filter"
          style={{ fontFamily: 'var(--mono)', fontSize: 11, opacity: generating ? 0.5 : 1 }}
          disabled={generating}
          onClick={handleGenerate}
        >
          {generating ? <><InlineLoader size={14} /> generating…</> : '✦ generate real dispatch'}
        </button>
      </div>
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export function DispatchView() {
  // Get the most recent dispatch (highest week_start)
  const latestDispatch = useLiveQuery(async () => {
    const all = await db.dispatches.toArray()
    if (!all.length) return null
    return all.reduce((best, d) => d.week_start > best.week_start ? d : best)
  }, [])

  if (latestDispatch) return <RealDispatch dispatch={latestDispatch} />
  return <FixtureDispatch />
}
