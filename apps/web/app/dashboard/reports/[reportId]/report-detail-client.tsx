'use client'

import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  Play, 
  CalendarBlank, 
  Clock, 
  Plugs,
  Gear
} from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { useReport, useReportExecutions, useRunReport } from '@/lib/hooks'
import { ExecutionList } from '../components/execution-list'

interface ReportDetailClientProps {
  workspaceId: string
  reportId: string
}

const scheduleLabels: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  manual: 'Manual',
}

export function ReportDetailClient({ workspaceId, reportId }: ReportDetailClientProps) {
  const router = useRouter()
  const { data: report, isLoading: reportLoading } = useReport(workspaceId, reportId)
  const { data: executionsData, isLoading: executionsLoading } = useReportExecutions(workspaceId, reportId)
  const runReport = useRunReport(workspaceId)

  const executions = executionsData?.executions || []

  const handleRun = async () => {
    try {
      await runReport.mutateAsync(reportId)
    } catch (error) {
      console.error('Failed to run report:', error)
    }
  }

  const formatLastRun = (date: string | undefined) => {
    if (!date) return 'Never'
    return new Date(date).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (reportLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!report) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Report not found</p>
        <Button variant="ghost" onClick={() => router.push('/dashboard/reports')} className="mt-4">
          <ArrowLeft size={18} />
          Back to Reports
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/reports')}>
          <ArrowLeft size={20} />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{report.name}</h1>
            {!report.isEnabled && (
              <Badge variant="outline">Disabled</Badge>
            )}
          </div>
          {report.description && (
            <p className="text-muted-foreground mt-1">{report.description}</p>
          )}
        </div>
        <Button onClick={handleRun} disabled={runReport.isPending || !report.isEnabled}>
          <Play size={18} weight="fill" />
          {runReport.isPending ? 'Running...' : 'Run Now'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <CalendarBlank size={16} />
                <span className="text-xs">Schedule</span>
              </div>
              <p className="font-medium">
                {report.schedule ? scheduleLabels[report.schedule.frequency] : 'Not set'}
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Clock size={16} />
                <span className="text-xs">Last Run</span>
              </div>
              <p className="font-medium">{formatLastRun(report.lastRunAt)}</p>
            </div>

            <div>
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Plugs size={16} />
                <span className="text-xs">Integrations</span>
              </div>
              <p className="font-medium">
                {report.integrations?.length || 0} connected
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Gear size={16} />
                <span className="text-xs">Template</span>
              </div>
              <p className="font-medium">
                {report.templateId || 'Custom'}
              </p>
            </div>
          </div>

          {report.integrations && report.integrations.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-muted-foreground mb-2">Data Sources</p>
              <div className="flex flex-wrap gap-2">
                {report.integrations.map((integration) => (
                  <Badge key={integration} variant="secondary">
                    {integration.replace('_', ' ')}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold mb-4">Execution History</h2>
        {executionsLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : (
          <ExecutionList executions={executions} workspaceId={workspaceId} />
        )}
      </div>
    </div>
  )
}
