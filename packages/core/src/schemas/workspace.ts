import { z } from 'zod'

// Base workspace schema
export const workspaceSchema = z.object({
  id: z.string().uuid().describe('Unique workspace identifier'),
  name: z.string().min(1).max(100).describe('Workspace display name'),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/).describe('URL-friendly workspace slug'),
  productTier: z.enum(['free', 'pro', 'enterprise']).describe('Subscription tier'),
  websiteUrl: z.string().url().nullable().describe('Primary website URL for this workspace'),
  createdAt: z.coerce.date().describe('When the workspace was created'),
  updatedAt: z.coerce.date().describe('When the workspace was last updated'),
})

export const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(100).describe('Workspace display name'),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/).describe('URL-friendly workspace slug'),
  websiteUrl: z.string().url().optional().describe('Primary website URL for this workspace'),
})

export const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100).optional().describe('Workspace display name'),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/).optional().describe('URL-friendly workspace slug'),
  websiteUrl: z.string().url().nullable().optional().describe('Primary website URL for this workspace'),
})

// API Key schemas
export const workspaceApiKeySchema = z.object({
  id: z.string().uuid().describe('Unique API key identifier'),
  workspaceId: z.string().uuid().describe('Workspace this key belongs to'),
  keyPrefix: z.string().describe('Key prefix for identification (e.g., "beam_")'),
  name: z.string().nullable().describe('User-friendly name for this key'),
  lastUsedAt: z.coerce.date().nullable().describe('When the key was last used'),
  createdAt: z.coerce.date().describe('When the key was created'),
})

export const createApiKeySchema = z.object({
  name: z.string().min(1).max(100).optional().describe('User-friendly name for this key'),
})

// Type exports
export type Workspace = z.infer<typeof workspaceSchema>
export type CreateWorkspace = z.infer<typeof createWorkspaceSchema>
export type UpdateWorkspace = z.infer<typeof updateWorkspaceSchema>
export type WorkspaceApiKey = z.infer<typeof workspaceApiKeySchema>
export type CreateApiKey = z.infer<typeof createApiKeySchema>
