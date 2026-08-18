import type Anthropic from "@anthropic-ai/sdk";
import type { MessageParam, Tool, ToolResultBlockParam } from "@anthropic-ai/sdk/resources/messages";
import type { AgentLoopOptions, ToolDefinition } from "./types.js";

/**
 * Runs the send -> inspect stop_reason -> (execute tools -> repeat) cycle
 * until the model stops for a reason other than `tool_use`.
 */
export async function runAgentLoop(userMessage: string, options: AgentLoopOptions): Promise<Anthropic.Message> {
  const history: MessageParam[] = [{ role: "user", content: userMessage }];
  const toolsByName = new Map(options.tools.map((tool) => [tool.name, tool]));
  const toolParams: Tool[] = options.tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.inputSchema,
  }));

  for (;;) {
    const response = await options.client.messages.create({
      model: options.model,
      max_tokens: options.maxTokens ?? 1024,
      messages: history,
      tools: toolParams,
      ...(options.system !== undefined ? { system: options.system } : {}),
    });

    history.push({ role: "assistant", content: response.content });

    switch (response.stop_reason) {
      case "tool_use":
        break;
      case "end_turn":
      case "stop_sequence":
        return response;
      case "max_tokens":
        throw new Error("Response truncated at max_tokens; refusing to treat partial content as complete.");
      case "refusal":
        throw new Error("Model declined the request (safety refusal); not a normal answer.");
      case "pause_turn":
      case "model_context_window_exceeded":
        throw new Error(
          `Unhandled stop_reason "${response.stop_reason}": this loop doesn't use server tools or hit context limits yet.`,
        );
      case null:
        throw new Error("Received a null stop_reason from a non-streaming response.");
      default: {
        const _exhaustive: never = response.stop_reason;
        throw new Error(`Unhandled stop_reason: ${_exhaustive}`);
      }
    }

    const toolResults: ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type !== "tool_use") continue;
      toolResults.push(await runTool(block.id, block.name, block.input, toolsByName));
    }

    history.push({ role: "user", content: toolResults });
  }
}

async function runTool(
  toolUseId: string,
  name: string,
  input: unknown,
  toolsByName: ReadonlyMap<string, ToolDefinition>,
): Promise<ToolResultBlockParam> {
  const tool = toolsByName.get(name);
  if (!tool) {
    return { type: "tool_result", tool_use_id: toolUseId, content: `Unknown tool: ${name}`, is_error: true };
  }

  try {
    const content = await tool.execute(input);
    return { type: "tool_result", tool_use_id: toolUseId, content, is_error: false };
  } catch (error) {
    const content = error instanceof Error ? error.message : String(error);
    return { type: "tool_result", tool_use_id: toolUseId, content, is_error: true };
  }
}
