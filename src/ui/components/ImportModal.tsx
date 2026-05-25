import { useState, useRef } from 'react'
import { db } from '../../data/db'
import { parseClaudeExportZip } from '../../lib/import'
import { Loader } from './Loader'
import type { Conversation } from '../../data/schema'

interface ImportModalProps {
  onClose: () => void
  onImported: (count: number) => void
}

type Phase = 'idle' | 'parsing' | 'writing' | 'done' | 'error'

export function ImportModal({ onClose, onImported }: ImportModalProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.zip')) {
      setErrorMsg('Please select a .zip file (the Claude export from Settings → Privacy → Export data).')
      setPhase('error')
      return
    }

    setPhase('parsing')
    setErrorMsg('')

    try {
      const { conversations, errors } = await parseClaudeExportZip(file)

      setPhase('writing')

      // Upsert all conversations — skip ones that already exist with same id
      const existing = await db.conversations.toCollection().primaryKeys()
      const existingSet = new Set(existing as string[])

      const toWrite: Conversation[] = conversations.filter((c) => !existingSet.has(c.id))
      const skipped = conversations.length - toWrite.length

      if (toWrite.length > 0) {
        await db.conversations.bulkPut(toWrite)
      }

      const final = { imported: toWrite.length, skipped, errors }
      setResult(final)
      setPhase('done')
      onImported(toWrite.length)
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e))
      setPhase('error')
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div className="im-overlay" onClick={onClose}>
      <div className="im-modal" onClick={(e) => e.stopPropagation()}>
        <div className="im-header">
          <p className="im-kicker">Cold start</p>
          <h2 className="im-title">Import Claude export</h2>
          <p className="im-sub">
            Export your conversations from{' '}
            <span className="im-mono">claude.ai → Settings → Privacy → Export data</span>
            . Drop the ZIP here.
          </p>
        </div>

        {(phase === 'idle' || phase === 'error') && (
          <div
            className="im-dropzone"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".zip"
              style={{ display: 'none' }}
              onChange={handleChange}
            />
            <span className="im-drop-icon">↓</span>
            <p className="im-drop-label">Drop claude_export.zip or click to browse</p>
            {phase === 'error' && (
              <p className="im-error">{errorMsg}</p>
            )}
          </div>
        )}

        {phase === 'parsing' && (
          <div className="im-status">
            <Loader size={72} label="Parsing ZIP…" />
          </div>
        )}

        {phase === 'writing' && (
          <div className="im-status">
            <Loader size={72} label="Writing to local database…" />
          </div>
        )}

        {phase === 'done' && result && (
          <div className="im-result">
            <p className="im-result-row">
              <span className="im-result-num">{result.imported}</span>
              <span className="im-result-label">conversations imported</span>
            </p>
            {result.skipped > 0 && (
              <p className="im-result-row">
                <span className="im-result-num" style={{ color: 'var(--ink-faint)' }}>{result.skipped}</span>
                <span className="im-result-label">already in database (skipped)</span>
              </p>
            )}
            {result.errors.length > 0 && (
              <details className="im-errors-detail">
                <summary>{result.errors.length} parse errors</summary>
                {result.errors.map((e, i) => <p key={i} className="im-error">{e}</p>)}
              </details>
            )}
            <p className="im-next-hint">
              Next: run <span className="im-mono">Cluster → Synthesize</span> to build your map.
            </p>
            <button className="im-close-btn" onClick={onClose}>Done</button>
          </div>
        )}

        {phase !== 'done' && (
          <button className="im-cancel" onClick={onClose}>cancel</button>
        )}
      </div>
    </div>
  )
}
