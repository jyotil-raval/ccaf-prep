import type Anthropic from "@anthropic-ai/sdk";
import { runAgentLoop } from "../loop.js";
import type { AgentLoopOptions } from "../types.js";

const RESEARCHER_SYSTEM_PROMPT = [
  "You are a research subagent. Your only job is information-gathering: investigating,",
  "reading, and summarizing findings on the task you are given.",
  "You do not write, edit, delete, or otherwise mutate anything — treat your role as strictly read-only.",
  "Report what you find clearly and factually.",
].join("\n");

export class ResearcherAgent {
  async run(task: string, options: AgentLoopOptions): Promise<Anthropic.Message> {
    return runAgentLoop(task, {
      ...options,
      system: RESEARCHER_SYSTEM_PROMPT,
      tools: [],
    });
  }
}
