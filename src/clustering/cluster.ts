import { db } from '../data/db'
import { getClient } from '../llm/client'
import type { Node } from '../data/schema'

const CLUSTER_MODEL = 'claude-opus-4-5'
const MAX_TOKENS = 16000 // 118 convs × ~30 tokens/entry ≈ 3500 tokens; headroom for larger sets

interface ClusterInput {
  id: string
  title: string
  first_message: string
}

/**
 * Path B — Claude-as-clusterer.
 * Feed Claude all conversation titles + first user messages, ask it to group them.
 * Returns Node records (without positions — layout assigns those).
 *
 * Scales to ~200 conversations. Switch to Path A (HDBSCAN) at v0.5 if needed.
 */
export async function clusterWithClaude(
  onProgress?: (msg: string) => void,
): Promise<Node[]> {
  const conversations = await db.conversations.toArray()
  if (!conversations.length) throw new Error('No conversations in database to cluster')

  onProgress?.(`Preparing ${conversations.length} conversations…`)

  const inputs: ClusterInput[] = conversations.map((c) => ({
    id: c.id,
    title: c.title,
    first_message: c.messages.find((m) => m.role === 'user')?.content.slice(0, 400) ?? '',
  }))

  const client = await getClient()

  const prompt = `You are organizing a person's Claude AI conversations into topic clusters.

Each conversation has an id, title, and the opening user message. Group them into coherent topic nodes.

Rules:
- Each node gets a short slug id (kebab-case, 2-3 words, e.g. "cassette-jury")
- Each node gets a human label (title-case, e.g. "Cassette Jury")
- Assign each conversation to exactly one node (the most relevant one)
- Family must be one of: creative | work | life | admin
  - creative: art, music, game dev, writing, visual projects, personal creative work
  - work: jobs, clients, professional tasks, interviews, business
  - life: housing, health, relationships, personal admin, finances
  - admin: immigration, bureaucracy, legal, taxes, government
- A node needs at least 2 conversations. Singleton conversations go into the closest thematic node.
- Aim for 8-25 nodes. Too many nodes makes the map cluttered.

Conversations:
${JSON.stringify(inputs, null, 2)}

Reply with a JSON array of nodes, exactly this shape:
[
  {
    "id": "cassette-jury",
    "label": "Cassette Jury",
    "family": "creative",
    "conversation_ids": ["uuid1", "uuid2"]
  }
]

Only return the JSON array, no explanation.`

  onProgress?.('Asking Claude to cluster conversations…')

  const response = await client.messages.create({
    model: CLUSTER_MODEL,
    max_tokens: MAX_TOKENS,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = response.content.find((b) => b.type === 'text')?.text ?? '[]'
  const jsonStr = raw.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim()

  interface RawCluster {
    id: string
    label: string
    family: 'creative' | 'work' | 'life' | 'admin'
    conversation_ids: string[]
  }

  // If the response was truncated at max_tokens, close the array and drop
  // the last incomplete object so the rest of the data is usable.
  function recoverTruncated(s: string): string {
    if (s.endsWith(']')) return s
    const lastClose = s.lastIndexOf('}')
    if (lastClose === -1) return '[]'
    return s.slice(0, lastClose + 1) + ']'
  }

  let clusters: RawCluster[]
  try {
    clusters = JSON.parse(jsonStr) as RawCluster[]
  } catch {
    const recovered = recoverTruncated(jsonStr)
    try {
      clusters = JSON.parse(recovered) as RawCluster[]
      console.warn('[Folio] Cluster response was truncated; recovered', clusters.length, 'nodes')
    } catch {
      throw new Error(
        `Claude returned malformed JSON during clustering. Response starts with: ${jsonStr.slice(0, 200)}`,
      )
    }
  }
  const now = Date.now()

  const nodes: Node[] = clusters.map((c) => {
    // Compute recency from the most recent conversation in this cluster
    const convDates = c.conversation_ids
      .map((id) => conversations.find((cv) => cv.id === id)?.updated_at ?? 0)
    const latest = Math.max(...convDates, 0)
    const daysSince = (now - latest) / (1000 * 60 * 60 * 24)
    const recency = daysSince < 7 ? 'now' : daysSince < 30 ? 'recent' : 'past'

    return {
      id: c.id,
      label: c.label,
      family: c.family,
      conversation_ids: c.conversation_ids,
      recency,
      created_at: now,
      last_synthesized: 0,
    }
  })

  onProgress?.(`Writing ${nodes.length} nodes to database…`)

  // Upsert — preserve any manual_edits on existing nodes
  for (const node of nodes) {
    const existing = await db.nodes.get(node.id)
    await db.nodes.put({
      ...node,
      manual_edits: existing?.manual_edits,
      position: existing?.position,
    })
  }

  return nodes
}
