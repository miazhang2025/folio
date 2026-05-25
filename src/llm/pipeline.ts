import { db } from '../data/db'
import type { Note, Distill, DistillData, Conversation, Dispatch, IgnoredAdvice } from '../data/schema'
import { getClient } from './client'
import { DISTILL_PROMPT } from './prompts/distill'
import { SYNTHESIZE_PROMPT } from './prompts/synthesize'
import { DISPATCH_PROMPT } from './prompts/dispatch'
import { VALIDATE_PROMPT } from './prompts/validate'
import { conversationContentHash } from '../lib/hash'

// ─── Models (from FOLIO.md cost target) ──────────────────────────────────────
const DISTILL_MODEL = 'claude-haiku-4-5'
const SYNTHESIZE_MODEL = 'claude-opus-4-5'
const DISPATCH_MODEL = 'claude-haiku-4-5'
const VALIDATE_MODEL = 'claude-haiku-4-5'
const MAX_TOKENS_DISTILL = 2048
const MAX_TOKENS_SYNTHESIZE = 2048
const MAX_TOKENS_DISPATCH = 2048
const MAX_TOKENS_VALIDATE = 256

const VALIDATE_THRESHOLD = 5  // only run Step 0 when cluster has >= this many convs

// ─── JSON helpers ────────────────────────────────────────────────────────────

function closeOpenJson(s: string): string {
  const stack: string[] = []
  let inStr = false
  let escaped = false

  for (const ch of s) {
    if (escaped) { escaped = false; continue }
    if (ch === '\\' && inStr) { escaped = true; continue }
    if (ch === '"') { inStr = !inStr; continue }
    if (inStr) continue
    if (ch === '{' || ch === '[') stack.push(ch === '{' ? '}' : ']')
    else if ((ch === '}' || ch === ']') && stack.length) stack.pop()
  }

  let result = s.trimEnd()
  if (inStr) result += '"'
  result = result.replace(/,\s*$/, '')
  while (stack.length) result += stack.pop()!
  return result
}

function parseDistillSafe(raw: string): DistillData {
  const fallback: DistillData = {
    subject: '',
    decisions: [],
    facts: [],
    open_questions: [],
    advice_not_taken: [],
    emotional_texture: null,
  }
  const jsonStr = raw.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim()
  try {
    return JSON.parse(jsonStr) as DistillData
  } catch {
    try {
      return JSON.parse(closeOpenJson(jsonStr)) as DistillData
    } catch {
      console.warn('[Folio] distill JSON unrecoverable, using fallback')
      return fallback
    }
  }
}

// ─── Step 1: Distill a single conversation within a node ─────────────────────

