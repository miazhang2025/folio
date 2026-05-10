import { create } from 'zustand'

type View   = 'map' | 'weekly'
type Filter = 'all' | 'creative' | 'work' | 'life' | 'admin'

interface UIState {
  selected: string
  hover: string | null
  view: View
  filter: Filter
  setSelected: (id: string) => void
  setHover: (id: string | null) => void
  setView: (v: View) => void
  setFilter: (f: Filter) => void
}

export const useUIStore = create<UIState>((set) => ({
  selected: 'cassette-jury',
  hover: null,
  view: 'map',
  filter: 'all',
  setSelected: (id) => set({ selected: id }),
  setHover: (id) => set({ hover: id }),
  setView: (v) => set({ view: v }),
  setFilter: (f) => set({ filter: f }),
}))
