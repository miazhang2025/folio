// ─── Folio demo fixtures ─────────────────────────────────────────────────────
// Shown when the DB is empty so new users land on a rich, working example
// rather than a blank screen. All content is fictional.

import type { Node, IgnoredAdvice } from '../data/schema'

// ─── Fixture node shape (adds layout position for the mindmap) ───────────────
export interface FixtureNode extends Omit<Node, 'conversation_ids' | 'created_at' | 'last_synthesized'> {
  x: number   // 0–1 proportional to canvas width
  y: number   // 0–1 proportional to canvas height
  count: number
}

export const NODES: FixtureNode[] = [
  { id: 'neural-canvas',    label: 'Neural Canvas',        x: 0.28, y: 0.36, count: 18, family: 'creative', recency: 'now',    related_node_ids: ['portfolio-rebuild', 'rust-learning', 'side-api'] },
  { id: 'job-offer',        label: 'Meridian AI Offer',    x: 0.62, y: 0.30, count: 12, family: 'work',     recency: 'now',    related_node_ids: ['portfolio-rebuild', 'side-api', 'burnout', 'la-move'] },
  { id: 'portfolio-rebuild',label: 'Portfolio Rebuild',    x: 0.18, y: 0.54, count: 9,  family: 'creative', recency: 'now',    related_node_ids: ['neural-canvas', 'job-offer'] },
  { id: 'rust-learning',    label: 'Rust Deep Dive',       x: 0.52, y: 0.18, count: 7,  family: 'work',     recency: 'recent', related_node_ids: ['neural-canvas', 'side-api'] },
  { id: 'side-api',         label: 'Dev API (Side Project)',x: 0.74, y: 0.52, count: 11, family: 'work',    recency: 'recent', related_node_ids: ['job-offer', 'rust-learning', 'freelance-taxes'] },
  { id: 'burnout',          label: 'Burnout Patterns',     x: 0.46, y: 0.66, count: 8,  family: 'life',     recency: 'now',    related_node_ids: ['job-offer', 'fiction-drafts', 'gym-habit', 'la-move'] },
  { id: 'la-move',          label: 'NYC → LA?',            x: 0.70, y: 0.73, count: 6,  family: 'life',     recency: 'recent', related_node_ids: ['job-offer', 'burnout'] },
  { id: 'freelance-taxes',  label: 'Freelance Taxes',      x: 0.85, y: 0.60, count: 5,  family: 'admin',    recency: 'now',    related_node_ids: ['side-api'] },
  { id: 'fiction-drafts',   label: 'Fiction Drafts',       x: 0.12, y: 0.26, count: 4,  family: 'creative', recency: 'past',   related_node_ids: ['burnout'] },
  { id: 'gym-habit',        label: 'Gym Habit',            x: 0.40, y: 0.82, count: 3,  family: 'life',     recency: 'past',   related_node_ids: ['burnout'] },
]

