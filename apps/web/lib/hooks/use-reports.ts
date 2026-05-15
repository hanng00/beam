import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

// Types
interface ReportSchedule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'manual'
  dayOfWeek?: number
  dayOfMonth?: number
  hour: number
  timezone: string
}

interface ReportFinding {
  type: 'opportunity' | 'issue' | 'insight'
  title: string
  description: string
  potential?: string
  confidence?: number
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  suggestedAction?: string
}

interface ReportOutput {
  summary: string
  findings: ReportFinding[]
  rawMarkdown: string
  tokensUsed?: number
}

interface Report {
  id: string
  workspaceId: string
  templateId?: string
  name: string
  description?: string
  schedule?: ReportSchedule
  customPrompt?: string
  integrations?: string[]
  isEnabled: boolean
  lastRunAt?: string
  createdAt: string
  updatedAt: string
}

interface ReportExecution {
  id: string
  reportId: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  output?: ReportOutput
  error?: string
  startedAt: string
  completedAt?: string
}

// Queries
export function useReports(workspaceId: string) {
  return useQuery({
    queryKey: ['reports', workspaceId],
    queryFn: () => apiFetch<{ reports: Report[] }>(`/api/workspaces/${workspaceId}/reports`),
    enabled: !!workspaceId,
  })
}

export function useReport(workspaceId: string, reportId: string) {
  return useQuery({
    queryKey: ['reports', workspaceId, reportId],
    queryFn: () => apiFetch<Report>(`/api/workspaces/${workspaceId}/reports/${reportId}`),
    enabled: !!workspaceId && !!reportId,
  })
}

export function useReportExecutions(workspaceId: string, reportId: string) {
  return useQuery({
    queryKey: ['report-executions', workspaceId, reportId],
    queryFn: () =>
      apiFetch<{ executions: ReportExecution[] }>(
        `/api/workspaces/${workspaceId}/reports/${reportId}/executions`
      ),
    enabled: !!workspaceId && !!reportId,
  })
}

// Mutations
export function useCreateReport(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      name: string
      description?: string
      templateId?: string
      schedule?: ReportSchedule
      customPrompt?: string
      integrations?: string[]
    }) => {
      return apiFetch<Report>(`/api/workspaces/${workspaceId}/reports`, {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports', workspaceId] })
    },
  })
}

export function useUpdateReport(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ reportId, ...data }: { reportId: string } & Partial<Report>) => {
      return apiFetch<Report>(`/api/workspaces/${workspaceId}/reports/${reportId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reports', workspaceId] })
      queryClient.invalidateQueries({ queryKey: ['reports', workspaceId, variables.reportId] })
    },
  })
}

export function useDeleteReport(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (reportId: string) => {
      return apiFetch<{ success: boolean }>(`/api/workspaces/${workspaceId}/reports/${reportId}`, {
        method: 'DELETE',
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports', workspaceId] })
    },
  })
}

export function useRunReport(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (reportId: string) => {
      return apiFetch<ReportExecution>(`/api/workspaces/${workspaceId}/reports/${reportId}/run`, {
        method: 'POST',
      })
    },
    onSuccess: (_, reportId) => {
      queryClient.invalidateQueries({ queryKey: ['reports', workspaceId, reportId] })
      queryClient.invalidateQueries({ queryKey: ['report-executions', workspaceId, reportId] })
    },
  })
}

// Export types
export type { Report, ReportExecution, ReportSchedule, ReportFinding, ReportOutput }
