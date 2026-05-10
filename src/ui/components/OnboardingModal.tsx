import { useState } from 'react'

type Step = 'welcome' | 'api-key' | 'get-data'
const STEPS: Step[] = ['welcome', 'api-key', 'get-data']

interface Props {
  onClose: () => void
  onImport: () => void
}

/**
 * Three-step onboarding modal shown when the DB is empty and the user
 * hasn't dismissed it before. Writes `folio_onboarded=1` to localStorage
 * on any close/skip so it never shows again.
 */
export function OnboardingModal({ onClose, onImport }: Props) {
  const [step, setStep] = useState<Step>('welcome')
  const [apiKey, setApiKey] = useState('')
  const [keySaved, setKeySaved] = useState(false)

  const dismiss = () => {
    localStorage.setItem('folio_onboarded', '1')
    onClose()
  }

  const saveKey = () => {
    const trimmed = apiKey.trim()
    if (!trimmed) return
    localStorage.setItem('anthropic_api_key', trimmed)
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set({ anthropic_api_key: trimmed }).catch(() => {})
      }
    } catch { /* extension context not available */ }
    setKeySaved(true)
  }

  const stepIndex = STEPS.indexOf(step)

  return (
    <div className="im-overlay" onClick={dismiss}>
      <div
        className="im-modal"
        style={{ maxWidth: 460, width: 'min(460px, 92vw)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="im-cancel" onClick={dismiss}>skip</button>

        {/* Progress bar */}
        <div style={{ display: 'flex', gap: 5, marginBottom: 30 }}>
          {STEPS.map((s, i) => (
            <span
              key={s}
              style={{
                flex: 1, height: 3, borderRadius: 1,
                background: i <= stepIndex ? 'var(--accent)' : 'var(--rule)',
                transition: 'background 0.2s ease',
              }}
            />
          ))}
        </div>

        {/* ── Step 1: Welcome ── */}
        {step === 'welcome' && (
          <>
            <div className="im-header">
              <p className="im-kicker">Welcome to Folio</p>
              <h2 className="im-title" style={{ fontSize: 28, lineHeight: 1.2 }}>
                Your Claude conversations,<br />as a knowledge map.
              </h2>
              <p className="im-sub" style={{ marginTop: 12 }}>
                Folio reads your conversations and grows them into a living map — nodes per topic,
                synthesis notes per node, weekly dispatches.
              </p>
            </div>
            <button className="im-close-btn" onClick={() => setStep('api-key')}>
              get started →
            </button>
          </>
        )}

        {/* ── Step 2: API key ── */}
        {step === 'api-key' && (
          <>
            <div className="im-header">
              <p className="im-kicker">Step 1 of 2 — API key</p>
              <h2 className="im-title">Connect to Claude</h2>
              <p className="im-sub">
                Folio uses your Anthropic API key to synthesize notes. It stays in your browser —
                never sent to any server.
              </p>
            </div>
            <input
              type="password"
              placeholder="sk-ant-..."
              value={apiKey}
              autoFocus
              onChange={(e) => { setApiKey(e.target.value); setKeySaved(false) }}
              onKeyDown={(e) => { if (e.key === 'Enter') { saveKey(); setStep('get-data') } }}
              style={{
                width: '100%',
                padding: '8px 10px',
                marginBottom: 12,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 12,
                background: 'var(--paper-deep)',
                border: '1px solid var(--rule)',
                borderRadius: 3,
                color: 'var(--ink)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {keySaved && (
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--moss)', marginBottom: 10 }}>
                ✓ saved
              </p>
            )}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button
                className="im-close-btn"
                onClick={() => { saveKey(); setStep('get-data') }}
              >
                save & continue →
              </button>
              <button
                style={{
                  background: 'none', border: 'none',
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: 'var(--ink-faint)', cursor: 'pointer',
                }}
                onClick={() => setStep('get-data')}
              >
                skip for now
              </button>
            </div>
          </>
        )}

        {/* ── Step 3: Get data ── */}
        {step === 'get-data' && (
          <>
            <div className="im-header">
              <p className="im-kicker">Step 2 of 2 — Import</p>
              <h2 className="im-title">Get your conversations in</h2>
              <p className="im-sub">Two ways to feed Folio your Claude history.</p>
            </div>

            {/* Option A — ZIP */}
            <div style={{
              padding: '14px 16px', background: 'var(--paper-deep)',
              border: '1px solid var(--rule)', borderRadius: 2, marginBottom: 10,
            }}>
              <p style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                letterSpacing: '0.14em', textTransform: 'uppercase',
                color: 'var(--accent)', marginBottom: 6,
              }}>
                Option A — instant
              </p>
              <p style={{
                fontFamily: "'Newsreader', serif", fontSize: 14,
                color: 'var(--ink)', lineHeight: 1.5, marginBottom: 12,
              }}>
                In Claude, go to <span className="im-mono">Settings → Privacy → Export data</span>.
                Download the <span className="im-mono">claude_export.zip</span> and import it here.
              </p>
              <button
                className="im-close-btn"
                onClick={() => { dismiss(); onImport() }}
              >
                ↑ import zip
              </button>
            </div>

            {/* Option B — Extension */}
            <div style={{
              padding: '14px 16px', background: 'var(--paper-deep)',
              border: '1px solid var(--rule)', borderRadius: 2, marginBottom: 24,
            }}>
              <p style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                letterSpacing: '0.14em', textTransform: 'uppercase',
                color: 'var(--ink-soft)', marginBottom: 6,
              }}>
                Option B — live sync
              </p>
              <p style={{
                fontFamily: "'Newsreader', serif", fontSize: 14,
                color: 'var(--ink)', lineHeight: 1.5,
              }}>
                Install the Folio Chrome extension. It intercepts claude.ai in the background and
                syncs new conversations automatically.
              </p>
            </div>

            <button
              style={{
                background: 'none', border: 'none',
                fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                color: 'var(--ink-faint)', cursor: 'pointer',
              }}
              onClick={dismiss}
            >
              I'll do this later
            </button>
          </>
        )}
      </div>
    </div>
  )
}
