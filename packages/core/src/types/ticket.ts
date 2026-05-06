export interface Ticket {
  id: string
  workspaceId: string
  title: string
  description: string
  status: TicketStatus
  priority: TicketPriority
  potential: string | null
  confidence: number | null
  tags: string[]
  assigneeId: string | null
  createdAt: Date
  updatedAt: Date
}

export type TicketStatus =
  | 'new'
  | 'assigned'
  | 'in_progress'
  | 'review'
  | 'analysis'
  | 'done'
  | 'archived'

export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'
