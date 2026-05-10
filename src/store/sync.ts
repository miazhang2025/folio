import { create } from 'zustand'

type SyncState = 'idle' | 'syncing' | 'done'

interface SyncStore {
  syncState: SyncState
  lastSync: string
  startSync: () => void
  finishSync: () => void
}

export const useSyncStore = create<SyncStore>((set) => ({
  syncState: 'idle',
  lastSync: '2 min ago',
  startSync: () => set({ syncState: 'syncing' }),
  finishSync: () => {
    set({ syncState: 'done', lastSync: 'just now' })
    setTimeout(() => set({ syncState: 'idle' }), 2400)
  },
}))
