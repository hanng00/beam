import { z } from 'zod'

export const contextNodeTypes = [
  'company_info',
  'competitor',
  'strategy',
  'metrics',
  'brand',
  'audience',
  'custom',
] as const

export const contextNodeTypeSchema = z.enum(contextNodeTypes)
  .describe('Type of context node in the knowledge graph')

export const contextSourceSchema = z.enum(['user_edited', 'ai_generated'])
  .describe('How this context was created')

export const contextNodeSchema = z.object({
  id: z.string().uuid().describe('Unique context node identifier'),
  workspaceId: z.string().uuid().describe('Workspace this context belongs to'),
  parentId: z.string().uuid().nullable().describe('Parent node ID for hierarchical structure'),
  nodeType: contextNodeTypeSchema,
  title: z.string().min(1).max(200).describe('Context node title'),
  content: z.string().describe('Markdown content of the context'),
  source: contextSourceSchema,
  createdAt: z.coerce.date().describe('When the context was created'),
  updatedAt: z.coerce.date().describe('When the context was last updated'),
})

// MCP Tool Schemas - these are the single source of truth
export const getContextArgsSchema = z.object({
  nodeType: contextNodeTypeSchema.optional()
    .describe('Filter by node type: company_info, competitor, strategy, metrics, brand, audience'),
})

export const createContextArgsSchema = z.object({
  nodeType: contextNodeTypeSchema
    .describe('Type of context node'),
  title: z.string().min(1).max(200)
    .describe('Title of the context node'),
  content: z.string().min(1)
    .describe('Markdown content for the context node'),
  parentId: z.string().uuid().optional()
    .describe('Parent node ID for hierarchical organization'),
})

export const updateContextArgsSchema = z.object({
  nodeId: z.string().uuid()
    .describe('ID of the context node to update'),
  title: z.string().min(1).max(200).optional()
    .describe('New title for the context node'),
  content: z.string().optional()
    .describe('New markdown content'),
})

// Type exports
export type ContextNodeType = z.infer<typeof contextNodeTypeSchema>
export type ContextSource = z.infer<typeof contextSourceSchema>
export type ContextNode = z.infer<typeof contextNodeSchema>
export type GetContextArgs = z.infer<typeof getContextArgsSchema>
export type CreateContextArgs = z.infer<typeof createContextArgsSchema>
export type UpdateContextArgs = z.infer<typeof updateContextArgsSchema>