export type EdgePair = [string, string]
export const EDGES: EdgePair[] = [
  ['neural-canvas',     'portfolio-rebuild'],
  ['neural-canvas',     'rust-learning'],
  ['neural-canvas',     'side-api'],
  ['portfolio-rebuild', 'job-offer'],
  ['job-offer',         'side-api'],
  ['job-offer',         'burnout'],
  ['job-offer',         'la-move'],
  ['rust-learning',     'side-api'],
  ['side-api',          'freelance-taxes'],
  ['burnout',           'fiction-drafts'],
  ['burnout',           'gym-habit'],
  ['burnout',           'la-move'],
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
  'neural-canvas': {
    title: 'Neural Canvas',
    sub: '18 conversations · started Sep 2025 · live now',
    body: [
      { kind: 'h', text: 'Where it stands now' },
      { kind: 'p', text: 'A browser-based generative art system — 12 live shaders, WebGL + TypeScript. The demo page soft-launched two weeks ago and three artists have reached out to use it for live performances. An MP4 export button is the most-requested feature and doesn\'t exist yet.' },
      { kind: 'h', text: 'How it got here' },
      { kind: 'p', text: 'Started in September as a "learn WebGL over a weekend" project. By October it warranted its own repo. The pivot from personal sketch to public tool happened in mid-November — a single post got 400 reposts. Every Claude session since has been some variant of: new shader type, performance optimization, or UI redesign.' },
      { kind: 'h', text: 'Loose threads' },
      { kind: 'q', text: 'The shader parameter UI is functional but non-coders find it opaque. You\'ve sketched a redesign twice. Neither sketch got built.' },
      { kind: 'q', text: 'Audio reactivity was mentioned to all three artists as "coming soon." That was five weeks ago.' },
      { kind: 'q', text: 'You haven\'t decided whether this is a portfolio piece, a product, or both — and that ambiguity is blocking both pricing and design decisions.' },
    ],
    related: ['portfolio-rebuild', 'rust-learning', 'side-api'],
  },

  'job-offer': {
    title: 'Meridian AI Offer',
    sub: '12 conversations · decision this Friday',
    body: [
      { kind: 'h', text: 'Where it stands now' },
      { kind: 'p', text: 'Formal offer in hand: L5-equivalent senior engineer at Meridian AI (Series B, $12M raised), fully remote with an optional LA hub. 40% total comp increase. Three-year cliff RSUs worth ~$200K at current valuation. The deadline was extended once — the real one is this Friday.' },
      { kind: 'h', text: 'How it got here' },
      { kind: 'p', text: 'Recruiter cold-outreach in October. Two ex-colleagues already at Meridian vouched strongly. An initial decline in November reversed in January after an internal promotion fell through. Every conversation since has been a version of: take the stability and upside, or stay independent.' },
      { kind: 'h', text: 'Loose threads' },
      { kind: 'q', text: 'You still haven\'t modeled what "fully independent" would actually look like. Claude suggested building the spreadsheet on Monday. You didn\'t.' },
      { kind: 'q', text: 'The three-year RSU cliff is a commitment you keep not naming directly. What does your life look like in 2029 if you take this?' },
      { kind: 'q', text: 'If you accept, Neural Canvas becomes a nights-and-weekends project. You haven\'t sat with what that actually means for the three artists waiting on you.' },
    ],
    related: ['portfolio-rebuild', 'side-api', 'burnout', 'la-move'],
  },

  'portfolio-rebuild': {
    title: 'Portfolio Rebuild',
    sub: '9 conversations · live for 3 weeks',
    body: [
      { kind: 'h', text: 'Where it stands now' },
      { kind: 'p', text: 'Live and getting ~40 organic visitors per day. Neural Canvas is the hero piece. Three.js scene loads in under 2 seconds. No promotion — all search traffic.' },
      { kind: 'h', text: 'How it got here' },
      { kind: 'p', text: 'The old portfolio dated from 2021 and was embarrassing. The rebuild took six weeks, blocked repeatedly by wanting Neural Canvas to be more "done" first. Shipped the first week of May with Canvas still technically in beta.' },
      { kind: 'h', text: 'Loose threads' },
      { kind: 'q', text: 'The Work section is still empty. You said you\'d write case studies three weeks ago.' },
      { kind: 'q', text: 'Forty visitors a day but no idea who they are or where they come from. You added no analytics.' },
    ],
    related: ['neural-canvas', 'job-offer'],
  },

  'burnout': {
    title: 'Burnout Patterns',
    sub: '8 conversations · recurring thread since Jan',
    body: [
      { kind: 'h', text: 'Where it stands now' },
      { kind: 'p', text: 'You\'ve named a pattern: creative output crashes every 6–8 weeks when you\'ve been too "on" for too long. The current stretch started in March. Fiction writing went silent in April. Gym habit dropped off in the same window.' },
      { kind: 'h', text: 'How it got here' },
      { kind: 'p', text: 'The first burnout session was in January, when you described feeling "competent but hollow." Claude reflected back a connection between your project count and the hollowness that you said stuck. Follow-up sessions built a model: creative energy as a depletable resource, not a constant.' },
      { kind: 'h', text: 'Loose threads' },
      { kind: 'q', text: 'Knowing the pattern doesn\'t mean you\'ve slowed down. Are you in recovery or just more articulate about the same problem?' },
      { kind: 'q', text: 'The job offer deadline lands right in the middle of the current low cycle. Is the urgency you feel real, or burnout-inflected decision-making?' },
    ],
    related: ['job-offer', 'fiction-drafts', 'gym-habit', 'la-move'],
  },

  'side-api': {
    title: 'Dev API (Side Project)',
    sub: '11 conversations · in private beta',
    body: [
      { kind: 'h', text: 'Where it stands now' },
      { kind: 'p', text: 'An API that does structured extraction from unstructured developer docs — give it a GitHub README, get back a typed schema. Six paying beta users at $29/month. The Rust rewrite of the hot path cut latency by 60%.' },
      { kind: 'h', text: 'How it got here' },
      { kind: 'p', text: 'Born from a personal frustration with documentation. Shipped the MVP in a week using Node. Beta traction came faster than expected — the Meridian offer arrived three weeks after the first paying customer, which complicated everything.' },
      { kind: 'h', text: 'Loose threads' },
      { kind: 'q', text: '$174/month MRR is real traction but not freedom. What\'s the 12-month number that changes the calculus on the job offer?' },
      { kind: 'q', text: 'You\'ve been calling this a "side project" for four months. At what point does that framing become a defense mechanism?' },
    ],
    related: ['job-offer', 'rust-learning', 'freelance-taxes'],
  },

  'rust-learning': {
    title: 'Rust Deep Dive',
    sub: '7 conversations · steady background track',
    body: [
      { kind: 'h', text: 'Where it stands now' },
      { kind: 'p', text: 'Midway through the Rust book. Built two small CLI tools. The borrow checker has stopped being an enemy. Currently using it for the data pipeline in the API product\'s hot path.' },
      { kind: 'h', text: 'How it got here' },
      { kind: 'p', text: 'Started because the side API product needed something faster than Node. Claude has been a near-daily study partner — sessions alternate between "explain this error" and "what\'s the right pattern here."' },
      { kind: 'h', text: 'Loose threads' },
      { kind: 'q', text: 'You\'re learning Rust for a practical goal but keep getting pulled into the theory. Is the API product the real reason, or did Rust become the point?' },
    ],
    related: ['neural-canvas', 'side-api'],
  },

  'la-move': {
    title: 'NYC → LA?',
    sub: '6 conversations · contingent on job decision',
    body: [
      { kind: 'h', text: 'Where it stands now' },
      { kind: 'p', text: 'The Meridian offer is remote-first but has an LA hub the team uses Thu/Fri. You\'ve done two sessions on neighborhoods (Silver Lake, Echo Park, Culver City) and one on cost-of-living. No decision yet — fully contingent on the job.' },
      { kind: 'h', text: 'How it got here' },
      { kind: 'p', text: 'The "what if I moved" thought predates the offer — it surfaced in burnout sessions as a "fresh start" impulse. The Meridian offer made it concrete and researchable.' },
      { kind: 'h', text: 'Loose threads' },
      { kind: 'q', text: 'You\'ve been researching neighborhoods as if the job offer is already accepted. Is the research a way of pre-deciding?' },
    ],
    related: ['job-offer', 'burnout'],
  },

  'freelance-taxes': {
    title: 'Freelance Taxes',
    sub: '5 conversations · filing this month',
    body: [
      { kind: 'h', text: 'Where it stands now' },
      { kind: 'p', text: 'First full year with meaningful freelance and product income alongside W2 employment. Estimated taxes were underpaid in Q3 and Q4. Owe ~$4K in penalties on top of the balance. Working with a CPA for the first time.' },
      { kind: 'h', text: 'How it got here' },
      { kind: 'p', text: 'The API product revenue surprised you — it came faster than expected and you didn\'t set aside enough. Classic first-year mistake. The Claude sessions were mostly "explain this Form 1099 situation" and "what\'s the correct home office deduction."' },
      { kind: 'h', text: 'Loose threads' },
      { kind: 'q', text: 'The CPA asked whether the API product qualifies for a Schedule C business deduction. You said you\'d check. You haven\'t.' },
    ],
    related: ['side-api'],
  },

  'fiction-drafts': {
    title: 'Fiction Drafts',
    sub: '4 conversations · paused since April',
    body: [
      { kind: 'h', text: 'Where it stands now' },
      { kind: 'p', text: 'Three short stories started, none finished. The collection was aiming for 5 by June. Currently 0/5. Last Claude session on fiction was April 12.' },
      { kind: 'h', text: 'How it got here' },
      { kind: 'p', text: 'Started in February wanting to write science fiction after a long dry spell. Got momentum on two stories. Then the API product took off, the Meridian conversations intensified, and creative energy rerouted to technical work.' },
      { kind: 'h', text: 'Loose threads' },
      { kind: 'q', text: 'Do you want to write these stories, or do you want to have written them?' },
    ],
    related: ['burnout'],
  },

  'gym-habit': {
    title: 'Gym Habit',
    sub: '3 conversations · stalled',
    body: [
      { kind: 'h', text: 'Where it stands now' },
      { kind: 'p', text: 'Three weeks on, then off since mid-April. Last gym session was April 18.' },
      { kind: 'h', text: 'How it got here' },
      { kind: 'p', text: 'Built a solid Mon/Wed/Fri habit in March. The collapse coincided with the burnout pattern trough — physical energy dropped with creative energy.' },
      { kind: 'h', text: 'Loose threads' },
      { kind: 'q', text: 'You said you\'d restart "next week" in three separate conversations. What is actually in the way?' },
    ],
    related: ['burnout'],
  },
}

