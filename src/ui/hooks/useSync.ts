import { useSyncStore } from '../../store/sync'

/**
 * Triggers a sync cycle.
 * - In extension context: sends SYNC to the background worker, which
 *   opens/focuses claude.ai so the fetch interceptor fires.
 * - In standalone web context: simulates (no extension available).
 */
export function useSync() {
  const { syncState, lastSync, startSync, finishSync } = useSyncStore()

  const handleSync = () => {
    if (syncState === 'syncing') return
    startSync()

    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ type: 'SYNC' }, () => {
        // Background acknowledges; finish after a short beat to let
        // the intercepted fetch calls trickle in before resetting state.
        setTimeout(finishSync, 2000)
      })
    } else {
      // Standalone web — simulate
      setTimeout(finishSync, 1800)
    }
  }

  return { syncState, lastSync, handleSync }
}
