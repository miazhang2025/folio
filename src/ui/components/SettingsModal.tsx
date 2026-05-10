import { useState, useEffect } from 'react'

interface SettingsModalProps {
  onClose: () => void
}

const STORAGE_KEY = 'anthropic_api_key'

function readKey(): string {
  if (typeof chrome !== 'undefined' && chrome.storage) return ''
  return localStorage.getItem(STORAGE_KEY) ?? ''
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const [key, setKey] = useState(readKey)
  const [saved, setSaved] = useState(false)
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(STORAGE_KEY).then((res) => {
        setKey((res[STORAGE_KEY] as string) ?? '')
      })
    }
  }, [])

  function handleSave() {
    const trimmed = key.trim()
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ [STORAGE_KEY]: trimmed })
    } else {
      localStorage.setItem(STORAGE_KEY, trimmed)
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function handleClear() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.remove(STORAGE_KEY)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
    setKey('')
    setSaved(false)
  }

  const masked = key ? key.slice(0, 10) + '·'.repeat(12) + key.slice(-4) : ''

  return (
    <div className="im-overlay" onClick={onClose}>
      <div className="im-modal" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
        <button className="im-cancel" onClick={onClose}>close</button>

        <div className="im-header">
          <p className="im-kicker">Configuration</p>
          <h2 className="im-title">Settings</h2>
        </div>

        {/* ── API Key ── */}
        <div style={{
          padding: '16px 18px',
          background: 'var(--paper-deep)',
          border: '1px solid var(--rule)',
          borderRadius: 2,
          marginBottom: 20,
        }}>
          <p style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--accent)',
            marginBottom: 8,
          }}>
            Anthropic API Key
          </p>
          <p style={{
            fontFamily: "'Newsreader', serif",
            fontSize: 14,
            color: 'var(--ink-soft)',
            lineHeight: 1.5,
            marginBottom: 14,
          }}>
            Used locally for clustering and note synthesis.
            Stored in your browser — never sent anywhere except Anthropic's API.
          </p>

          {/* Current key preview */}
          {key && !show && (
            <p style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              color: 'var(--ink-faint)',
              marginBottom: 10,
              letterSpacing: '0.06em',
            }}>
              {masked}
            </p>
          )}

          <input
            type={show ? 'text' : 'password'}
            placeholder="sk-ant-..."
            value={key}
            onChange={(e) => { setKey(e.target.value); setSaved(false) }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
            autoComplete="off"
            spellCheck={false}
            style={{
              width: '100%',
              padding: '8px 10px',
              marginBottom: 12,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
              background: 'var(--paper)',
              border: '1px solid var(--rule)',
              borderRadius: 3,
              color: 'var(--ink)',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              className="im-close-btn"
              onClick={handleSave}
              disabled={!key.trim()}
              style={{ opacity: key.trim() ? 1 : 0.45 }}
            >
              {saved ? '✓ saved' : 'save key'}
            </button>
            <button
              onClick={() => setShow((v) => !v)}
              style={{
                background: 'none',
                border: '1px solid var(--rule)',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--ink-soft)',
                padding: '7px 12px',
                cursor: 'pointer',
                borderRadius: 2,
              }}
            >
              {show ? 'hide' : 'show'}
            </button>
            {key && (
              <button
                onClick={handleClear}
                style={{
                  background: 'none',
                  border: 'none',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--ink-faint)',
                  padding: '7px 0',
                  cursor: 'pointer',
                }}
              >
                clear
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
