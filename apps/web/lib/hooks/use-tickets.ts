import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

// Types
interface Ticket {
  id: string
  workspaceId: string
  title: string
  description: string
  status: 'new' | 'assigned' | 'in_progress' | 'review' | 'done' | 'archived'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  potential?: string
  confidence?: number
  effort?: 'trivial' | 'small' | 'medium' | 'large' | 'epic'
  tags: string[]
  reportExecutionId?: string // Link to the report that created this ticket
  assigneeId?: string
  createdAt: string
  updatedAt: string
}

// Queries
export function useTickets(
  workspaceId: string,
  filters?: {
    status?: string
    priority?: string
    tags?: string[]
    sortBy?: 'createdAt' | 'priority' | 'potential' | 'effort'
    sortOrder?: 'asc' | 'desc'
  }
) {
  return useQuery({
    queryKey: ['tickets', workspaceId, filters],
    queryFn: () => {
      const params = new URLSearchParams()
      if (filters?.status) params.set('status', filters.status)
      if (filters?.priority) params.set('priority', filters.priority)
      if (filters?.tags?.length) params.set('tags', filters.tags.join(','))
      if (filters?.sortBy) params.set('sortBy', filters.sortBy)
      if (filters?.sortOrder) params.set('sortOrder', filters.sortOrder)
      const query = params.toString()
      return apiFetch<{ tickets: Ticket[]; total: number }>(
        `/api/workspaces/${workspaceId}/tickets${query ? `?${query}` : ''}`
      )
    },
    enabled: !!workspaceId,
  })
}

export function useTicket(workspaceId: string, ticketId: string) {
  return useQuery({
    queryKey: ['tickets', workspaceId, ticketId],
    queryFn: () => apiFetch<Ticket>(`/api/workspaces/${workspaceId}/tickets/${ticketId}`),
    enabled: !!workspaceId && !!ticketId,
  })
}

// Mutations
export function useCreateTicket(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      title: string
      description: string
      priority?: Ticket['priority']
      potential?: string
      confidence?: number
      effort?: Ticket['effort']
      tags?: string[]
      reportExecutionId?: string
    }) => {
      return apiFetch<Ticket>(`/api/workspaces/${workspaceId}/tickets`, {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets', workspaceId] })
    },
  })
}

export function useUpdateTicket(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ ticketId, ...data }: { ticketId: string } & Partial<Ticket>) => {
      return apiFetch<Ticket>(`/api/workspaces/${workspaceId}/tickets/${ticketId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tickets', workspaceId] })
      queryClient.invalidateQueries({ queryKey: ['tickets', workspaceId, variables.ticketId] })
    },
  })
}

export function useDeleteTicket(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (ticketId: string) => {
      return apiFetch<{ success: boolean }>(`/api/workspaces/${workspaceId}/tickets/${ticketId}`, {
        method: 'DELETE',
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets', workspaceId] })
    },
  })
}

// Bulk update for Kanban drag-and-drop
export function useMoveTicket(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ ticketId, status }: { ticketId: string; status: Ticket['status'] }) => {
      return apiFetch<Ticket>(`/api/workspaces/${workspaceId}/tickets/${ticketId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets', workspaceId] })
    },
  })
}

// Export types
export type { Ticket }
