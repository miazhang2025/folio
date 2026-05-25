import { useState } from 'react'
import { clusterWithClaude } from '../../clustering/cluster'
import { runPipelineAll } from '../../llm/pipeline'
import { Loader } from './Loader'

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
  const [synthResult, setSynthResult] = useState<{ succeeded: number; failed: number; failedIds: string[] } | null>(null)
  const [error, setError] = useState('')

  const handleBuild = async () => {
    setPhase('clustering')
    setError('')
    try {
      const nodes = await clusterWithClaude((msg) => setProgress(msg))
      setNodeCount(nodes.length)

      setPhase('synthesizing')
      const result = await runPipelineAll((d, total, label) => {
        setProgress(label ? `Synthesizing "${label}" (${d + 1}/${total})…` : 'Done')
      })
      setSynthResult(result)

      setPhase('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setPhase('error')
    }
  }

  const handleRetry = async () => {
    if (!synthResult?.failedIds.length) return
    setPhase('synthesizing')
    setProgress('')
    setError('')
    const retryIds = synthResult.failedIds
    try {
      const result = await runPipelineAll((d, total, label) => {
        setProgress(label ? `Retrying "${label}" (${d + 1}/${total})…` : 'Done')
      }, retryIds)
      setSynthResult({
        succeeded: synthResult.succeeded + result.succeeded,
        failed: result.failed,
        failedIds: result.failedIds,
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
        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <Loader size={80} />
          <p className="h-note-h" style={{ margin: 0 }}>
            {phase === 'clustering' ? 'Clustering…' : `Synthesizing ${nodeCount} nodes…`}
          </p>
          {progress && (
            <p className="h-note-p" style={{ fontSize: 12, color: 'var(--ink-faint)', margin: 0 }}>
              {progress}
            </p>
          )}
        </div>
      )}

      {phase === 'done' && (
        <div style={{ marginTop: 16 }}>
          <p className="h-note-p">
            Map built — {nodeCount} nodes.{' '}
            {synthResult && synthResult.failed === 0
              ? 'All notes synthesized.'
              : synthResult
                ? `${synthResult.succeeded}/${nodeCount} notes synthesized.`
                : ''}
          </p>
          {synthResult && synthResult.failedIds.length > 0 && (
            <p className="h-note-sub" style={{ marginTop: 6, color: 'var(--ink-faint)', fontSize: 12 }}>
              {synthResult.failed} node{synthResult.failed > 1 ? 's' : ''} failed — likely a rate limit or API error.
            </p>
          )}
          <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
            {synthResult && synthResult.failedIds.length > 0 && (
              <button className="im-close-btn" onClick={handleRetry}>
                Retry {synthResult.failed} failed →
              </button>
            )}
            <button className="im-close-btn" onClick={() => window.location.reload()}>
              View map
            </button>
          </div>
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
        No API key set? Open <strong>Settings ⚙</strong> in the top-right corner.
      </p>
    </aside>
  )
}