async function distillConversation(
  conv: Conversation,
  nodeId: string,
  nodeLabel: string,
): Promise<Distill> {
  const client = await getClient()
  const convHash = conversationContentHash(conv.messages)

  // Check cache
  const cached = await db.distills.get([conv.id, nodeId])
  if (cached && cached.conversation_hash === convHash) {
    return cached
  }

  const transcript = conv.messages
    .map((m) => `**${m.role === 'user' ? 'Mia' : 'Claude'}:** ${m.content}`)
    .join('\n\n')

  const prompt = DISTILL_PROMPT
    .replace('{{node_label}}', nodeLabel)
    .replace('{{conversation}}', transcript)

  const response = await client.messages.create({
    model: DISTILL_MODEL,
    max_tokens: MAX_TOKENS_DISTILL,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = response.content.find((b) => b.type === 'text')?.text ?? '{}'
  const data = parseDistillSafe(raw)

  const distill: Distill = {
    conversation_id: conv.id,
    node_id: nodeId,
    conversation_hash: convHash,
    data,
    created_at: Date.now(),
  }

  await db.distills.put(distill)
  return distill
}

// ─── Step 2: Synthesize all distills for a node into a note ──────────────────

async function synthesizeNode(
  nodeId: string,
  nodeLabel: string,
  distills: Distill[],
): Promise<Note> {
  const client = await getClient()

  // Build cache key from the set of distill hashes
  const digestHashes = distills.map((d) => d.conversation_hash).sort()

  // Check cache
  const cached = await db.notes.get(nodeId)
  if (cached) {
    const cachedHashes = [...cached.digest_hashes].sort()
    const unchanged =
      cachedHashes.length === digestHashes.length &&
      cachedHashes.every((h, i) => h === digestHashes[i])
    if (unchanged) return cached
  }

  const distillsJson = JSON.stringify(distills.map((d) => d.data), null, 2)
  const prompt = SYNTHESIZE_PROMPT
    .replace('{{node_label}}', nodeLabel)
    .replace('{{count}}', String(distills.length))
    .replace('{{distills}}', distillsJson)

  const response = await client.messages.create({
    model: SYNTHESIZE_MODEL,
    max_tokens: MAX_TOKENS_SYNTHESIZE,
    messages: [{ role: 'user', content: prompt }],
  })

  const markdown = response.content.find((b) => b.type === 'text')?.text ?? ''

  const note: Note = {
    node_id: nodeId,
    markdown,
    digest_hashes: digestHashes,
    created_at: Date.now(),
  }

  await db.notes.put(note)
  return note
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Step 0: Check whether a cluster is coherent enough to synthesize.
 * Only runs when conversations.length >= VALIDATE_THRESHOLD.
 * Returns true (coherent) always for small clusters.
 */
async function validateCluster(
  conversations: Conversation[],
  _nodeLabel: string,
): Promise<{ coherent: boolean; reason: string }> {
  if (conversations.length < VALIDATE_THRESHOLD) return { coherent: true, reason: 'small cluster, skipped' }

  const client = await getClient()
  const convList = conversations.map((c) => ({
    title: c.title,
    first_message: c.messages.find((m) => m.role === 'user')?.content.slice(0, 200) ?? '',
  }))

  const prompt = VALIDATE_PROMPT.replace('{{conversations}}', JSON.stringify(convList, null, 2))

  const response = await client.messages.create({
    model: VALIDATE_MODEL,
    max_tokens: MAX_TOKENS_VALIDATE,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = response.content.find((b) => b.type === 'text')?.text ?? '{}'
  const jsonStr = raw.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim()
  const parsed = JSON.parse(jsonStr) as { is_coherent?: boolean; reason?: string }

  return {
    coherent: parsed.is_coherent ?? true,
    reason: parsed.reason ?? 'unknown',
  }
}

/**
 * Run the full L2 pipeline for a node:
 *   [Step 0] validate cluster coherence (if >= 5 convs)
 *   [Step 1] distill conversations (parallel, cached)
 *   [Step 2] synthesize note (cached)
 *
 * Returns the Note record written to Dexie.
 * Throws a descriptive error if Step 0 deems the cluster incoherent.
 */
export async function runPipeline(nodeId: string, skipValidate = false): Promise<Note> {
  const node = await db.nodes.get(nodeId)
  if (!node) throw new Error(`Node ${nodeId} not found in DB`)

  const conversations = await db.conversations
    .where('id')
    .anyOf(node.conversation_ids)
    .toArray()

  if (!conversations.length) {
    throw new Error(`Node ${nodeId} has no conversations to synthesize`)
  }

  // Step 0 — validate coherence
  if (!skipValidate) {
    const { coherent, reason } = await validateCluster(conversations, node.label)
    if (!coherent) {
      console.warn(`[Folio] Node "${node.label}" failed coherence check: ${reason}`)
      throw new Error(`Cluster "${node.label}" may need splitting: ${reason}`)
    }
  }

  // Step 1 — distill all conversations in parallel
  const distills = await Promise.all(
    conversations.map((c) => distillConversation(c, nodeId, node.label)),
  )

  // Step 2 — synthesize
  const note = await synthesizeNode(nodeId, node.label, distills)

  // Update last_synthesized timestamp on the node
  await db.nodes.update(nodeId, { last_synthesized: Date.now() })

  return note
}

/**
 * Convenience: run the pipeline for every node in the DB.
 * Runs nodes sequentially to avoid hammering the API.
 * Per-node errors are caught and logged so a single bad cluster
 * doesn't halt synthesis for all remaining nodes.
 */
export async function runPipelineAll(
  onProgress?: (done: number, total: number, nodeLabel: string) => void,
): Promise<{ succeeded: number; failed: number }> {
  const nodes = await db.nodes.toArray()
  let succeeded = 0
  let failed = 0
  for (let i = 0; i < nodes.length; i++) {
    onProgress?.(i, nodes.length, nodes[i].label)
    try {
      await runPipeline(nodes[i].id, true)  // skipValidate: trust the clusterer
      succeeded++
    } catch (e) {
      failed++
      console.warn(`[Folio] Pipeline failed for node "${nodes[i].label}":`, e)
    }
  }
  onProgress?.(nodes.length, nodes.length, '')
  return { succeeded, failed }
}

// ─── Step 3: Generate the weekly Dispatch ─────────────────────────────────────

/**
 * Generate (or regenerate) the Dispatch for the given week window.
 * Defaults to the current ISO week (Mon 00:00 → Sun 23:59:59).
 *
 * Skips generation if a Dispatch for this week already exists in DB.
 * Pass `force = true` to regenerate regardless.
 */
export async function generateDispatch(
  weekStart?: number,
  weekEnd?: number,
  force = false,
): Promise<Dispatch> {
  // Default to current ISO week (Monday-based)
  const now = new Date()
  const dayOfWeek = (now.getDay() + 6) % 7  // 0=Mon … 6=Sun
  const monMs = Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - dayOfWeek,
  )
  const start = weekStart ?? monMs
  const end   = weekEnd   ?? (monMs + 7 * 24 * 60 * 60 * 1000 - 1)

  const weekId = `dispatch-${new Date(start).toISOString().slice(0, 10)}`

  // Return cached unless forced
  if (!force) {
    const cached = await db.dispatches.get(weekId)
    if (cached) return cached
  }

  // Gather distills created this week
  const allDistills = await db.distills.toArray()
  const weekDistills = allDistills.filter(
    (d) => d.created_at >= start && d.created_at <= end,
  )

  // Resolve active nodes (touched this week)
  const activeNodeIds = [...new Set(weekDistills.map((d) => d.node_id))]
  const allNodes = await db.nodes.toArray()
  const activeNodes = allNodes.filter((n) => activeNodeIds.includes(n.id))

  // Emerged this week (node created_at within the week window)
  const emergedNodeIds = allNodes
    .filter((n) => n.created_at >= start && n.created_at <= end)
    .map((n) => n.id)

  const weekRange = (() => {
    const fmt = (ms: number) =>
      new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    return `${fmt(start)} – ${fmt(end)}`
  })()

  const activeNodesJson = JSON.stringify(
    activeNodes.map((n) => ({ id: n.id, label: n.label, family: n.family })),
    null, 2,
  )
  const distillsJson = JSON.stringify(weekDistills.map((d) => d.data), null, 2)

  const prompt = DISPATCH_PROMPT
    .replace('{{week_range}}', weekRange)
    .replace('{{active_nodes}}', activeNodesJson)
    .replace('{{distills}}', distillsJson)

  const client = await getClient()
  const response = await client.messages.create({
    model: DISPATCH_MODEL,
    max_tokens: MAX_TOKENS_DISPATCH,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = response.content.find((b) => b.type === 'text')?.text ?? '{}'
  const jsonStr = raw.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim()
  const parsed = JSON.parse(jsonStr) as {
    narrative: string
    keywords: string[]
    ignored_advice: IgnoredAdvice[]
  }

  const dispatch: Dispatch = {
    id: weekId,
    week_start: start,
    week_end: end,
    active_node_ids: activeNodeIds,
    emerged_node_ids: emergedNodeIds,
    keywords: parsed.keywords ?? [],
    narrative: parsed.narrative ?? '',
    ignored_advice: parsed.ignored_advice ?? [],
    created_at: Date.now(),
  }

  await db.dispatches.put(dispatch)
  return dispatch
}

