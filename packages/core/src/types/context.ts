export interface ContextNode {
  id: string
  workspaceId: string
  parentId: string | null
  nodeType: ContextNodeType
  title: string
  content: string
  source: 'user_edited' | 'ai_generated'
  createdAt: Date
  updatedAt: Date
}

export type ContextNodeType =
  | 'company_info'
  | 'competitor'
  | 'strategy'
  | 'metrics'
  | 'brand'
  | 'audience'
  | 'custom'
