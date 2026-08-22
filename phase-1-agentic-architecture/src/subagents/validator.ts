import { runAgentLoop } from "../loop.js";
import type { AgentLoopOptions } from "../types.js";
import { extractText } from "../utils.js";

export interface ValidationResult {
  readonly passed: boolean;
  readonly issues: string[];
}

const VALIDATOR_SYSTEM_PROMPT = [
  "You are a validator subagent. Check the given content against the given criteria.",
  "Respond with ONLY a JSON object (no prose, no markdown fences) shaped like:",
  '{ "passed": boolean, "issues": string[] }',
].join("\n");

export class ValidatorAgent {
  async validate(content: string, criteria: string, options: AgentLoopOptions): Promise<ValidationResult> {
    const userMessage = `Content to check:\n${content}\n\nCriteria:\n${criteria}`;

    const response = await runAgentLoop(userMessage, {
      ...options,
      system: VALIDATOR_SYSTEM_PROMPT,
      tools: [],
    });

    const text = extractText(response);

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error(`Validation returned invalid JSON. Raw text: ${text}`);
    }

    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new Error(`Validation expected an object, got ${Array.isArray(parsed) ? "array" : typeof parsed}`);
    }

    const record = parsed as Record<string, unknown>;

    if (typeof record["passed"] !== "boolean") {
      throw new Error('Validation result is missing boolean field "passed"');
    }

    if (!Array.isArray(record["issues"])) {
      throw new Error('Validation result is missing array field "issues"');
    }

    const issues: string[] = [];
    record["issues"].forEach((issue, index) => {
      if (typeof issue !== "string") {
        throw new Error(`Validation "issues" item at index ${index} is not a string`);
      }
      issues.push(issue);
    });

    return { passed: record["passed"], issues };
  }
}
