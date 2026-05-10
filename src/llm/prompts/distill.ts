/**
 * Step 1 — Distill a single conversation within the context of a node.
 * One call per (conversation, node) pair. Uses claude-haiku-3 for cost.
 *
 * Slots:
 *   {{node_label}}     — human label of the node, e.g. "Cassette Jury"
 *   {{conversation}}   — full conversation transcript as markdown
 */
export const DISTILL_PROMPT = `\
You are analyzing a conversation in the context of the topic node "{{node_label}}".

<conversation>
{{conversation}}
</conversation>

Extract a structured distill. Reply with JSON matching this exact shape:
{
  "subject": "one-sentence summary of what this conversation was about",
  "decisions": [
    { "what": "string", "status": "settled | tentative | deferred" }
  ],
  "facts": ["string"],
  "open_questions": ["string"],
  "advice_not_taken": [
    { "claude_said": "string", "mia_chose": "string", "her_reason": "string | null" }
  ],
  "emotional_texture": "string | null"
}

Be specific and concrete. Quote the conversation where helpful.
`
