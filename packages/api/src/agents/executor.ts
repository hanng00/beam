import { generateText, stepCountIs } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { toolRegistry } from './registry'
import { getAgentDefinition, listAgents } from './definitions'
import { createCredentialFetcher } from './credentials'
import type {
  ExecutionContext,
  RegistryContext,
  AgentResult,
} from './interfaces'

export { getAgentDefinition, listAgents }

export interface ExecuteAgentOptions {
  databaseUrl?: string
}

function resolveModel(modelId: string) {
  if (modelId.startsWith('claude-')) {
    return anthropic(modelId)
  }
  return anthropic(modelId)
}

/**
 * Execute an agent with the given context.
 * Orchestrates: load definition → build context → get tools → call AI SDK → return result.
 */
export async function executeAgent(
  ctx: ExecutionContext,
  options?: ExecuteAgentOptions
): Promise<AgentResult> {
  const agent = await getAgentDefinition(ctx.agentId, ctx.workspaceId)
  if (!agent) {
    throw new Error(`Agent not found: ${ctx.agentId}`)
  }

  const databaseUrl = options?.databaseUrl ?? ''
  const getCredentials = createCredentialFetcher(databaseUrl, ctx.workspaceId)

  const registryCtx: RegistryContext = {
    workspaceId: ctx.workspaceId,
    databaseUrl,
    getCredentials,
    spawnAgent: agent.canSpawn.length > 0
      ? (agentId, input) => {
          if (!agent.canSpawn.includes(agentId)) {
            return Promise.reject(
              new Error(`Agent ${ctx.agentId} is not allowed to spawn ${agentId}`)
            )
          }
          return executeAgent(
            {
              workspaceId: ctx.workspaceId,
              agentId,
              sessionId: `${ctx.sessionId}-sub-${Date.now()}`,
              input,
              parentContext: ctx,
            },
            options
          )
        }
      : undefined,
  }

  const tools = await toolRegistry.getToolsForPatterns(agent.toolPatterns, registryCtx)

  if (Object.keys(tools).length === 0) {
    console.warn(`No tools available for agent ${ctx.agentId}`)
  }

  const result = await generateText({
    model: resolveModel(agent.model),
    system: agent.systemPrompt,
    prompt: ctx.input,
    tools,
    stopWhen: stepCountIs(agent.maxSteps),
  })

  const toolCalls: AgentResult['toolCalls'] = []
  for (const step of result.steps) {
    for (const toolCall of step.toolCalls) {
      const toolResult = step.toolResults.find((r) => r.toolCallId === toolCall.toolCallId)
      toolCalls.push({
        toolName: toolCall.toolName,
        args: (toolCall as { input?: Record<string, unknown> }).input ?? {},
        result: toolResult?.output,
      })
    }
  }

  return {
    text: result.text,
    toolCalls,
    usage: {
      promptTokens: result.usage.inputTokens ?? 0,
      completionTokens: result.usage.outputTokens ?? 0,
      totalTokens: result.usage.totalTokens ?? 0,
    },
    finishReason: result.finishReason,
  }
}
