import { useEffect, useState } from 'react'
import './styles/folio.css'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../data/db'
import { useUIStore } from '../store/ui'
import { SyncButton } from './components/SyncButton'
import { MapView } from './views/MapView'
import { DispatchView } from './views/DispatchView'
import { NotePanel } from './views/NotePanel'
import { ImportModal } from './components/ImportModal'
import { BuildMapPanel } from './components/BuildMapPanel'
import { SettingsModal } from './components/SettingsModal'
import { OnboardingModal } from './components/OnboardingModal'
import { exportVault } from '../lib/vault'

export default function App() {
  const { view, setView, selected, setSelected } = useUIStore()
  const [showImport, setShowImport] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [exportingVault, setExportingVault] = useState(false)
  // Onboarding: shown once when DB is empty and not previously dismissed
  const [onboardingDone, setOnboardingDone] = useState(
    () => !!localStorage.getItem('folio_onboarded'),
  )

  // Detect "conversations imported but no nodes yet" state
  const convCountRaw = useLiveQuery(() => db.conversations.count(), [])
  const nodeCountRaw = useLiveQuery(() => db.nodes.count(), [])

  // Auto-select first real DB node when the currently-selected ID is a fixture placeholder
  const firstRealNode = useLiveQuery(
    () => (nodeCountRaw ?? 0) > 0 ? db.nodes.limit(1).first() : undefined,
    [nodeCountRaw],
  )
  const selectedIsReal = useLiveQuery(
    () => db.nodes.get(selected).then((n) => !!n),
    [selected],
  )
  useEffect(() => {
    if (firstRealNode && selectedIsReal === false) {
      setSelected(firstRealNode.id)
    }
  }, [firstRealNode, selectedIsReal, setSelected])
  const convCount = convCountRaw ?? 0
  const nodeCount = nodeCountRaw ?? 0
  const needsMapBuild = convCount > 0 && nodeCount === 0

  // Show onboarding only after DB queries have resolved (not undefined) and DB is empty
  const showOnboarding =
    convCountRaw !== undefined && nodeCountRaw !== undefined &&
    convCount === 0 && nodeCount === 0 && !onboardingDone

  const handleExportVault = async () => {
    setExportingVault(true)
    try { await exportVault() }
    finally { setExportingVault(false) }
  }

  return (
    <>
      {/* ─── Header ─── */}
      <header className="h-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          <img
            src="/favicon.svg"
            alt=""
            aria-hidden="true"
            style={{ width: 28, height: 28, marginRight: 10, flexShrink: 0 }}
          />
          <span className="h-brand">Folio</span>
          <span className="h-brand-sub">knowledge map</span>
          <SyncButton />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            className="h-sync"
            onClick={() => setShowImport(true)}
            aria-label="Import Claude export ZIP"
          >
            ↑ import zip
          </button>
          <button
            className="h-sync"
            onClick={handleExportVault}
            disabled={exportingVault}
            aria-label="Export vault as ZIP"
            style={{ opacity: exportingVault ? 0.6 : 1 }}
          >
            {exportingVault ? 'exporting…' : '↓ export vault'}
          </button>
          <button
            className="h-sync"
            onClick={() => setShowSettings(true)}
            aria-label="Settings"
            title="Settings (API key)"
          >
            ⚙
          </button>
          <nav className="h-toolbar">
            <button
              className={`h-tab${view === 'map' ? ' active' : ''}`}
              onClick={() => setView('map')}
            >
              Map
            </button>
            <button
              className={`h-tab${view === 'weekly' ? ' active' : ''}`}
              onClick={() => setView('weekly')}
            >
              Dispatch
            </button>
          </nav>
        </div>
      </header>

      {/* ─── Body ─── */}
      {view === 'map' ? (
        <div className="h-body">
          <MapView />
          {needsMapBuild
            ? <BuildMapPanel conversationCount={convCount} />
            : <NotePanel />
          }
        </div>
      ) : (
        <div className="h-body">
          <DispatchView />
        </div>
      )}

      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onImported={(count) => {
            console.log(`Imported ${count} conversations`)
            setShowImport(false)
          }}
        />
      )}

      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}

      {showOnboarding && (
        <OnboardingModal
          onClose={() => setOnboardingDone(true)}
          onImport={() => setShowImport(true)}
        />
      )}
    </>
  )
}
