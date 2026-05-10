// ─── Data schema (mirrors FOLIO.md exactly) ──────────────────────────────────

export interface Attachment {
  id: string;
  filename: string;
  content_type: string;
  size: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;          // markdown text
  created_at: number;
  attachments?: Attachment[];
}

export interface Conversation {
  id: string;               // claude.ai's UUID
  title: string;
  created_at: number;       // unix ms
  updated_at: number;
  project_id: string | null;
  model: string;
  message_count: number;
  messages: Message[];
  imported_from: 'extension' | 'export_zip';
  last_synced: number;
}

export interface Node {
  id: string;               // e.g. 'cassette-jury'
  label: string;
  family: 'creative' | 'work' | 'life' | 'admin';
  conversation_ids: string[];
  position?: { x: number; y: number };  // user-pinned; null = auto-layout
  recency: 'now' | 'recent' | 'past';
  created_at: number;
  last_synthesized: number;
  manual_edits?: {
    label_override?: string;
    family_override?: string;
    pinned?: boolean;
  };
}

export interface DistillData {
  subject: string;
  decisions: { what: string; status: 'settled' | 'tentative' | 'deferred' }[];
  facts: string[];
  open_questions: string[];
  advice_not_taken: {
    claude_said: string;
    mia_chose: string;
    her_reason: string | null;
  }[];
  emotional_texture: string | null;
}

export interface Distill {
  conversation_id: string;
  node_id: string;
  conversation_hash: string;
  data: DistillData;
  created_at: number;
}

export interface Note {
  node_id: string;          // primary key
  markdown: string;
  digest_hashes: string[];
  created_at: number;
}

export interface IgnoredAdvice {
  day: string;
  q: string;
  advice: string;
  mia: string;
  verdict: 'open' | 'principled' | 'will-regret';
}

export interface Dispatch {
  id: string;               // e.g. 'dispatch-2026-W19'
  week_start: number;
  week_end: number;
  active_node_ids: string[];
  emerged_node_ids: string[];
  keywords: string[];
  narrative: string;
  ignored_advice: IgnoredAdvice[];
  created_at: number;
}
