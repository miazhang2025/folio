# Folio — Project Context for Copilot

You are helping Mia build **Folio**, a tool that turns her scattered Claude
conversations into a knowledge map. This document is your full briefing.
Read it top-to-bottom before suggesting code.

---

## 1. What Folio is

When Mia uses Claude heavily, conversations pile up across tabs. There's
no way to see them as a whole. Folio reads her conversations and grows
them into a living knowledge map — nodes per topic, notes per node,
weekly dispatches summarizing the week.

**One-liner:** Folio reads your Claude conversations and grows them into
a living knowledge map.

**Core mental model — three layers:**

1. **L1 — Conversations** · raw transcripts pulled from claude.ai
2. **L2 — Nodes** · semantic clusters; each node has a synthesis-style note
3. **L3 — Mindmap** · the interactive view; the user-facing surface

Everything in the codebase organizes around these three. When in doubt
about where logic belongs, ask which layer it serves.

---

## 2. What Folio is NOT (do not drift into these)

- Not a Claude chat UI — Folio reads, doesn't replace
- Not a Notion competitor — notes are auto-generated, not hand-written
- Not a real-time collaboration tool — single-user, local-first
- Not a manual-link note app — links emerge from data
- Not an Obsidian replacement — but emits compatible markdown

---

## 3. Roadmap

### v0 — self-use (current phase)
- [x] Vite + React + TypeScript scaffold
- [x] Mockup ported into proper component structure
- [x] Zustand UI store (split: `useUIStore` + `useSyncStore`)
- [x] Dexie schema + IndexedDB storage (`src/data/schema.ts`, `db.ts`, `queries.ts`)
- [x] Cold-start: import official Claude export ZIP (`src/lib/import.ts` + ImportModal)
- [x] L2 synthesis pipeline — distill (Haiku) + synthesize (Opus), fully cached (`src/llm/pipeline.ts`)
- [x] Clustering: `clusterWithClaude()` groups conversations into nodes (`src/clustering/cluster.ts`)
- [x] D3-force layout for mindmap (`src/clustering/layout.ts`, wired into Mindmap.tsx)
- [x] Settings modal for Anthropic API key (saved to localStorage / chrome.storage)
- [x] BuildMapPanel — post-import flow: cluster → synthesize → view map
- [x] "↻ regenerate note" button in NotePanel
- [x] Chrome extension content script — `window.fetch` interceptor in MAIN world, captures `/api/organizations/.../chat_conversations` endpoints
- [x] Background worker — receives `CONV_LIST` / `CONV_DETAIL` messages, upserts to Dexie
- [x] SyncButton wired to `chrome.runtime.sendMessage({ type: 'SYNC' })` with web fallback
- [x] Markdown renderer (`MarkdownNote.tsx`) — h2 / bullets / bold / italic; NotePanel uses it for DB notes
- [x] Drag-to-pin nodes in Mindmap — drag a node to lock its position; saved to `db.nodes.position`
- [x] Inline node editing in NotePanel — click title to rename; click dot to change family

### v0.5 — first dispatch
- [x] Real Dispatch generation — `generateDispatch()` in pipeline.ts calls Claude Haiku on this week's distills
- [x] DispatchView reads from Dexie — `RealDispatch` component when data exists, `FixtureDispatch` fallback
- [x] "You asked Claude, then ignored Claude" feature — surfaced from `advice_not_taken` in distills
- [x] Active-this-week / new-this-week node highlighting in DispatchView
- [x] Related nodes in NotePanel — DB same-family nodes for real data, EDGES adjacency for fixture

### v1 — share-ready
- [x] Export note as markdown file — ↓ export .md button in NotePanel; generates YAML frontmatter
- [x] Manual node merge — ⊕ merge node UI in NotePanel; absorbs conversation_ids and deletes merged node from Dexie
- [x] Obsidian vault export — ↓ export vault button in header; JSZip, one .md per note + _index.md with wikilinks
- [x] Onboarding for non-Mia users — 3-step modal (welcome → API key → import); shown once when DB empty
- [ ] Settings (API key, sync interval, family taxonomy)

### Deferred
- Mobile, multi-LLM, team mode, server-side storage

---

## 4. Tech stack & why each choice

