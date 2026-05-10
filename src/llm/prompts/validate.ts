/**
 * Step 0 — Validate that a cluster is coherent enough to synthesize.
 * Runs only when cluster size >= 5 conversations.
 *
 * Slot: {{conversations}} — JSON array of { title, first_message } objects.
 */
export const VALIDATE_PROMPT = `\
You are a knowledge-organization assistant. Given a list of conversation titles and opening messages, decide whether they form a coherent topic cluster.

<conversations>
{{conversations}}
</conversations>

Reply with a JSON object:
{
  "is_coherent": boolean,
  "reason": "one sentence"
}
`
