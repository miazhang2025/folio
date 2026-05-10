import { useSync } from '../hooks/useSync'

export function SyncButton() {
  const { syncState, lastSync, handleSync } = useSync()

  const cls = [
    'h-sync',
    syncState === 'syncing' ? 'h-sync-syncing' : '',
    syncState === 'done'    ? 'h-sync-done'    : '',
  ].join(' ')

  return (
    <button className={cls} onClick={handleSync} aria-label="Sync conversations">
      <svg className="h-sync-icon" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M10.5 6A4.5 4.5 0 1 1 6 1.5" strokeLinecap="round"/>
        <polyline points="10.5,1.5 10.5,5 7,5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      {syncState === 'syncing' ? 'syncing…'
       : syncState === 'done'  ? 'synced'
       : `sync · ${lastSync}`}
    </button>
  )
}
