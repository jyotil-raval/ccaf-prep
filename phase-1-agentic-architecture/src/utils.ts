import type Anthropic from "@anthropic-ai/sdk";

/**
 * Concatenates all text blocks in a message's content, in order.
 * Returns "" if the message has no text blocks — callers requiring
 * non-empty text should check explicitly.
 */
export function extractText(response: Anthropic.Message): string {
  return response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");
}

/**
 * Placeholder seam for future content sanitization (e.g. length limits,
 * stripping injected instructions) when content produced by one agent is
 * passed as input to another agent. Currently a no-op by design, not an
 * oversight — callers should route agent-to-agent content through this
 * function so future sanitization only needs to change here.
 */
export function sanitizeForAgentInput(text: string): string {
  return text;
}
