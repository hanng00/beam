'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Plus } from '@phosphor-icons/react'
import { Button } from '@workspace/ui/components/button'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@workspace/ui/components/empty'
import { useReports } from '@/lib/hooks'
import { ReportCard } from './report-card'
import { CreateReportDialog } from './create-report-dialog'

interface ReportListProps {
  workspaceId: string
  integrations: string[]
}

export function ReportList({ workspaceId, integrations }: ReportListProps) {
  const router = useRouter()
  const { data, isLoading } = useReports(workspaceId)
  const [dialogOpen, setDialogOpen] = useState(false)

  const reports = data?.reports || []

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-4xl bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  if (reports.length === 0) {
    return (
      <>
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileText size={24} />
            </EmptyMedia>
            <EmptyTitle>No reports yet</EmptyTitle>
            <EmptyDescription>
              Create your first automated report to start analyzing your marketing data with AI.
            </EmptyDescription>
          </EmptyHeader>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus size={18} weight="bold" />
            New Report
          </Button>
        </Empty>
        <CreateReportDialog 
          open={dialogOpen} 
          onOpenChange={setDialogOpen} 
          workspaceId={workspaceId} 
        />
      </>
    )
  }

  return (
    <div className="space-y-3">
      {reports.map((report) => (
        <ReportCard
          key={report.id}
          report={report}
          workspaceId={workspaceId}
          onClick={() => router.push(`/dashboard/reports/${report.id}`)}
        />
      ))}
    </div>
  )
}