| Layer | Choice | Why |
|---|---|---|
| Framework | React 18 + TypeScript | Mia knows it; ecosystem is best for D3 + future Three.js |
| Build | Vite (+ CRXJS plugin later) | Fast HMR; CRXJS handles manifest-v3 pain when extension gets added |
| Styling | Plain CSS with CSS vars (Tailwind installed but not used yet) | Mockup styles already work; migrate to Tailwind only if needed |
| State | **Zustand** | Minimal boilerplate; works across extension contexts (background worker ↔ UI) |
| Local data | **Dexie.js** (IndexedDB wrapper) | Best ergonomics for structured local data; `liveQuery` is reactive |
| Extension prefs | `chrome.storage.local` | API key, last-sync timestamp |
| Mindmap | D3-force + native SVG | Free node styling; future 3D upgrade swaps SVG → R3F without changing data flow |
| LLM | Anthropic SDK client-side | v0 uses user's own key; backend proxy added only when shipping to others |
| Embeddings | OpenAI `text-embedding-3-small` (Anthropic doesn't expose embeddings yet) | Cheap, good |
| Clustering | Path B first (Claude-as-clusterer), Path A (HDBSCAN) if it breaks at scale | Decided when real data exists at v0.5 |

### Explicitly NOT using
- Next.js / Remix — irrelevant SSR for client-only local-first app
- Redux / MobX — overkill for our state shape
- react-flow — too heavy, too opinionated
- Drizzle / Prisma — no SQL backend; Dexie IS the database
- A backend — not until shipping to other users

---

## 5. Design decisions you must respect

### Visual aesthetic — "editorial archive", not dashboard
- Warm beige paper (`#F4EFE4`) + dot grid background
- Newsreader serif for titles and note bodies, JetBrains Mono for UI/meta, Inter Tight for chrome
- Burnt orange accent (`#8B4D2E`) — that's the brand color
- Four family colors at saturated-but-grounded mid-tones:
  - `creative` → burnt orange `#C2410C`
  - `work` → forest green `#15803D`
  - `life` → deep crimson `#9F1239`
  - `admin` → amber gold `#A16207`
- Recency drives node opacity: `now: 1.0`, `recent: 0.78`, `past: 0.45`
- Stamp button (Dispatch) is rotated `-2deg` italic serif — it's a stamp, not a button

### Voice & content — synthesis-style notes
The right-side note panel content follows a **fixed three-section structure**:

```
## Where it stands now
2-4 sentences. Current state, specific not vague.

## How it got here
2-5 sentences. The arc — pivots, changes of mind, "decided X then Y."
Use dates sparingly.

## Loose threads
1-4 bullets. Each is a question or unresolved tension. Frame as
questions, not statements. This is the highest-value content.
```

**Voice rules — non-negotiable:**
- Address Mia in second person ("you decided", "you said") — never "Mia" or "the user"
- No filler ("It's worth noting...", "Overall, this represents...")
- No generic AI-summary language
- If a section has nothing to say, write "Nothing to flag yet" — never pad

### Naming language — Folio's vocabulary
- **Folio** — the product
- **Node** — a topic
- **Note** — synthesized markdown for one node
- **Distill** — cached digest of one conversation within one node
- **Synthesize** — LLM call combining distills into a note
- **Dispatch** — weekly digest
- **Lens** — the family filter

Use these terms in code, comments, and UI. Don't invent synonyms.

---

## 6. L2 synthesis pipeline (the product's brain)

Three-step pipeline. **Each step is independent**, do not collapse them.

```
Conversations in a node
    ↓ Step 1: distill (parallel, one call per conv, cached)
Distills (structured JSON)
    ↓ Step 2: synthesize (one call per node)
Note (markdown) → renders in right panel
```

A **Step 0 validate** runs only when cluster size ≥ 5: calls Claude Haiku with conversation titles + first messages, returns `{ is_coherent, reason }`. If `!is_coherent`, `runPipeline()` throws a descriptive error surfaced in NotePanel. Pass `skipValidate = true` to bypass (used in `runPipelineAll`).

Step 0 model: `claude-haiku-4-5`, max_tokens: 256. Cost is negligible.

### Step 1: Distill prompt (per conversation, per node)

Output JSON schema:

```ts
interface DistillData {
  subject: string;                    // max 12 words, the actual subject
  decisions: { what: string; status: 'settled' | 'tentative' | 'deferred' }[];
  facts: string[];                    // specific, non-obvious
  open_questions: string[];           // raised but unresolved
  advice_not_taken: {                 // feeds the Dispatch "ignored advice" feature
    claude_said: string;
    mia_chose: string;
    her_reason: string | null;
  }[];
  emotional_texture: string | null;   // null if neutral
}
```

Key prompt elements:
- Tells Claude this conversation is associated with node `{label}`, extract only relevant parts
- "Be terse. This is a digest, not a summary."
- Specifies the schema explicitly with no extra prose

### Step 2: Synthesize prompt (per node)

Inputs: all distills for the node, in chronological order.
Output: raw markdown using the three-section structure above.

Key prompt elements:
- Explicit voice rules (second person, no filler)
- Explicit structure (Where it stands now / How it got here / Loose threads)
- Outputs raw markdown, NOT JSON

### Caching rules
- **Distill cache key:** `hash(conversation_messages) + node_id` — invalidate when conv grows or node assignment changes
- **Note cache key:** `set(distill_hashes)` — invalidate when any distill changes

### Cost target
- Distill: ~$0.005/conv (Haiku) or ~$0.02 (Opus). Use **Haiku for distill**.
- Synthesize: ~$0.02/node. Use **Opus for synthesize**.
- Cold-start ~250 convs / 30 nodes: ~$2-5 total
- Steady state weekly: <$0.10/week

### Edge cases already designed for
1. **One conversation in multiple nodes** → distill is per (conv, node) pair; each pair extracts only the slice relevant to that node
2. **Incremental update** → synthesize prompt receives previous note + new digests, performs patch not rewrite
3. **Very long single conversation** (>50k tokens) → chunk-level summarization before distill

---

## 7. Data schema (Dexie tables — to be implemented)

```ts
// conversations
interface Conversation {
  id: string;                  // claude.ai's UUID
  title: string;
  created_at: number;
  updated_at: number;
  project_id: string | null;
  model: string;
  message_count: number;
  messages: Message[];         // full transcript inline
  imported_from: 'extension' | 'export_zip';
  last_synced: number;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;             // markdown
  created_at: number;
  attachments?: Attachment[];
}

// nodes
interface Node {
  id: string;
  label: string;
  family: 'creative' | 'work' | 'life' | 'admin';
  conversation_ids: string[];  // many-to-many
  position?: { x: number; y: number };
  recency: 'now' | 'recent' | 'past';
  created_at: number;
  last_synthesized: number;
  manual_edits?: {
    label_override?: string;
    family_override?: string;
    pinned?: boolean;
  };
}

// distills (cache for L2 step 1)
interface Distill {
  conversation_id: string;
  node_id: string;             // composite key with conversation_id
  conversation_hash: string;
  data: DistillData;
  created_at: number;
}

// notes (cache for L2 step 2)
interface Note {
  node_id: string;             // primary key
  markdown: string;
  digest_hashes: string[];
  created_at: number;
}

// dispatches
interface Dispatch {
  id: string;                  // 'dispatch-2026-W19'
  week_start: number;
  week_end: number;
  active_node_ids: string[];
  emerged_node_ids: string[];
  keywords: string[];
  narrative: string;
  ignored_advice: IgnoredAdvice[];
  created_at: number;
}
```

---

## 8. Project structure

```
folio/
├── src/
│   ├── main.tsx                      # entry point
│   ├── clustering/
│   │   ├── cluster.ts                # clusterWithClaude() — groups convs into nodes
│   │   ├── embed.ts                  # stub (HDBSCAN path, deferred to v0.5)
│   │   └── layout.ts                 # computeForceLayout() — D3-force simulation
│   ├── data/
│   │   ├── schema.ts                 # all TypeScript interfaces
│   │   ├── db.ts                     # Dexie instance (5 tables)
│   │   └── queries.ts                # typed query helpers
│   ├── extension/
│       ├── background.ts             # MV3 service worker — normalises + upserts conversations
│       ├── content.ts                # MAIN world fetch interceptor on claude.ai
│       └── manifest.json             # world: MAIN, run_at: document_start
│   ├── lib/
│   │   ├── fixtures.ts               # mock data (fallback when DB empty)
│   │   ├── hash.ts                   # SHA-256 + djb2 for cache keys
│   │   ├── import.ts                 # parseClaudeExportZip()
│   │   └── vault.ts                  # exportVault() — all notes → ZIP download
│   ├── llm/
│   │   ├── client.ts                 # getClient() — key from storage/env
│       ├── pipeline.ts               # runPipeline(), runPipelineAll(), generateDispatch()
│       └── prompts/
│           ├── distill.ts
│           ├── dispatch.ts
│   │       ├── synthesize.ts
│   │       └── validate.ts
│   ├── store/
│   │   ├── ui.ts                     # useUIStore (selected, hover, view, filter)
│   │   └── sync.ts                   # useSyncStore (syncState, lastSync)
│   └── ui/
│       ├── App.tsx                   # root shell (header + modals)
│       ├── styles/
│       │   └── folio.css             # all CSS (h-* and im-* namespaces)
│       ├── components/
│       │   ├── BuildMapPanel.tsx     # post-import: cluster → synthesize flow
│       │   ├── ImportModal.tsx       # ZIP drag-drop upload
│       │   ├── MarkdownNote.tsx      # lightweight markdown renderer (h2, bullets, bold, italic)
│       │   ├── Mindmap.tsx           # SVG mindmap with D3-force layout + drag-to-pin
│       │   ├── OnboardingModal.tsx   # 3-step first-run modal (welcome → API key → import)
│       │   ├── SettingsModal.tsx     # API key input
│       │   └── SyncButton.tsx
│       ├── hooks/
│       │   ├── useNodes.ts           # DB nodes → FixtureNode[]; falls back to fixtures
│       │   ├── useNote.ts            # DB note → FixtureNote; falls back to fixtures
│       │   └── useSync.ts
│       └── views/
│           ├── DispatchView.tsx
│           ├── MapView.tsx           # FilterStrip + Mindmap
│           └── NotePanel.tsx         # note body + regenerate button
├── index.html
├── popup.html                        # extension popup entry
├── tsconfig.json                     # project references
├── tsconfig.app.json                 # app compiler options
├── vite.config.ts                    # dual-target (web / extension via CRXJS)
├── package.json
└── .env.local                        # VITE_ANTHROPIC_KEY (gitignored)
```

---

## 9. Current state of the codebase

**What's fully implemented:**
- Full Vite 8 + React 19 + TypeScript 6 scaffold with dual build target (web + Chrome extension via CRXJS)
- All UI components: Mindmap (D3-force layout), NotePanel (with regenerate button), MapView, DispatchView, FilterStrip, SyncButton, ImportModal, BuildMapPanel, SettingsModal
- Zustand stores split: `useUIStore` (UI state) + `useSyncStore` (sync state)
- Dexie 4 database with 5 typed tables: `conversations`, `nodes`, `distills`, `notes`, `dispatches`
- `useNodes` hook: reads from Dexie when populated, falls back to fixtures
- `useNote` hook: Dexie notes → fixture notes → fallback skeleton
- ZIP import: `parseClaudeExportZip()` parses Anthropic's official `claude_export.zip`
- Real L2 pipeline: `distillConversation()` (Haiku, cached) → `synthesizeNode()` (Opus, cached)
- Clustering: `clusterWithClaude()` sends all conversation titles/first messages to Claude Opus, groups into 8-25 nodes with recency computed from `updated_at`
- D3-force layout: `computeForceLayout()` runs 200 ticks synchronously; respects `node.position` pins
- API key: loaded from `chrome.storage.local` → `localStorage` → `VITE_ANTHROPIC_KEY`
- `@types/chrome` installed; `tsconfig.app.json` includes `"types": ["vite/client", "chrome"]`

**What's still stub/deferred:**
- `src/clustering/embed.ts` — throws "not implemented" (HDBSCAN path deferred)
- Settings v2 (sync interval, family taxonomy customization) — not yet implemented

**Implemented and live:**
- Extension content script: `window.fetch` interceptor in `MAIN` world (`document_start`). Matches `/api/organizations/.../chat_conversations` (list) and `.../chat_conversations/{id}` (detail). Forwards to background via `chrome.runtime.sendMessage`.
- Background worker: normalises claude.ai API shape → `Conversation` schema; upserts via Dexie. `CONV_LIST` preserves existing messages; `CONV_DETAIL` full-upserts. `SYNC` opens/focuses claude.ai tab.
- SyncButton + `useSync`: sends `{ type: 'SYNC' }` in extension context; simulates in web.
- `MarkdownNote.tsx`: parses `## ` headings, `-`/`* ` bullets, `**bold**`/`*italic*`. No external deps.
- `generateDispatch()`: gathers this week's distills, calls Claude Haiku, upserts `Dispatch` record.
- `DispatchView`: `RealDispatch` from Dexie + regenerate button; `FixtureDispatch` fallback with "generate real dispatch" button.
- Drag-to-pin in `Mindmap.tsx`: `dragMovedRef` distinguishes click from drag; pin persisted to `db.nodes.position`. Pinned nodes show `⊕` indicator. "⊕ pinned" badge in NotePanel kicker with unpin button.
- Inline editing in `NotePanel`: `EditableTitle` (click-to-edit h2, Enter/Escape/blur commit); `FamilyPicker` (colour-dot dropdown, four families).
- Related nodes in NotePanel: DB same-family (limit 5) for real nodes; EDGES tuple adjacency for fixture nodes (fixed prior `.source`/`.target` bug on tuple type).
- Step 0 validate: `validateCluster()` in pipeline.ts; runs for ≥ 5-conversation nodes; Haiku, 256 tokens. `runPipeline(id, skipValidate?)`. Error surfaces in NotePanel.
- Export .md: ↓ export .md button in NotePanel; YAML frontmatter (title, family, exported date) + raw markdown; Blob + URL.createObjectURL download.
- Node merge: `MergePanel` component in NotePanel; select target node from DB; combines `conversation_ids`, deletes target's distills + note + node record.
- Obsidian vault export: `src/lib/vault.ts` `exportVault()` — reads all nodes + notes from Dexie, creates JSZip with one `.md` per note (YAML frontmatter: title, family, recency, conversations, exported) + `_index.md` (wikilinks to all noted nodes). "↓ export vault" button in App header. Downloads `folio-vault-{date}.zip`.
- Onboarding: `OnboardingModal` shown once when DB is empty (both `conversations` and `nodes` tables are 0-count after queries resolve). Three steps: (1) Welcome, (2) API key input (saves to localStorage + chrome.storage), (3) Get data (option A: ↑ import zip; option B: extension description). Dismissed by clicking skip or completing flow; writes `folio_onboarded=1` to localStorage so it never shows again.

**Immediate next steps:**
1. Settings v2 — sync interval + family taxonomy customization (v1)
2. `src/clustering/embed.ts` — HDBSCAN path (deferred; `clusterWithClaude` is working fine)

---

## 10. Pitfalls to remember

- **claude.ai DOM/API will change.** Anything fragile must fail loudly with logs.
- **IndexedDB has ~50MB quota** before browser asks permission. Plan to compress message content with lz-string when conv count grows.
- **Service workers don't keep state across restarts.** Sync logic must persist position in `chrome.storage`.
- **CSP on claude.ai blocks injecting scripts.** Content script uses `chrome.runtime.sendMessage` to talk to background worker; background worker does the real fetch interception.
- **API key in browser is visible in DevTools.** Fine for self-use. Move behind a proxy before shipping.

---

## 11. Open questions (do not invent answers)

- **Clustering algorithm**: Path B (Claude-as-clusterer) first; switch to Path A (HDBSCAN) only if Path B breaks at scale. Decision deferred to v0.5.
- **Distribution**: Chrome extension only? Web app + JSON upload? Both? Deferred until self-use proves the product.
- **Family taxonomy customization**: hardcoded for now. v1 will let users define their own.
- **Server-side storage**: never, until there's a non-trivial reason.

---

# 12. Full source code (current state)

Files below are the actual current state of the project. Use them as
ground truth.

## `package.json`

```json
{
  "name": "folio",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.95.1",
    "d3": "^7.9.0",
    "dexie": "^4.4.2",
    "dexie-react-hooks": "^4.4.0",
    "jszip": "^3.10.1",
    "react": "^19.2.5",
    "react-dom": "^19.2.5",
    "zustand": "^5.0.13"
  },
  "devDependencies": {
    "@crxjs/vite-plugin": "^2.4.0",
    "@types/chrome": "^0.1.42",
    "@types/d3": "^7.4.3",
    "@types/jszip": "^3.4.0",
    "@types/node": "^24.12.2",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^6.0.1",
    "autoprefixer": "^10.5.0",
    "postcss": "^8.5.14",
    "tailwindcss": "^3.4.19",
    "typescript": "~6.0.2",
    "vite": "^8.0.10"
  }
}
```

## `tsconfig.json` / `tsconfig.app.json`

The project uses TypeScript project references. `tsconfig.json` delegates to `tsconfig.app.json` (browser code) and `tsconfig.node.json` (Vite config).

```json
// tsconfig.app.json
{
  "compilerOptions": {
    "target": "es2023",
    "lib": ["ES2023", "DOM"],
    "module": "esnext",
    "types": ["vite/client", "chrome"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

## `vite.config.ts`

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './src/extension/manifest.json'

// Two build modes:
//   VITE_TARGET=extension  → Chrome extension via CRXJS
//   (default)              → standalone web app
const isExtension = process.env.VITE_TARGET === 'extension'

export default defineConfig({
  plugins: isExtension
    ? [react(), crx({ manifest })]
    : [react()],
  build: {
    rollupOptions: isExtension
      ? {}
      : { input: { main: 'index.html' } },
  },
})
```

## `index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Folio</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

## `src/main.tsx`

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './ui/styles/folio.css'
import App from './ui/App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

## `src/lib/types.ts`

> **Deprecated.** Types have moved to `src/data/schema.ts`. The `types.ts` file
> no longer exists. `FAMILY_COLORS` and `RECENCY_OPACITY` live in `src/lib/fixtures.ts`.
> Do not import from `src/lib/types` — it will not resolve.

## `src/lib/fixtures.ts`

```ts
// All mock data for v0 self-use. When Dexie is wired up, replace these
// exports with hooks that read from the database. Components shouldn't
// know whether data comes from fixtures or IndexedDB.

import type { NodeData, EdgeTuple, NoteContent, WeeklyDispatch } from './types';

export const NODES: NodeData[] = [
  { id: 'cassette-jury', label: 'Cassette Jury', x: 0.32, y: 0.42, count: 23, family: 'creative', recency: 'now' },
  { id: 'threejs', label: 'Three.js + Shaders', x: 0.48, y: 0.30, count: 14, family: 'creative', recency: 'now' },
  { id: 'rapier', label: 'Rapier physics', x: 0.58, y: 0.42, count: 6, family: 'creative', recency: 'now' },
  { id: 'komar', label: 'Komar onboarding', x: 0.72, y: 0.55, count: 19, family: 'work', recency: 'now' },
  { id: 'fashion-ai', label: 'AI in fashion', x: 0.82, y: 0.40, count: 11, family: 'work', recency: 'recent' },
  { id: 'mudweiser', label: 'Mudweiser ad', x: 0.20, y: 0.62, count: 9, family: 'creative', recency: 'recent' },
  { id: 'comfyui', label: 'ComfyUI pipeline', x: 0.32, y: 0.72, count: 8, family: 'creative', recency: 'recent' },
  { id: 'opt', label: 'STEM OPT / I-983', x: 0.78, y: 0.74, count: 5, family: 'admin', recency: 'now' },
  { id: 'apartment', label: 'Jersey City lease', x: 0.62, y: 0.78, count: 7, family: 'life', recency: 'now' },
  { id: 'mihoyo', label: 'miHoYo interview', x: 0.10, y: 0.32, count: 6, family: 'work', recency: 'past' },
  { id: 'lora', label: 'LoRA training (abandoned)', x: 0.22, y: 0.22, count: 4, family: 'creative', recency: 'past' },
  { id: 'codesmith', label: 'Codesmith × Treasury', x: 0.50, y: 0.62, count: 5, family: 'work', recency: 'recent' },
  { id: 'google-fellowship', label: 'Google Creative Fellowship', x: 0.42, y: 0.18, count: 3, family: 'work', recency: 'past' },
];

export const EDGES: EdgeTuple[] = [
  ['cassette-jury', 'threejs'], ['cassette-jury', 'rapier'], ['cassette-jury', 'lora'],
  ['cassette-jury', 'comfyui'], ['threejs', 'rapier'], ['threejs', 'mihoyo'],
  ['komar', 'fashion-ai'], ['komar', 'opt'], ['komar', 'apartment'],
  ['fashion-ai', 'comfyui'], ['mudweiser', 'comfyui'], ['mudweiser', 'codesmith'],
  ['lora', 'mihoyo'], ['google-fellowship', 'mihoyo'], ['codesmith', 'fashion-ai'],
  ['cassette-jury', 'google-fellowship'],
];

export const NOTES: Record<string, NoteContent> = {
  'cassette-jury': {
    title: 'Cassette Jury',
    sub: '23 conversations · oldest Aug 14, 2025 · last touched 2 days ago',
    body: [
      { kind: 'h', text: 'Where it stands now' },
      { kind: 'p', text: "Eleven juror personas (Margot Chen, Murray Fink, Frank Kowalski et al). Two-pass deliberation with structured JSON + XML-tagged outputs. As of January, fully 3D in WebGL — Three.js rendering, Rapier physics, custom GLSL shaders, GLB assets out of Blender." },
      { kind: 'h', text: 'How it got here' },
      { kind: 'p', text: "You started in October trying to LoRA-train each juror on an RTX 5060. Hardware wasn't enough. By mid-November you pivoted to prompt-extraction + a Style Anchor system for cross-character coherence — cleaner, less brittle. The 3D upgrade in January was a separate decision; you wanted the jurors to *occupy space*, not just speak." },
      { kind: 'h', text: 'Loose threads' },
      { kind: 'q', text: "On Dec 3 you worried the deliberation felt \"too procedural\" and wanted emergent disagreement between jurors. You haven't come back to this. Worth a revisit?" },
      { kind: 'q', text: 'The Style Anchor never got a formal spec — it lives in three different conversations with slightly different definitions.' },
    ],
    related: ['threejs', 'rapier', 'lora', 'comfyui', 'google-fellowship'],
  },
  'komar': {
    title: 'Komar onboarding',
    sub: '19 conversations · started Feb 2026 · ongoing',
    body: [
      { kind: 'h', text: 'Where it stands now' },
      { kind: 'p', text: "Full-time on-site as of early May after the negotiated part-time remote stint. AI Creative Technologist at a family-owned apparel company. Benefits locked: HSA plan, 5% 401k for the match." },
      { kind: 'h', text: 'The arc you went through' },
      { kind: 'p', text: "Declined the offer → reversed → negotiated part-time remote → went full-time. Three weeks of indecision, mostly about whether it was the right *kind* of meaningful work. The Google Creative Residency reach-out arrived right in the middle and made things harder." },
      { kind: 'h', text: 'Loose threads' },
      { kind: 'q', text: "You framed your positioning as \"AI fluency is scarce, fashion is learnable.\" Has that held up after a month inside?" },
    ],
    related: ['fashion-ai', 'opt', 'apartment', 'google-fellowship'],
  },
  'threejs': {
    title: 'Three.js + Shaders',
    sub: '14 conversations · always around',
    body: [
      { kind: 'h', text: 'What this node is really about' },
      { kind: 'p', text: "Mostly Cassette Jury work, but it bleeds into the miHoYo interview prep and a couple of one-offs. Topics span GLSL fragment shaders, GLB import quirks, Rapier↔Three sync, and orbit controls." },
      { kind: 'h', text: 'Recurring sticking points' },
      { kind: 'p', text: "Shader/lighting parity between Blender preview and Three.js render came up four separate times across two months. You never wrote it down — the same debugging happens fresh each time." },
    ],
    related: ['cassette-jury', 'rapier', 'mihoyo'],
  },
};

export const WEEKLY: WeeklyDispatch = {
  range: 'Week of May 3 – May 9',
  active: ['cassette-jury', 'rapier', 'komar', 'opt', 'apartment'],
  emerged: ['rapier'],
  narrative: "Three regions lit up this week: Cassette Jury's physics layer, settling into Komar, and the apartment / OPT admin cluster. Rapier surfaced as its own node for the first time — it had been folded inside Three.js until now.",
  keywords: ['Rapier collision', 'GLSL parity', 'HSA reimbursement', 'Grove Street lease', 'I-983 timeline'],
  ignored: [
    { day: 'Tue', q: 'Should I split the deliberation prompt into two passes?', advice: 'Yes — split it.', mia: 'Held off. Wanted to watch token usage first.', verdict: 'open' },
    { day: 'Wed', q: '5% vs 10% on the 401k contribution?', advice: 'Go to 10%.', mia: 'Stayed at 5%.', verdict: 'principled' },
    { day: 'Fri', q: 'Refactor the juror config files into one schema?', advice: 'Refactor now, before adding more.', mia: 'Said "later."', verdict: 'will-regret' },
  ],
};
```

## `src/store/ui.ts`

```ts
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
```

## `src/store/sync.ts`

```ts
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
```

## `src/ui/App.tsx`

```tsx
import { useState } from 'react'
import './styles/folio.css'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../data/db'
import { useUIStore } from '../store/ui'
import { SyncButton } from './components/SyncButton'
import { MapView } from './views/MapView'
import { DispatchView } from './views/DispatchView'
import { NotePanel } from './views/NotePanel'
import { ImportModal } from './components/ImportModal'
import { BuildMapPanel } from './components/BuildMapPanel'
import { SettingsModal } from './components/SettingsModal'

export default function App() {
  const { view, setView } = useUIStore()
  const [showImport, setShowImport] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  const convCount = useLiveQuery(() => db.conversations.count(), []) ?? 0
  const nodeCount = useLiveQuery(() => db.nodes.count(), []) ?? 0
  const needsMapBuild = convCount > 0 && nodeCount === 0

  return (
    <>
      <header className="h-header">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 0 }}>
          <span className="h-brand">Folio</span>
          <span className="h-brand-sub">knowledge map</span>
          <SyncButton />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="h-sync" onClick={() => setShowImport(true)}>↑ import zip</button>
          <button className="h-sync" onClick={() => setShowSettings(true)} title="Settings">⚙</button>
          <nav className="h-toolbar">
            <button className={`h-tab${view === 'map' ? ' active' : ''}`} onClick={() => setView('map')}>Map</button>
            <button className={`h-tab${view === 'weekly' ? ' active' : ''}`} onClick={() => setView('weekly')}>Dispatch</button>
          </nav>
        </div>
      </header>

      {view === 'map' ? (
        <div className="h-body">
          <MapView />
          {needsMapBuild ? <BuildMapPanel conversationCount={convCount} /> : <NotePanel />}
        </div>
      ) : (
        <div className="h-body"><DispatchView /></div>
      )}

      {showImport && <ImportModal onClose={() => setShowImport(false)} onImported={() => setShowImport(false)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </>
  )
}
```

## `src/ui/hooks/useNodes.ts`

```ts
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'
import { NODES } from '../../lib/fixtures'
import { useUIStore } from '../../store/ui'
import type { FixtureNode } from '../../lib/fixtures'
import type { Node } from '../../data/schema'

function dbNodeToFixture(n: Node, idx: number, total: number): FixtureNode {
  const cols = Math.ceil(Math.sqrt(total))
  const col = idx % cols
  const row = Math.floor(idx / cols)
  const margin = 0.12
  const step = (1 - 2 * margin) / Math.max(cols - 1, 1)
  return {
    id: n.id, label: n.label, family: n.family, recency: n.recency,
    count: 0,
    x: n.position ? n.position.x : margin + col * step,
    y: n.position ? n.position.y : margin + row * step,
    position: n.position,
  }
}

/** Returns visible nodes filtered by lens. DB data when available, fixtures as fallback. */
export function useNodes(): FixtureNode[] {
  const filter = useUIStore((s) => s.filter)
  const dbNodes = useLiveQuery(async () => {
    const nodes = await db.nodes.toArray()
    if (!nodes.length) return null
    const counts = new Map<string, number>()
    const distills = await db.distills.toArray()
    for (const d of distills) counts.set(d.node_id, (counts.get(d.node_id) ?? 0) + 1)
    return nodes.map((n, i) => { const fx = dbNodeToFixture(n, i, nodes.length); fx.count = counts.get(n.id) ?? 0; return fx })
  }, [])
  const source = dbNodes ?? NODES
  return filter === 'all' ? source : source.filter((n) => n.family === filter)
}
```

## `src/ui/hooks/useNote.ts`

```ts
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'
import { NOTES, NODES, fallbackNote } from '../../lib/fixtures'
import type { FixtureNote } from '../../lib/fixtures'

/** Priority: Dexie notes → fixture notes → fallback skeleton. */
export function useNote(nodeId: string): FixtureNote | null {
  const dbNote = useLiveQuery(() => db.notes.get(nodeId), [nodeId])
  if (dbNote) {
    return { title: nodeId, sub: '', body: [{ kind: 'p', text: dbNote.markdown }], related: [] }
  }
  if (NOTES[nodeId]) return NOTES[nodeId]
  const node = NODES.find((n) => n.id === nodeId)
  return node ? fallbackNote(node) : null
}
```

## `src/ui/views/MapView.tsx`

Contains the lens filter strip and renders `<Mindmap nodes={nodes} edges={EDGES} />`.  
Reads nodes via `useNodes()` (Dexie → fixtures fallback). Edges come from `EDGES` fixture (static for now; will be derived from node co-occurrence later).

## `src/ui/views/NotePanel.tsx`

Displays the synthesized note for the currently selected node. Reads via `useNote(selected)`.  
Includes a `↻ regenerate note` button that calls `runPipeline(selected)` and shows loading/error state.

## `src/ui/components/Mindmap.tsx`

SVG mindmap. Props: `nodes: FixtureNode[]`, `edges: EdgePair[]`.  
Uses `computeForceLayout()` via `useEffect` (runs after container is measured by `ResizeObserver`).  
Fallback: proportional `n.x * dims.w` while layout is computing.  
Edge highlighting: connected to `hover ?? selected` are `.lit`, others are `.dim` when hovering.

## `src/ui/views/DispatchView.tsx`

Still fixture-driven (`WEEKLY` from `src/lib/fixtures.ts`). Real generation deferred to v0.5.

## `src/ui/styles/folio.css`

CSS file path changed from `src/ui/styles.css` → `src/ui/styles/folio.css`. Same tokens, same `h-` prefix. Added `im-*` classes for the import/settings modals. Key tokens:

```css
:root {
  --paper:        #F4EFE4;
  --paper-deep:   #ECE5D5;
  --paper-edge:   #DDD3BD;
  --ink:          #2B2620;
  --ink-soft:     #5B554B;
  --ink-faint:    #8A8478;
  --rule:         #C9BFA8;
  --accent:       #8B4D2E;
  --accent-soft:  #B07654;
  --moss:         #3F5D4A;
}
```

Component classes: `h-` prefix (UI chrome), `im-` prefix (modals).

---

## `src/data/schema.ts`

All TypeScript interfaces. Ground truth for the data layer. Key types: `Conversation`, `Message`, `Attachment`, `Node`, `DistillData`, `Distill`, `Note`, `IgnoredAdvice`, `Dispatch`.

## `src/data/db.ts`

```ts
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
```

## `src/llm/client.ts`

```ts
export async function getClient(): Promise<Anthropic> {
  // Priority: chrome.storage.local → localStorage → VITE_ANTHROPIC_KEY
  let apiKey: string | undefined
  if (typeof chrome !== 'undefined' && chrome.storage) {
    const r = await chrome.storage.local.get('anthropic_api_key')
    apiKey = r.anthropic_api_key as string | undefined
  }
  if (!apiKey) apiKey = localStorage.getItem('anthropic_api_key') ?? undefined
  if (!apiKey) apiKey = import.meta.env.VITE_ANTHROPIC_KEY as string | undefined
  if (!apiKey) throw new Error('No Anthropic API key. Enter it in Settings or set VITE_ANTHROPIC_KEY in .env.local')
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
}
```

## `src/llm/pipeline.ts`

- `distillConversation(conv, nodeId, nodeLabel)` — Haiku, cached by `[conv.id, nodeId]` + `conversationContentHash`. Strips JSON from code fences.
- `synthesizeNode(nodeId, nodeLabel, distills)` — Opus, cached by sorted `digest_hashes`.
- `runPipeline(nodeId)` — full flow for one node: get convs → distill all (parallel) → synthesize → update `last_synthesized`.
- `runPipelineAll(onProgress?)` — runs all nodes sequentially.

## `src/clustering/cluster.ts`

`clusterWithClaude(onProgress?)` — sends all conversation titles + first 400 chars of first user message to Claude Opus. Returns 8-25 nodes with correct `family` and `recency` computed from `updated_at` (< 7d = `now`, < 30d = `recent`, else `past`). Upserts to Dexie preserving `manual_edits` and `position` from existing nodes.

## `src/clustering/layout.ts`

`computeForceLayout(nodes, edges, width, height): LayoutNode[]` — D3-force simulation, 200 ticks synchronous. Forces: link (d=120, s=0.4), manyBody (-300), center, collision (r=40). Pins nodes with `node.position`. Returns `LayoutNode[]` with `px`/`py` pixel coords.

## `src/lib/import.ts`

`parseClaudeExportZip(file: File): Promise<ImportResult>` — parses Anthropic's official `claude_export.zip`. Reads `conversations.json` from ZIP root. Maps `chat_messages[].sender: 'human'|'assistant'` → `role: 'user'|'assistant'`. Sets `imported_from: 'export_zip'`. Returns `{ imported, skipped, errors }`.

## `src/lib/hash.ts`

- `hashString(input: string): Promise<string>` — SHA-256 via `crypto.subtle` (Web API, no Node.js).
- `conversationContentHash(messages)` — synchronous djb2 for cache invalidation.

## `src/ui/components/BuildMapPanel.tsx`

Shown when `convCount > 0 && nodeCount === 0`. Runs `clusterWithClaude()` then `runPipelineAll()` with progress strings. On done: "View map" button reloads the page. Shows `.env.local` hint if API key missing.

## `src/ui/components/ImportModal.tsx`

Drag-drop or click-to-browse `.zip` upload. Phases: `idle → parsing → writing → done | error`. On done: shows imported/skipped counts and error list.

## `src/ui/components/SettingsModal.tsx`

Single field: Anthropic API key (type=password). Saves to `localStorage` (web) or `chrome.storage.local` (extension). Has Save + Clear buttons.

---

# 13. How to help Mia

When she asks for help:
- **Default to extending, not rewriting.** The architecture is intentional.
- **Respect the layer boundaries.** UI doesn't read from claude.ai directly. LLM calls don't touch the Zustand store.
- **Match the voice rules** when generating any user-facing content (notes, dispatches).
- **Don't add backend code** unless explicitly asked.
- **Don't add new dependencies** unless there's a reason. Especially: do not add Next.js, Redux, react-flow, Drizzle, Prisma, or any UI component library.
- **When extending L2 prompts, use the JSON schema in section 6 verbatim.** Do not invent new fields.
- **Reach for `useLiveQuery` from `dexie-react-hooks`** when reading from Dexie in components. Don't call Dexie directly from components.

If a request would require breaking any of the above, ask her first.
