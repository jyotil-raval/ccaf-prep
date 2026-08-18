import type Anthropic from "@anthropic-ai/sdk";

/**
 * A tool the agent loop can offer to the model and execute locally when the
 * model emits a matching `tool_use` block.
 */
export interface ToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Anthropic.Tool.InputSchema;
  execute(input: unknown): Promise<string>;
}

export interface AgentLoopOptions {
  readonly client: Anthropic;
  readonly model: string;
  readonly tools: readonly ToolDefinition[];
  readonly maxTokens?: number;
  readonly system?: string;
}
