import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useUIStore } from '../../store/ui'
import { useNote } from '../hooks/useNote'
import { db } from '../../data/db'
import { NODES, EDGES, FAMILY_COLORS } from '../../lib/fixtures'
import { MarkdownNote } from '../components/MarkdownNote'
import { InlineLoader } from '../components/Loader'
import { runPipeline } from '../../llm/pipeline'
import type { NoteBlock } from '../../lib/fixtures'
import type { Node } from '../../data/schema'

const FAMILIES: Node['family'][] = ['creative', 'work', 'life', 'admin']

function renderBlock(block: NoteBlock, i: number) {
  switch (block.kind) {
    case 'h': return <p key={i} className="h-note-h">{block.text}</p>
    case 'p': return <p key={i} className="h-note-p">{block.text}</p>
    case 'q': return <blockquote key={i} className="h-note-q">{block.text}</blockquote>
  }
}

// ─── Inline label editor ──────────────────────────────────────────────────────

function EditableTitle({ nodeId, label }: { nodeId: string; label: string }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(label)

  const commit = () => {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== label) {
      db.nodes.update(nodeId, { label: trimmed }).catch(console.error)
    } else {
      setDraft(label) // revert if empty or unchanged
    }
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        className="h-note-title"
        style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--ink-soft)', outline: 'none', width: '100%' }}
        value={draft}
        autoFocus
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') { setDraft(label); setEditing(false) }
        }}
      />
    )
  }

  return (
    <h2
      className="h-note-title"
      title="Click to rename"
      style={{ cursor: 'text' }}
      onClick={() => { setDraft(label); setEditing(true) }}
    >
      {label}
    </h2>
  )
}

// ─── Family picker ────────────────────────────────────────────────────────────

function FamilyPicker({ nodeId, family }: { nodeId: string; family: Node['family'] }) {
  const [open, setOpen] = useState(false)
  const colors = FAMILY_COLORS[family]

  const pick = (f: Node['family']) => {
    db.nodes.update(nodeId, { family: f }).catch(console.error)
    setOpen(false)
  }

  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <span
        className="h-filter-dot"
        style={{ background: colors.dot, cursor: 'pointer', marginRight: 4 }}
        title="Change family"
        onClick={() => setOpen((v) => !v)}
      />
      {open && (
        <span
          style={{
            position: 'absolute', top: 16, left: 0, zIndex: 10,
            background: 'var(--paper)', border: '1px solid var(--ink-soft)',
            borderRadius: 4, padding: '4px 0', minWidth: 96, boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
        >
          {FAMILIES.map((f) => (
            <button
              key={f}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                width: '100%', background: 'none', border: 'none',
                padding: '4px 10px', cursor: 'pointer',
                fontFamily: 'var(--mono)', fontSize: 11,
                color: f === family ? FAMILY_COLORS[f].ink : 'var(--ink)',
                fontWeight: f === family ? 700 : 400,
              }}
              onClick={() => pick(f)}
            >
              <span className="h-filter-dot" style={{ background: FAMILY_COLORS[f].dot }} />
              {f}
            </button>
          ))}
        </span>
      )}
    </span>
  )
}

// ─── Node merge ───────────────────────────────────────────────────────────────

function MergePanel({ nodeId, onDone }: { nodeId: string; onDone: () => void }) {
  const [targetId, setTargetId] = useState('')
  const [merging, setMerging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const allNodes = useLiveQuery(() => db.nodes.toArray(), []) ?? []
  const candidates = allNodes.filter((n) => n.id !== nodeId)

  const doMerge = async () => {
    if (!targetId) return
    setMerging(true)
    setError(null)
    try {
      const [primary, secondary] = await Promise.all([
        db.nodes.get(nodeId),
        db.nodes.get(targetId),
      ])
      if (!primary || !secondary) throw new Error('Node not found')

      // Combine conversation IDs (deduplicate)
      const merged = [...new Set([...primary.conversation_ids, ...secondary.conversation_ids])]

      // Update primary node
      await db.nodes.update(nodeId, { conversation_ids: merged })

      // Delete secondary node's notes + distills, then the node itself
      await db.notes.delete(secondary.id)
      await db.distills.where('node_id').equals(secondary.id).delete()
      await db.nodes.delete(secondary.id)

      console.log(`[Folio] Merged node "${secondary.label}" into "${primary.label}"`)
      onDone()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setMerging(false)
    }
  }

  return (
    <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--paper-deep)', borderRadius: 4, border: '1px solid var(--rule)' }}>
      <p style={{ fontFamily: 'var(--mono)', fontSize: 11, marginBottom: 8, color: 'var(--ink-soft)' }}>
        Merge another node into this one. The other node will be deleted; its conversations join here.
      </p>
      <select
        value={targetId}
        onChange={(e) => setTargetId(e.target.value)}
        style={{
          width: '100%', padding: '4px 6px', marginBottom: 8,
          fontFamily: 'var(--mono)', fontSize: 11,
          background: 'var(--paper)', border: '1px solid var(--rule)', borderRadius: 3, color: 'var(--ink)',
        }}
      >
        <option value="">select node to absorb…</option>
        {candidates.map((n) => (
          <option key={n.id} value={n.id}>{n.label}</option>
        ))}
      </select>
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          className="h-sync"
          disabled={!targetId || merging}
          style={{ opacity: (!targetId || merging) ? 0.5 : 1 }}
          onClick={doMerge}
        >
          {merging ? 'merging…' : '⊕ confirm merge'}
        </button>
        <button className="h-sync" onClick={onDone}>cancel</button>
      </div>
      {error && (
        <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: '#9F1239', marginTop: 6 }}>{error}</p>
      )}
    </div>
  )
}

