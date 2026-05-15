'use client'

import { useState } from 'react'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Play, 
  Clock, 
  CalendarBlank, 
  CheckCircle, 
  XCircle, 
  Spinner,
  Lightning,
  Target,
  Lightbulb,
  Warning
} from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@workspace/ui/components/card'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { useRunReport } from '@/lib/hooks/use-reports'

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

interface ReportData {
  id: string
  name: string
  description: string | null
  template_id: string | null
  schedule: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'manual'
    dayOfWeek?: number
    dayOfMonth?: number
    hour: number
    timezone: string
  } | null
  custom_prompt: string | null
  is_enabled: boolean
  last_run_at: string | null
  created_at: string
  updated_at: string
}

interface ExecutionData {
  id: string
  report_id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  output: ReportOutput | null
  error: string | null
  started_at: string
  completed_at: string | null
}

interface ReportDetailProps {
  report: ReportData
  executions: ExecutionData[]
  workspaceId: string
}

const frequencyLabels: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  manual: 'Manual',
}

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock size={16} className="text-muted-foreground" />,
  running: <Spinner size={16} className="animate-spin text-primary" />,
  completed: <CheckCircle size={16} className="text-green-500" />,
  failed: <XCircle size={16} className="text-destructive" />,
}

const findingIcons: Record<string, React.ReactNode> = {
  opportunity: <Lightning size={18} className="text-green-500" />,
  issue: <Warning size={18} className="text-amber-500" />,
  insight: <Lightbulb size={18} className="text-blue-500" />,
}

const priorityVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  low: 'outline',
  medium: 'secondary',
  high: 'default',
  urgent: 'destructive',
}

export function ReportDetail({ report, executions, workspaceId }: ReportDetailProps) {
  const runReport = useRunReport(workspaceId)
  const [isRunning, setIsRunning] = useState(false)
  const [selectedExecution, setSelectedExecution] = useState<ExecutionData | null>(
    executions.find(e => e.status === 'completed') || executions[0] || null
  )

  const handleRun = async () => {
    setIsRunning(true)
    try {
      await runReport.mutateAsync(report.id)
    } finally {
      setIsRunning(false)
    }
  }

  const latestFindings = selectedExecution?.output?.findings || []

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/reports">
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft size={18} />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{report.name}</h1>
          {report.description && (
            <p className="text-muted-foreground mt-1">{report.description}</p>
          )}
        </div>
        <Button onClick={handleRun} disabled={isRunning}>
          {isRunning ? (
            <Spinner size={16} className="animate-spin" data-icon="inline-start" />
          ) : (
            <Play size={16} data-icon="inline-start" />
          )}
          Run Now
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Schedule</p>
                  <p className="font-medium flex items-center gap-2">
                    <CalendarBlank size={14} />
                    {report.schedule ? frequencyLabels[report.schedule.frequency] : 'Manual'}
                    {report.schedule && report.schedule.frequency !== 'manual' && (
                      <span className="text-muted-foreground">
                        at {report.schedule.hour}:00
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge variant={report.is_enabled ? 'default' : 'outline'}>
                    {report.is_enabled ? 'Active' : 'Paused'}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Last Run</p>
                  <p className="font-medium">
                    {report.last_run_at 
                      ? new Date(report.last_run_at).toLocaleString()
                      : 'Never'
                    }
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Template</p>
                  <p className="font-medium">{report.template_id || 'Custom'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {latestFindings.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Findings</CardTitle>
                <CardDescription>
                  {latestFindings.length} findings from the latest execution
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {latestFindings.map((finding, index) => (
                  <div 
                    key={index} 
                    className="flex gap-3 p-4 rounded-lg bg-muted/50 border"
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {findingIcons[finding.type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-medium">{finding.title}</h4>
                        {finding.priority && (
                          <Badge variant={priorityVariants[finding.priority]} className="flex-shrink-0">
                            {finding.priority}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {finding.description}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs">
                        {finding.potential && (
                          <span className="text-green-500 font-medium">
                            {finding.potential} potential
                          </span>
                        )}
                        {finding.confidence && (
                          <span className="text-muted-foreground">
                            {finding.confidence}% confidence
                          </span>
                        )}
                      </div>
                      {finding.suggestedAction && (
                        <p className="text-sm mt-2 p-2 bg-background rounded border">
                          <span className="font-medium">Suggested: </span>
                          {finding.suggestedAction}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {selectedExecution?.output?.summary && (
            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <p>{selectedExecution.output.summary}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Executions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {executions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No executions yet. Click "Run Now" to generate your first report.
                </p>
              ) : (
                executions.map((execution) => (
                  <button
                    key={execution.id}
                    onClick={() => setSelectedExecution(execution)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                      selectedExecution?.id === execution.id 
                        ? 'bg-muted ring-2 ring-ring' 
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    {statusIcons[execution.status]}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium capitalize">
                        {execution.status}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(execution.started_at).toLocaleString()}
                      </p>
                    </div>
                    {execution.output?.findings && (
                      <Badge variant="outline" className="flex-shrink-0">
                        {execution.output.findings.length} findings
                      </Badge>
                    )}
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
