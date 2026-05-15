import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

// Types
interface Integration {
  id: string
  provider: string
  accountId?: string
  accountName?: string
  isEnabled: boolean
  createdAt: string
}

interface IntegrationsResponse {
  integrations: Integration[]
  availableProviders: string[]
}

// Queries
export function useIntegrations(workspaceId: string) {
  return useQuery({
    queryKey: ['integrations', workspaceId],
    queryFn: () =>
      apiFetch<IntegrationsResponse>(`/api/workspaces/${workspaceId}/integrations`),
    enabled: !!workspaceId,
  })
}

// Mutations
export function useConnectIntegration(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      provider,
      code,
      redirectUri,
    }: {
      provider: string
      code: string
      redirectUri: string
    }) => {
      return apiFetch<{ success: boolean; integrationId: string }>(
        `/api/workspaces/${workspaceId}/integrations/${provider}/callback`,
        {
          method: 'POST',
          body: JSON.stringify({ code, redirectUri }),
        }
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations', workspaceId] })
    },
  })
}

export function useDisconnectIntegration(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (integrationId: string) => {
      return apiFetch<{ success: boolean }>(
        `/api/workspaces/${workspaceId}/integrations/${integrationId}`,
        { method: 'DELETE' }
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations', workspaceId] })
    },
  })
}