// ─── NotePanel ────────────────────────────────────────────────────────────────

export function NotePanel() {
  const { selected, setSelected } = useUIStore()
  const result = useNote(selected)
  const [synthesizing, setSynthesizing] = useState(false)
  const [synthError, setSynthError] = useState<string | null>(null)
  const [showMerge, setShowMerge] = useState(false)

  // Live DB node — present when real data exists (for edit controls + related)
  const dbNode = useLiveQuery(() => db.nodes.get(selected), [selected])

  // Related nodes from DB — same family, excluding self
  const dbRelated = useLiveQuery(async () => {
    if (!dbNode) return []
    return db.nodes
      .where('family').equals(dbNode.family)
      .filter((n) => n.id !== selected)
      .limit(5)
      .toArray()
  }, [dbNode, selected]) ?? []

  const handleRegenerate = async () => {
    setSynthesizing(true)
    setSynthError(null)
    try {
      await runPipeline(selected)
    } catch (e) {
      setSynthError(e instanceof Error ? e.message : String(e))
    } finally {
      setSynthesizing(false)
    }
  }

  if (!result) return null

  // Resolve display values
  const fixtureNode = NODES.find((n) => n.id === selected)
  const title = dbNode?.label
    ?? (result.kind === 'markdown' ? (fixtureNode?.label ?? result.nodeId) : result.note.title)
  const family = dbNode?.family ?? fixtureNode?.family ?? 'work'
  const sub = result.kind === 'markdown'
    ? `${dbNode?.conversation_ids.length ?? fixtureNode?.count ?? ''} conversations`
    : result.note.sub
  const colors = FAMILY_COLORS[family]

  // Related IDs: DB same-family for real nodes; EDGES adjacency for fixture
  const relatedIds: string[] = dbNode
    ? dbRelated.map((n) => n.id)
    : (() => {
        const edgeIds = EDGES
          .filter(([a, b]) => a === selected || b === selected)
          .map(([a, b]) => a === selected ? b : a)
        return result.kind === 'fixture' && result.note.related.length
          ? result.note.related
          : edgeIds.slice(0, 5)
      })()

  const isPinned = dbNode?.manual_edits?.pinned ?? false

  return (
    <aside className="h-panel">
      {/* Kicker — family badge, editable when real node exists */}
      <p className="h-note-kicker" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {dbNode
          ? <FamilyPicker nodeId={selected} family={family} />
          : <span className="h-filter-dot" style={{ background: colors.dot, marginRight: 4 }} />
        }
        Node · {family}
        {isPinned && (
          <span
            title="Pinned — click to unpin"
            style={{ marginLeft: 8, cursor: 'pointer', fontSize: 10 }}
            onClick={() => db.nodes.update(selected, { manual_edits: { pinned: false }, position: undefined }).catch(console.error)}
          >
            ⊕ pinned
          </span>
        )}
      </p>

      {/* Title — editable when real node exists */}
      {dbNode
        ? <EditableTitle nodeId={selected} label={title} />
        : <h2 className="h-note-title">{title}</h2>
      }
      <p className="h-note-sub">{sub}</p>

      {result.kind === 'markdown' ? (
        <MarkdownNote markdown={result.markdown} />
      ) : (
        <div>{result.note.body.map(renderBlock)}</div>
      )}

      {/* Actions */}
      <div style={{ marginTop: 20, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          className="h-sync"
          onClick={handleRegenerate}
          disabled={synthesizing}
          style={{ opacity: synthesizing ? 0.6 : 1, cursor: synthesizing ? 'progress' : 'pointer' }}
        >
          {synthesizing ? <><InlineLoader size={14} /> synthesizing…</> : '↻ regenerate'}
        </button>
        {result.kind === 'markdown' && (
          <button
            className="h-sync"
            title="Download as Markdown file"
            onClick={() => {
              const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
              const frontmatter = `---\ntitle: ${title}\nfamily: ${family}\nexported: ${new Date().toISOString().slice(0, 10)}\n---\n\n`
              const blob = new Blob([frontmatter + result.markdown], { type: 'text/markdown' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url; a.download = `${slug}.md`
              a.click()
              URL.revokeObjectURL(url)
            }}
          >
            ↓ export .md
          </button>
        )}
        {dbNode && (
          <button
            className="h-sync"
            title="Merge another node into this one"
            onClick={() => setShowMerge((v) => !v)}
          >
            {showMerge ? '✕ cancel merge' : '⊕ merge node'}
          </button>
        )}
      </div>
      {synthError && (
        <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: '#9F1239', marginTop: 8 }}>
          {synthError}
        </p>
      )}

      {showMerge && dbNode && (
        <MergePanel nodeId={selected} onDone={() => setShowMerge(false)} />
      )}

      {relatedIds.length > 0 && (
        <div className="h-note-related">
          <p className="h-related-label">Related nodes</p>
          {relatedIds.map((id) => {
            const relDbNode = dbRelated.find((n) => n.id === id)
            const relFixNode = NODES.find((n) => n.id === id)
            const relLabel = relDbNode?.label ?? relFixNode?.label ?? id
            const relFamily = relDbNode?.family ?? relFixNode?.family ?? 'work'
            const relColors = FAMILY_COLORS[relFamily]
            return (
              <button key={id} className="h-related-item" onClick={() => setSelected(id)}>
                <span className="h-filter-dot" style={{ background: relColors.dot, marginRight: 8 }} />
                {relLabel}
              </button>
            )
          })}
        </div>
      )}
    </aside>
  )
}

