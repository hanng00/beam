'use client'

import { useState } from 'react'
import { 
  FileText, 
  Play, 
  Clock, 
  CalendarBlank,
  Plugs,
  CaretRight 
} from '@phosphor-icons/react'
import { Card, CardContent } from '@workspace/ui/components/card'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { useRunReport, type Report } from '@/lib/hooks'

interface ReportCardProps {
  report: Report
  workspaceId: string
  onClick: () => void
}

const scheduleLabels: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  manual: 'Manual',
}

export function ReportCard({ report, workspaceId, onClick }: ReportCardProps) {
  const runReport = useRunReport(workspaceId)
  const [isRunning, setIsRunning] = useState(false)

  const handleRun = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsRunning(true)
    try {
      await runReport.mutateAsync(report.id)
    } finally {
      setIsRunning(false)
    }
  }

  const formatLastRun = (date: string | undefined) => {
    if (!date) return 'Never run'
    const d = new Date(date)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return d.toLocaleDateString()
  }

  return (
    <Card
      size="sm"
      className="cursor-pointer transition-all hover:ring-2 hover:ring-ring/50"
      onClick={onClick}
    >
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <FileText size={18} className="text-muted-foreground flex-shrink-0" />
              <h3 className="font-medium truncate">{report.name}</h3>
              {!report.isEnabled && (
                <Badge variant="outline" className="text-xs">Disabled</Badge>
              )}
            </div>
            
            {report.description && (
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                {report.description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {report.schedule && (
                <div className="flex items-center gap-1">
                  <CalendarBlank size={14} />
                  <span>{scheduleLabels[report.schedule.frequency] || report.schedule.frequency}</span>
                </div>
              )}
              
              <div className="flex items-center gap-1">
                <Clock size={14} />
                <span>{formatLastRun(report.lastRunAt)}</span>
              </div>

              {report.integrations && report.integrations.length > 0 && (
                <div className="flex items-center gap-1">
                  <Plugs size={14} />
                  <span>{report.integrations.length} integration{report.integrations.length !== 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRun}
              disabled={isRunning || !report.isEnabled}
            >
              <Play size={14} weight="fill" />
              {isRunning ? 'Running...' : 'Run'}
            </Button>
            <CaretRight size={20} className="text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
