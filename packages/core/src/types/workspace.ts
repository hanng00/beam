export interface Workspace {
  id: string
  name: string
  slug: string
  productTier: 'free' | 'pro' | 'enterprise'
  websiteUrl: string | null
  createdAt: Date
  updatedAt: Date
}

export interface WorkspaceMembership {
  id: string
  workspaceId: string
  userId: string
  role: 'owner' | 'admin' | 'member'
  createdAt: Date
}

export interface WorkspaceApiKey {
  id: string
  workspaceId: string
  keyHash: string
  keyPrefix: string
  name: string | null
  lastUsedAt: Date | null
  createdAt: Date
}
