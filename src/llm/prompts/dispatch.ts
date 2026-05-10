/**
 * Step 3 — Generate the weekly Dispatch from a week's worth of distill data.
 * One call per week. Uses claude-haiku for cost.
 *
 * Slots:
 *   {{week_range}}      — human-readable range, e.g. "2–8 May 2026"
 *   {{active_nodes}}    — JSON array of { id, label, family } for active nodes
 *   {{distills}}        — JSON array of DistillData (all distills from this week)
 */
export const DISPATCH_PROMPT = `\
You are writing the weekly Dispatch for Mia — a short, honest summary of the ideas and decisions that occupied her mind this week.

Week: {{week_range}}

<active_nodes>
{{active_nodes}}
</active_nodes>

<distills>
{{distills}}
</distills>

Reply with JSON matching this exact shape:
{
  "narrative": "2-3 sentence paragraph that captures the emotional and intellectual texture of Mia's week. Be specific — name real topics from the distills. Write in the second person ('you', 'your').",
  "keywords": ["up to 8 short keywords or phrases representing the dominant themes"],
  "ignored_advice": [
    {
      "day": "Mon | Tue | Wed | Thu | Fri | Sat | Sun",
      "q": "what Mia asked",
      "advice": "what Claude advised (concise, ≤ 12 words)",
      "mia": "what Mia actually did or chose",
      "verdict": "open | principled | will-regret"
    }
  ]
}

For ignored_advice: only include cases where advice_not_taken exists in the distills. 
- "open": verdict still unknown — she hasn't acted yet
- "principled": she had good reasons to ignore it
- "will-regret": she probably made a mistake

Keep keywords lowercase. Keep all prose concrete and specific. If there is no advice to surface, return an empty array for ignored_advice.
`
