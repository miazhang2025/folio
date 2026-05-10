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
