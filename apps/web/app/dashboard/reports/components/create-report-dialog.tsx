'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import { Textarea } from '@workspace/ui/components/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { useCreateReport } from '@/lib/hooks/use-reports'

interface CreateReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceId: string
}

const reportTemplates = [
  { id: 'weekly-performance', name: 'Weekly Performance Review', description: 'Analyze key metrics and trends from the past week' },
  { id: 'competitor-analysis', name: 'Competitor Analysis', description: 'Monitor competitor activities and positioning' },
  { id: 'content-audit', name: 'Content Audit', description: 'Review content performance and identify gaps' },
  { id: 'seo-health', name: 'SEO Health Check', description: 'Technical SEO and ranking analysis' },
  { id: 'custom', name: 'Custom Report', description: 'Create a report with custom prompts' },
]

export function CreateReportDialog({ open, onOpenChange, workspaceId }: CreateReportDialogProps) {
  const router = useRouter()
  const createReport = useCreateReport(workspaceId)
  
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [templateId, setTemplateId] = useState<string>('')
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'manual'>('weekly')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsSubmitting(true)
    try {
      const schedule = frequency !== 'manual' ? {
        frequency,
        hour: 9,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        ...(frequency === 'weekly' ? { dayOfWeek: 1 } : {}),
        ...(frequency === 'monthly' ? { dayOfMonth: 1 } : {}),
      } : undefined

      const result = await createReport.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        templateId: templateId && templateId !== 'custom' ? templateId : undefined,
        schedule,
      })

      onOpenChange(false)
      setName('')
      setDescription('')
      setTemplateId('')
      setFrequency('weekly')
      
      router.push(`/dashboard/reports/${result.id}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedTemplate = reportTemplates.find(t => t.id === templateId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Report</DialogTitle>
            <DialogDescription>
              Set up an automated report to analyze your marketing data.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Report Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Weekly Marketing Review"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="template">Template</Label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {reportTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTemplate && (
                <p className="text-xs text-muted-foreground">
                  {selectedTemplate.description}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="frequency">Schedule</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as typeof frequency)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="manual">Manual only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What should this report analyze?"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Report'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
