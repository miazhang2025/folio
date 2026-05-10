// ─── Mock data extracted from folio_mockup.jsx — Mia's actual life as seed ───
// This is the fixtures file. Dexie hooks fall back to it when the DB is empty.

import type { Node, Dispatch, IgnoredAdvice } from '../data/schema'

// ─── Fixture node shape (adds layout position for the mindmap) ───────────────
export interface FixtureNode extends Omit<Node, 'conversation_ids' | 'created_at' | 'last_synthesized'> {
  x: number   // 0–1 proportional to canvas width
  y: number   // 0–1 proportional to canvas height
  count: number
}

export const NODES: FixtureNode[] = [
  { id: 'cassette-jury',        label: 'Cassette Jury',              x: 0.32, y: 0.42, count: 23, family: 'creative', recency: 'now' },
  { id: 'threejs',              label: 'Three.js + Shaders',         x: 0.48, y: 0.30, count: 14, family: 'creative', recency: 'now' },
  { id: 'rapier',               label: 'Rapier physics',             x: 0.58, y: 0.42, count: 6,  family: 'creative', recency: 'now' },
  { id: 'komar',                label: 'Komar onboarding',           x: 0.72, y: 0.55, count: 19, family: 'work',     recency: 'now' },
  { id: 'fashion-ai',           label: 'AI in fashion',              x: 0.82, y: 0.40, count: 11, family: 'work',     recency: 'recent' },
  { id: 'mudweiser',            label: 'Mudweiser ad',               x: 0.20, y: 0.62, count: 9,  family: 'creative', recency: 'recent' },
  { id: 'comfyui',              label: 'ComfyUI pipeline',           x: 0.32, y: 0.72, count: 8,  family: 'creative', recency: 'recent' },
  { id: 'opt',                  label: 'STEM OPT / I-983',           x: 0.78, y: 0.74, count: 5,  family: 'admin',    recency: 'now' },
  { id: 'apartment',            label: 'Jersey City lease',          x: 0.62, y: 0.78, count: 7,  family: 'life',     recency: 'now' },
  { id: 'mihoyo',               label: 'miHoYo interview',           x: 0.10, y: 0.32, count: 6,  family: 'work',     recency: 'past' },
  { id: 'lora',                 label: 'LoRA training (abandoned)',  x: 0.22, y: 0.22, count: 4,  family: 'creative', recency: 'past' },
  { id: 'codesmith',            label: 'Codesmith × Treasury',       x: 0.50, y: 0.62, count: 5,  family: 'work',     recency: 'recent' },
  { id: 'google-fellowship',    label: 'Google Creative Fellowship', x: 0.42, y: 0.18, count: 3,  family: 'work',     recency: 'past' },
]

export type EdgePair = [string, string]
export const EDGES: EdgePair[] = [
  ['cassette-jury', 'threejs'],    ['cassette-jury', 'rapier'],    ['cassette-jury', 'lora'],
  ['cassette-jury', 'comfyui'],   ['threejs', 'rapier'],           ['threejs', 'mihoyo'],
  ['komar', 'fashion-ai'],        ['komar', 'opt'],                ['komar', 'apartment'],
  ['fashion-ai', 'comfyui'],      ['mudweiser', 'comfyui'],        ['mudweiser', 'codesmith'],
  ['lora', 'mihoyo'],             ['google-fellowship', 'mihoyo'], ['codesmith', 'fashion-ai'],
  ['cassette-jury', 'google-fellowship'],
]

export const FAMILY_COLORS: Record<string, { dot: string; ring: string; ink: string }> = {
  creative: { dot: '#C2410C', ring: 'rgba(194,65,12,0.20)',  ink: '#7C2D12' },
  work:     { dot: '#15803D', ring: 'rgba(21,128,61,0.20)',  ink: '#14532D' },
  life:     { dot: '#9F1239', ring: 'rgba(159,18,57,0.20)',  ink: '#881337' },
  admin:    { dot: '#A16207', ring: 'rgba(161,98,7,0.18)',   ink: '#713F12' },
}

export const RECENCY_OPACITY: Record<string, number> = {
  now: 1, recent: 0.78, past: 0.45,
}

// ─── Per-node note body ───────────────────────────────────────────────────────
export type NoteBlock =
  | { kind: 'h'; text: string }
  | { kind: 'p'; text: string }
  | { kind: 'q'; text: string }

export interface FixtureNote {
  title: string
  sub: string
  body: NoteBlock[]
  related: string[]
}

