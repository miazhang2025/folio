import { useState } from 'react'
import { clusterWithClaude } from '../../clustering/cluster'
import { runPipelineAll } from '../../llm/pipeline'

type Phase = 'idle' | 'clustering' | 'synthesizing' | 'done' | 'error'

interface BuildMapPanelProps {
  conversationCount: number
}

/**
 * Shown in the NotePanel area when the DB has conversations but no nodes.
 * Walks the user through cluster → synthesize.
 */
export function BuildMapPanel({ conversationCount }: BuildMapPanelProps) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [progress, setProgress] = useState('')
  const [nodeCount, setNodeCount] = useState(0)
  const [error, setError] = useState('')

  const handleBuild = async () => {
    setPhase('clustering')
    setError('')
    try {
      const nodes = await clusterWithClaude((msg) => setProgress(msg))
      setNodeCount(nodes.length)

      setPhase('synthesizing')
      await runPipelineAll((d, total, label) => {
        setProgress(label ? `Synthesizing "${label}" (${d + 1}/${total})…` : 'Done')
      })

      setPhase('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setPhase('error')
    }
  }

  return (
    <aside className="h-panel">
      <p className="h-note-kicker">Ready to build</p>
      <h2 className="h-note-title" style={{ fontSize: 22 }}>
        {conversationCount} conversations imported
      </h2>
      <p className="h-note-sub">
        Run clustering + synthesis to generate your knowledge map.
        This will use your Anthropic API key and cost roughly $0.02–0.05 per node.
      </p>

      {phase === 'idle' && (
        <button className="im-close-btn" style={{ marginTop: 16 }} onClick={handleBuild}>
          Build map →
        </button>
      )}

      {(phase === 'clustering' || phase === 'synthesizing') && (
        <div style={{ marginTop: 16 }}>
          <p className="h-note-h">
            {phase === 'clustering' ? 'Clustering…' : `Synthesizing ${nodeCount} nodes…`}
          </p>
          <p className="h-note-p" style={{ fontSize: 13, color: 'var(--ink-faint)', marginTop: 8 }}>
            {progress}
          </p>
        </div>
      )}

      {phase === 'done' && (
        <div style={{ marginTop: 16 }}>
          <p className="h-note-p">
            Map built — {nodeCount} nodes. Refresh the page to see your real knowledge map.
          </p>
          <button
            className="im-close-btn"
            style={{ marginTop: 12 }}
            onClick={() => window.location.reload()}
          >
            View map
          </button>
        </div>
      )}

      {phase === 'error' && (
        <div style={{ marginTop: 16 }}>
          <p className="im-error">{error}</p>
          <button className="im-close-btn" style={{ marginTop: 12 }} onClick={handleBuild}>
            Retry
          </button>
        </div>
      )}

      <p className="h-note-sub" style={{ marginTop: 24, fontSize: 12 }}>
        Make sure <span className="im-mono">VITE_ANTHROPIC_KEY</span> is set in your{' '}
        <span className="im-mono">.env.local</span> file.
      </p>
    </aside>
  )
}
