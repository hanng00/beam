'use client'

import { useState } from 'react'
import { Plus } from '@phosphor-icons/react'
import { Button } from '@workspace/ui/components/button'
import { CreateReportDialog } from './create-report-dialog'

interface NewReportButtonProps {
  workspaceId: string
}

export function NewReportButton({ workspaceId }: NewReportButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setDialogOpen(true)}>
        <Plus size={18} weight="bold" />
        New Report
      </Button>
      <CreateReportDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen} 
        workspaceId={workspaceId} 
      />
    </>
  )
}
