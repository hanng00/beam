import { tool } from 'ai'
import { z } from 'zod'
import type { ToolProvider, ProviderContext } from '../interfaces'
import { toolRegistry } from '../registry'
import { createDb } from '@beam/db/client'
import { tickets, contextNodes } from '@beam/db/schema'
import { eq } from 'drizzle-orm'

/**
 * Core tools provider - always available
 *
 * Provides fundamental tools for:
 * - Ticket management (create, list, update)
 * - Context retrieval (workspace knowledge base)
 * - Agent spawning (sub-agent execution)
 */
const coreProvider: ToolProvider = {
  id: 'core',
  name: 'Core Tools',
  capabilities: ['tickets', 'context', 'agents'],

  async isAvailable(): Promise<boolean> {
    return true
  },

  getTools(ctx: ProviderContext) {
    return {
      create_ticket: tool({
        description: 'Create a new ticket from a finding or opportunity',
        inputSchema: z.object({
          title: z.string().describe('Ticket title - be specific and actionable'),
          description: z.string().describe('Detailed description in markdown'),
          priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
          potential: z.string().optional().describe('Estimated impact, e.g., "$5k/month"'),
          confidence: z.number().min(0).max(100).optional().describe('Confidence score 0-100'),
          effort: z.enum(['trivial', 'small', 'medium', 'large', 'epic']).optional(),
          tags: z.array(z.string()).default([]),
          reportExecutionId: z.string().uuid().optional().describe('Link to source report'),
        }),
        execute: async (params) => {
          const db = createDb(ctx.databaseUrl)
          const [ticket] = await db
            .insert(tickets)
            .values({
              workspaceId: ctx.workspaceId,
              title: params.title,
              description: params.description,
              priority: params.priority,
              potential: params.potential,
              confidence: params.confidence,
              effort: params.effort,
              tags: params.tags,
              reportExecutionId: params.reportExecutionId,
              status: 'new',
            })
            .returning()

          return {
            success: true,
            ticket: {
              id: ticket!.id,
              title: ticket!.title,
              status: ticket!.status,
              priority: ticket!.priority,
            },
          }
        },
      }),

      list_tickets: tool({
        description: 'List tickets in the workspace with optional filters',
        inputSchema: z.object({
          status: z.enum(['new', 'assigned', 'in_progress', 'review', 'done', 'archived']).optional(),
          priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
          limit: z.number().min(1).max(100).default(20),
        }),
        execute: async (params) => {
          const db = createDb(ctx.databaseUrl)
          const results = await db
            .select()
            .from(tickets)
            .where(eq(tickets.workspaceId, ctx.workspaceId))
            .limit(params.limit)

          return {
            tickets: results.map((t) => ({
              id: t.id,
              title: t.title,
              status: t.status,
              priority: t.priority,
              potential: t.potential,
              confidence: t.confidence,
              createdAt: t.createdAt,
            })),
            total: results.length,
          }
        },
      }),

      get_context: tool({
        description: 'Get workspace context - company info, strategy, competitors',
        inputSchema: z.object({
          nodeType: z
            .enum(['company_info', 'competitor', 'strategy', 'metrics', 'brand', 'audience', 'custom'])
            .optional()
            .describe('Filter by context type'),
        }),
        execute: async (params) => {
          const db = createDb(ctx.databaseUrl)
          const nodes = await db
            .select()
            .from(contextNodes)
            .where(eq(contextNodes.workspaceId, ctx.workspaceId))

          const filtered = params.nodeType
            ? nodes.filter((n) => n.nodeType === params.nodeType)
            : nodes

          return {
            nodes: filtered.map((n) => ({
              id: n.id,
              type: n.nodeType,
              title: n.title,
              content: n.content,
            })),
            total: filtered.length,
          }
        },
      }),

      spawn_agent: tool({
        description: 'Spawn a sub-agent to handle a specialized task',
        inputSchema: z.object({
          agentId: z.string().describe('ID of the agent to spawn'),
          input: z.string().describe('Task description for the sub-agent'),
        }),
        execute: async (params) => {
          if (!ctx.spawnAgent) {
            return { error: 'Agent spawning is not available in this context' }
          }
          const result = await ctx.spawnAgent(params.agentId, params.input)
          return {
            text: result.text,
            toolCalls: result.toolCalls.length,
            finishReason: result.finishReason,
          }
        },
      }),

      update_context: tool({
        description: 'Update context - add or modify workspace knowledge',
        inputSchema: z.object({
          nodeType: z.enum(['company_info', 'competitor', 'strategy', 'metrics', 'brand', 'audience', 'custom']),
          title: z.string(),
          content: z.string().describe('Markdown content'),
        }),
        execute: async (params) => {
          const db = createDb(ctx.databaseUrl)
          const [node] = await db
            .insert(contextNodes)
            .values({
              workspaceId: ctx.workspaceId,
              nodeType: params.nodeType,
              title: params.title,
              content: params.content,
              source: 'ai_generated',
            })
            .returning()

          return {
            success: true,
            node: {
              id: node!.id,
              type: node!.nodeType,
              title: node!.title,
            },
          }
        },
      }),
    }
  },
}

// Self-register on import
toolRegistry.register(coreProvider)

export default coreProvider
