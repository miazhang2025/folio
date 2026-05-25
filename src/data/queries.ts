import { db } from './db'
import type { Conversation, Node, Note } from './schema'

export async function getAllNodes(): Promise<Node[]> {
  return db.nodes.toArray()
}

export async function getNode(id: string): Promise<Node | undefined> {
  return db.nodes.get(id)
}

export async function getNote(nodeId: string): Promise<Note | undefined> {
  return db.notes.get(nodeId)
}

export async function getConversationsForNode(nodeId: string): Promise<Conversation[]> {
  const node = await db.nodes.get(nodeId)
  if (!node || !node.conversation_ids.length) return []
  return db.conversations.where('id').anyOf(node.conversation_ids).toArray()
}

export async function upsertNode(node: Node): Promise<void> {
  await db.nodes.put(node)
}

export async function upsertNote(note: Note): Promise<void> {
  await db.notes.put(note)
}

export async function upsertConversation(conv: Conversation): Promise<void> {
  await db.conversations.put(conv)
}

export async function mergeNodes(absorberId: string, absorbedId: string): Promise<void> {
  const [absorber, absorbed] = await Promise.all([
    db.nodes.get(absorberId),
    db.nodes.get(absorbedId),
  ])
  if (!absorber || !absorbed) return

  const mergedConvIds = [...new Set([...absorber.conversation_ids, ...absorbed.conversation_ids])]
  const mergedRelated = [...new Set([
    ...(absorber.related_node_ids ?? []),
    ...(absorbed.related_node_ids ?? []),
  ])].filter((id) => id !== absorberId && id !== absorbedId)

  await db.transaction('rw', [db.nodes, db.distills, db.notes], async () => {
    await db.nodes.update(absorberId, {
      conversation_ids: mergedConvIds,
      related_node_ids: mergedRelated,
    })

    const absorbedDistills = await db.distills.where('node_id').equals(absorbedId).toArray()
    for (const d of absorbedDistills) {
      const existing = await db.distills.get([d.conversation_id, absorberId])
      if (!existing) await db.distills.put({ ...d, node_id: absorberId })
      await db.distills.delete([d.conversation_id, absorbedId])
    }

    await db.notes.delete(absorbedId)
    await db.nodes.delete(absorbedId)
  })

  // Fix up other nodes that point to absorbedId
  const allNodes = await db.nodes.toArray()
  for (const n of allNodes) {
    if (n.related_node_ids?.includes(absorbedId)) {
      const updated = [...new Set(
        n.related_node_ids
          .map((id) => id === absorbedId ? absorberId : id)
          .filter((id) => id !== n.id),
      )]
      await db.nodes.update(n.id, { related_node_ids: updated })
    }
  }
}
