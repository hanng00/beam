'use client'

import { useState } from 'react'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Spinner,
  CaretRight,
  Lightbulb,
  Warning,
  TrendUp
} from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@workspace/ui/components/sheet'
import { useCreateTicket, type ReportExecution, type ReportFinding } from '@/lib/hooks'

interface ExecutionListProps {
  executions: ReportExecution[]
  workspaceId: string
}

const statusConfig = {
  pending: { icon: Clock, label: 'Pending', variant: 'secondary' as const },
  running: { icon: Spinner, label: 'Running', variant: 'default' as const },
  completed: { icon: CheckCircle, label: 'Completed', variant: 'outline' as const },
  failed: { icon: XCircle, label: 'Failed', variant: 'destructive' as const },
}

const findingTypeConfig = {
  opportunity: { icon: TrendUp, label: 'Opportunity', color: 'text-emerald-500' },
  issue: { icon: Warning, label: 'Issue', color: 'text-amber-500' },
  insight: { icon: Lightbulb, label: 'Insight', color: 'text-blue-500' },
}

export function ExecutionList({ executions, workspaceId }: ExecutionListProps) {
  const [selectedExecution, setSelectedExecution] = useState<ReportExecution | null>(null)
  const createTicket = useCreateTicket(workspaceId)

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDuration = (start: string, end?: string) => {
    if (!end) return 'In progress...'
    const ms = new Date(end).getTime() - new Date(start).getTime()
    const seconds = Math.floor(ms / 1000)
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    return `${minutes}m ${seconds % 60}s`
  }

  const handleCreateTicket = async (finding: ReportFinding, executionId: string) => {
    try {
      await createTicket.mutateAsync({
        title: finding.title,
        description: `${finding.description}\n\n${finding.suggestedAction ? `**Suggested Action:** ${finding.suggestedAction}` : ''}`,
        priority: finding.priority || 'medium',
        potential: finding.potential,
        confidence: finding.confidence,
        reportExecutionId: executionId,
      })
    } catch (error) {
      console.error('Failed to create ticket:', error)
    }
  }

  if (executions.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No executions yet. Run the report to see results.
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="space-y-2">
        {executions.map((execution) => {
          const config = statusConfig[execution.status]
          const StatusIcon = config.icon

          return (
            <Card
              key={execution.id}
              size="sm"
              className="cursor-pointer transition-all hover:ring-2 hover:ring-ring/50"
              onClick={() => setSelectedExecution(execution)}
            >
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <StatusIcon 
                      size={18} 
                      className={execution.status === 'running' ? 'animate-spin' : ''} 
                    />
                    <div>
                      <p className="font-medium">{formatDate(execution.startedAt)}</p>
                      <p className="text-xs text-muted-foreground">
                        Duration: {formatDuration(execution.startedAt, execution.completedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={config.variant}>{config.label}</Badge>
                    {execution.output && (
                      <span className="text-xs text-muted-foreground">
                        {execution.output.findings.length} findings
                      </span>
                    )}
                    <CaretRight size={18} className="text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Sheet open={!!selectedExecution} onOpenChange={() => setSelectedExecution(null)}>
        <SheetContent className="overflow-y-auto">
          {selectedExecution && (
            <>
              <SheetHeader>
                <SheetTitle>Execution Results</SheetTitle>
                <SheetDescription>
                  {formatDate(selectedExecution.startedAt)}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {selectedExecution.status === 'failed' && selectedExecution.error && (
                  <Card className="border-destructive/50 bg-destructive/5">
                    <CardContent className="py-4">
                      <p className="text-sm text-destructive">{selectedExecution.error}</p>
                    </CardContent>
                  </Card>
                )}

                {selectedExecution.output && (
                  <>
                    <div>
                      <h3 className="font-medium mb-2">Summary</h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedExecution.output.summary}
                      </p>
                    </div>

                    <div>
                      <h3 className="font-medium mb-3">Findings</h3>
                      <div className="space-y-3">
                        {selectedExecution.output.findings.map((finding, index) => {
                          const typeConfig = findingTypeConfig[finding.type]
                          const TypeIcon = typeConfig.icon

                          return (
                            <Card key={index} size="sm">
                              <CardContent className="py-3">
                                <div className="flex items-start gap-3">
                                  <TypeIcon size={18} className={typeConfig.color} />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h4 className="font-medium text-sm">{finding.title}</h4>
                                      {finding.priority && (
                                        <Badge variant="outline" className="text-xs">
                                          {finding.priority}
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-2">
                                      {finding.description}
                                    </p>
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                        {finding.potential && (
                                          <span className="text-emerald-500">{finding.potential}</span>
                                        )}
                                        {finding.confidence && (
                                          <span>{finding.confidence}% confidence</span>
                                        )}
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="xs"
                                        onClick={() => handleCreateTicket(finding, selectedExecution.id)}
                                        disabled={createTicket.isPending}
                                      >
                                        Create Ticket
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )
                        })}
                      </div>
                    </div>

                    {selectedExecution.output.tokensUsed && (
                      <p className="text-xs text-muted-foreground">
                        Tokens used: {selectedExecution.output.tokensUsed.toLocaleString()}
                      </p>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
