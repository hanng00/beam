import { eq } from 'drizzle-orm'
import { contextNodes } from '@beam/db/schema'
import {
  getContextArgsSchema,
  createContextArgsSchema,
  type GetContextArgs,
  type CreateContextArgs,
} from '@beam/core/schemas'
import { createMcpTool, validateArgs } from '../tool-builder'
import type { ToolContext } from './types'

// Tool definitions - generated from Zod schemas
export const contextTools = [
  createMcpTool(
    'get_context',
    'Get the workspace context including company information, strategy, competitors, and other relevant context for AI-assisted tasks.',
    getContextArgsSchema
  ),
  createMcpTool(
    'update_context',
    'Create a new context node in the workspace knowledge base.',
    createContextArgsSchema
  ),
]

// Tool executors - use Zod for validation
export async function executeGetContext(args: unknown, ctx: ToolContext) {
  const { nodeType } = validateArgs(getContextArgsSchema, args)
  const { db, workspaceId } = ctx

  const nodes = await db
    .select()
    .from(contextNodes)
    .where(eq(contextNodes.workspaceId, workspaceId))

  const filteredNodes = nodeType
    ? nodes.filter((n) => n.nodeType === nodeType)
    : nodes

  return {
    workspaceId,
    nodeCount: filteredNodes.length,
    nodes: filteredNodes.map((n) => ({
      id: n.id,
      nodeType: n.nodeType,
      title: n.title,
      content: n.content,
      source: n.source,
      updatedAt: n.updatedAt,
    })),
  }
}

export async function executeUpdateContext(args: unknown, ctx: ToolContext) {
  const { nodeType, title, content, parentId } = validateArgs(createContextArgsSchema, args)
  const { db, workspaceId } = ctx

  const [node] = await db
    .insert(contextNodes)
    .values({
      workspaceId,
      nodeType,
      title,
      content,
      parentId: parentId ?? null,
      source: 'ai_generated',
    })
    .returning()

  if (!node) {
    throw new Error('Failed to create context node')
  }

  return {
    success: true,
    node: {
      id: node.id,
      nodeType: node.nodeType,
      title: node.title,
    },
  }
}
