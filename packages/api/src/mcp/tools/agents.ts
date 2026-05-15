import { z } from 'zod'
import { createMcpTool, validateArgs } from '../tool-builder'
import type { ToolContext } from './types'
import { listAgents, executeAgent } from '../../agents/executor'
import '../../agents/providers'

const listAgentsArgsSchema = z.object({}).describe('No arguments required')

const runAgentArgsSchema = z.object({
  agentId: z.string().describe('ID of the agent to run (e.g., seo_reporter, research_agent)'),
  input: z.string().describe('Task description or prompt for the agent'),
  sessionId: z.string().optional().describe('Optional session ID for tracking'),
})

export const agentTools = [
  createMcpTool(
    'list_available_agents',
    'List all available AI agents that can be run for this workspace. Returns agent IDs, names, descriptions, and capabilities.',
    listAgentsArgsSchema
  ),
  createMcpTool(
    'run_agent',
    'Execute an AI agent with a specific task. The agent will use its configured tools to accomplish the task and return results.',
    runAgentArgsSchema
  ),
]

export async function executeListAgents(args: unknown, ctx: ToolContext) {
  validateArgs(listAgentsArgsSchema, args)
  const agents = await listAgents(ctx.workspaceId)

  return {
    agents: agents.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      toolPatterns: a.toolPatterns,
      canSpawn: a.canSpawn,
      model: a.model,
    })),
    total: agents.length,
  }
}

export async function executeRunAgent(args: unknown, ctx: ToolContext) {
  const { agentId, input, sessionId } = validateArgs(runAgentArgsSchema, args)

  const result = await executeAgent(
    {
      workspaceId: ctx.workspaceId,
      agentId,
      sessionId: sessionId ?? `mcp-${Date.now()}`,
      input,
    },
    { databaseUrl: ctx.env.DATABASE_URL }
  )

  return {
    text: result.text,
    toolCalls: result.toolCalls.map((tc) => ({
      tool: tc.toolName,
      args: tc.args,
      result: tc.result,
    })),
    usage: result.usage,
    finishReason: result.finishReason,
  }
}
