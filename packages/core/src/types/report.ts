export interface Report {
  id: string
  workspaceId: string
  templateId: string | null
  name: string
  description: string | null
  schedule: ReportSchedule | null
  lastRunAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface ReportSchedule {
  frequency: 'daily' | 'weekly' | 'monthly'
  dayOfWeek?: number
  dayOfMonth?: number
  hour: number
  timezone: string
}

export interface ReportExecution {
  id: string
  reportId: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  output: string | null
  error: string | null
  startedAt: Date
  completedAt: Date | null
}