export function fallbackNote(node: FixtureNode): FixtureNote {
  return {
    title: node.label,
    sub: `${node.count} conversations`,
    body: [
      { kind: 'p', text: 'This node hasn\'t been synthesized yet. Click "↻ regenerate" to generate a note from the underlying conversations.' },
    ],
    related: [],
  }
}

// ─── Weekly dispatch ──────────────────────────────────────────────────────────
export interface WeeklyFixture {
  range: string
  active: string[]
  emerged: string[]
  narrative: string
  keywords: string[]
  ignored: IgnoredAdvice[]
}

export const WEEKLY: WeeklyFixture = {
  range: 'Week of May 19 – May 25',
  active: ['neural-canvas', 'job-offer', 'portfolio-rebuild', 'freelance-taxes'],
  emerged: ['job-offer'],
  narrative: "The Meridian decision broke through the noise this week — it's been background for months but became front-and-center by Wednesday. Neural Canvas is what made it complicated: three artists reached out to build on it, which changes what 'taking a job' actually means for a project you've been treating as a side thing. The taxes situation closed a separate thread: penalty confirmed, CPA has everything, done.",
  keywords: ['RSU cliff', 'audio reactivity', 'Schedule C deduction', 'Silver Lake', 'borrow checker'],
  ignored: [
    { day: 'Mon', q: 'Should I ask for another 2-week extension on the offer?', advice: 'Yes — ask for 2 weeks.', mia: 'Asked for 4 days instead.', verdict: 'will-regret' },
    { day: 'Wed', q: 'Model out the independent path before deciding.', advice: 'Build the spreadsheet now.', mia: "Said I'd do it Thursday. Didn't.", verdict: 'open' },
    { day: 'Fri', q: 'Write the rejection email first to test how it feels.', advice: 'Draft the rejection before the acceptance.', mia: 'Wrote 3 acceptance drafts instead.', verdict: 'will-regret' },
  ],
}
