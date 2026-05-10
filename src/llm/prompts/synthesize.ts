/**
 * Step 2 — Synthesize all distills for a node into a single note.
 * One call per node. Uses claude-opus for quality.
 *
 * Slots:
 *   {{node_label}}  — human label of the node
 *   {{distills}}    — JSON array of DistillData objects
 */
export const SYNTHESIZE_PROMPT = `\
You are writing a synthesis note for the topic "{{node_label}}".

You have been given distilled summaries from {{count}} conversations on this topic:

<distills>
{{distills}}
</distills>

Write a synthesis note in the following format. Use clear, direct prose — no bullet lists in the body sections. Write as if explaining the topic's arc to the person who lived it.

## Where it stands now
[Current state — what exists, what was decided, what is in use]

## How it got here
[The arc — key pivots, abandoned paths, turning points]

## Loose threads
[Open questions and unresolved tensions, phrased as questions to the reader]

Keep each section to 2–4 sentences. Be concrete; reference specific decisions and facts from the distills.
`
