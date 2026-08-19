import type Anthropic from '@anthropic-ai/sdk';
import { runAgentLoop } from './loop.js';
import type { AgentLoopOptions } from './types.js';

export interface Subtask {
  readonly id: string;
  readonly description: string;
}

export type SubtaskResult = { status: 'success'; subtaskId: string; result: Anthropic.Message } | { status: 'error'; subtaskId: string; error: string };

const DECOMPOSITION_SYSTEM_PROMPT = [
  "Break the user's request into 2 or more discrete, independently-executable subtasks.",
  'Respond with ONLY a JSON array (no prose, no markdown fences) of objects shaped like:',
  '[{ "id": "string", "description": "string" }, ...]'
].join('\n');

export async function decomposeTask(userRequest: string, options: AgentLoopOptions): Promise<Subtask[]> {
  const response = await runAgentLoop(userRequest, {
    ...options,
    system: DECOMPOSITION_SYSTEM_PROMPT,
    tools: []
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`Decomposition returned invalid JSON. Raw text: ${text}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error(`Decomposition expected array, got ${typeof parsed}`);
  }

  if (parsed.length < 2) {
    throw new Error(`Decomposition produced only ${parsed.length} subtask(s), expected 2+`);
  }

  const subtasks: Subtask[] = [];
  for (const [index, item] of parsed.entries()) {
    if (typeof item !== 'object' || item === null) {
      throw new Error(`Subtask at index ${index} is not an object`);
    }

    const record = item as Record<string, unknown>;

    if (typeof record['id'] !== 'string') {
      throw new Error(`Subtask at index ${index} is missing string field "id"`);
    }
    if (typeof record['description'] !== 'string') {
      throw new Error(`Subtask at index ${index} (id: "${record['id']}") is missing string field "description"`);
    }

    subtasks.push({ id: record['id'], description: record['description'] });
  }

  return subtasks;
}

export async function runSequential(subtasks: readonly Subtask[], options: AgentLoopOptions): Promise<SubtaskResult[]> {
  const results: SubtaskResult[] = [];

  for (const subtask of subtasks) {
    try {
      const result = await runAgentLoop(subtask.description, options);
      results.push({ status: 'success', subtaskId: subtask.id, result });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({ status: 'error', subtaskId: subtask.id, error: message });
    }
  }

  return results;
}

export async function runParallel(subtasks: readonly Subtask[], options: AgentLoopOptions): Promise<SubtaskResult[]> {
  const settled = await Promise.allSettled(subtasks.map((subtask) => runAgentLoop(subtask.description, options)));

  return settled.map((outcome, index) => {
    const subtask = subtasks[index];
    if (subtask === undefined) {
      throw new Error(`No subtask found at index ${index} for settled result`);
    }

    switch (outcome.status) {
      case 'fulfilled':
        return { status: 'success', subtaskId: subtask.id, result: outcome.value };
      case 'rejected': {
        const error = outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason);
        return { status: 'error', subtaskId: subtask.id, error };
      }
    }
  });
}

export async function compareSequentialVsParallel(subtasks: readonly Subtask[], options: AgentLoopOptions): Promise<{ sequential: SubtaskResult[]; parallel: SubtaskResult[] }> {
  const seqStart = Date.now();
  console.log(`[sequential] start ${new Date(seqStart).toISOString()}`);
  const sequential = await runSequential(subtasks, options);
  const seqEnd = Date.now();
  console.log(`[sequential] end   ${new Date(seqEnd).toISOString()} (${seqEnd - seqStart}ms total)`);

  const parStart = Date.now();
  console.log(`[parallel]   start ${new Date(parStart).toISOString()}`);
  const parallel = await runParallel(subtasks, options);
  const parEnd = Date.now();
  console.log(`[parallel]   end   ${new Date(parEnd).toISOString()} (${parEnd - parStart}ms total)`);

  console.log(`sequential: ${seqEnd - seqStart}ms, parallel: ${parEnd - parStart}ms`);

  return { sequential, parallel };
}