export const NOTES: Record<string, FixtureNote> = {
  'cassette-jury': {
    title: 'Cassette Jury',
    sub: '23 conversations · oldest Aug 14, 2025 · last touched 2 days ago',
    body: [
      { kind: 'h', text: 'Where it stands now' },
      { kind: 'p', text: 'Eleven juror personas (Margot Chen, Murray Fink, Frank Kowalski et al). Two-pass deliberation with structured JSON + XML-tagged outputs. As of January, fully 3D in WebGL — Three.js rendering, Rapier physics, custom GLSL shaders, GLB assets out of Blender.' },
      { kind: 'h', text: 'How it got here' },
      { kind: 'p', text: "You started in October trying to LoRA-train each juror on an RTX 5060. Hardware wasn't enough. By mid-November you pivoted to prompt-extraction + a Style Anchor system for cross-character coherence — cleaner, less brittle. The 3D upgrade in January was a separate decision; you wanted the jurors to *occupy space*, not just speak." },
      { kind: 'h', text: 'Loose threads' },
      { kind: 'q', text: 'On Dec 3 you worried the deliberation felt "too procedural" and wanted emergent disagreement between jurors. You haven\'t come back to this. Worth a revisit?' },
      { kind: 'q', text: "The Style Anchor never got a formal spec — it lives in three different conversations with slightly different definitions." },
    ],
    related: ['threejs', 'rapier', 'lora', 'comfyui', 'google-fellowship'],
  },
  'komar': {
    title: 'Komar onboarding',
    sub: '19 conversations · started Feb 2026 · ongoing',
    body: [
      { kind: 'h', text: 'Where it stands now' },
      { kind: 'p', text: 'Full-time on-site as of early May after the negotiated part-time remote stint. AI Creative Technologist at a family-owned apparel company. Benefits locked: HSA plan, 5% 401k for the match.' },
      { kind: 'h', text: 'The arc you went through' },
      { kind: 'p', text: 'Declined the offer → reversed → negotiated part-time remote → went full-time. Three weeks of indecision, mostly about whether it was the right *kind* of meaningful work. The Google Creative Residency reach-out arrived right in the middle and made things harder.' },
      { kind: 'h', text: 'Loose threads' },
      { kind: 'q', text: 'You framed your positioning as "AI fluency is scarce, fashion is learnable." Has that held up after a month inside?' },
    ],
    related: ['fashion-ai', 'opt', 'apartment', 'google-fellowship'],
  },
  'threejs': {
    title: 'Three.js + Shaders',
    sub: '14 conversations · always around',
    body: [
      { kind: 'h', text: 'What this node is really about' },
      { kind: 'p', text: 'Mostly Cassette Jury work, but it bleeds into the miHoYo interview prep and a couple of one-offs. Topics span GLSL fragment shaders, GLB import quirks, Rapier↔Three sync, and orbit controls.' },
      { kind: 'h', text: 'Recurring sticking points' },
      { kind: 'p', text: 'Shader/lighting parity between Blender preview and Three.js render came up four separate times across two months. You never wrote it down — the same debugging happens fresh each time.' },
    ],
    related: ['cassette-jury', 'rapier', 'mihoyo'],
  },
}

export function fallbackNote(node: FixtureNode): FixtureNote {
  return {
    title: node.label,
    sub: `${node.count} conversations`,
    body: [
      { kind: 'p', text: "This node hasn't been synthesized in detail yet — it'll be auto-generated from the underlying conversations on the next sync. Click \"Regenerate note\" to force it now." },
    ],
    related: [],
  }
}

// ─── Weekly digest ────────────────────────────────────────────────────────────
export interface WeeklyFixture {
  range: string
  active: string[]
  emerged: string[]
  narrative: string
  keywords: string[]
  ignored: IgnoredAdvice[]
}

export const WEEKLY: WeeklyFixture = {
  range: 'Week of May 3 – May 9',
  active: ['cassette-jury', 'rapier', 'komar', 'opt', 'apartment'],
  emerged: ['rapier'],
  narrative: "Three regions lit up this week: Cassette Jury's physics layer, settling into Komar, and the apartment / OPT admin cluster. Rapier surfaced as its own node for the first time — it had been folded inside Three.js until now.",
  keywords: ['Rapier collision', 'GLSL parity', 'HSA reimbursement', 'Grove Street lease', 'I-983 timeline'],
  ignored: [
    { day: 'Tue', q: 'Should I split the deliberation prompt into two passes?',  advice: 'Yes — split it.',    mia: 'Held off. Wanted to watch token usage first.',  verdict: 'open' },
    { day: 'Wed', q: '5% vs 10% on the 401k contribution?',                       advice: 'Go to 10%.',         mia: 'Stayed at 5%.',                                verdict: 'principled' },
    { day: 'Fri', q: 'Refactor the juror config files into one schema?',           advice: 'Refactor now, before adding more.', mia: 'Said "later."',             verdict: 'will-regret' },
  ],
}
