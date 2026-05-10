/**
 * Embed a text string using OpenAI text-embedding-3-small.
 * Stub — real implementation deferred to v0.5 (Path A clustering).
 *
 * See FOLIO.md open question: "How does clustering actually happen?"
 */
export async function embedText(_text: string): Promise<number[]> {
  throw new Error('Embedding not yet implemented. Using Path B (Claude-as-clusterer) for v0.')
}
