import Dexie, { type Table } from 'dexie'
import type { Conversation, Node, Distill, Note, Dispatch } from './schema'

class FolioDB extends Dexie {
  conversations!: Table<Conversation, string>
  nodes!: Table<Node, string>
  distills!: Table<Distill, [string, string]>
  notes!: Table<Note, string>
  dispatches!: Table<Dispatch, string>

  constructor() {
    super('folio')
    this.version(1).stores({
      conversations: 'id, updated_at, imported_from',
      nodes: 'id, family, recency, last_synthesized',
      distills: '[conversation_id+node_id], conversation_id, node_id',
      notes: 'node_id, created_at',
      dispatches: 'id, week_start',
    })
  }
}

export const db = new FolioDB()
