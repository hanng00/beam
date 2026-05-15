import { z } from 'zod'

// Report schedule configuration
export const reportScheduleSchema = z.object({
  frequency: z.enum(['daily', 'weekly', 'monthly', 'manual'])
    .describe('How often the report should run'),
  dayOfWeek: z.number().min(0).max(6).optional()
    .describe('Day of week for weekly reports (0=Sunday, 6=Saturday)'),
  dayOfMonth: z.number().min(1).max(31).optional()
    .describe('Day of month for monthly reports'),
  hour: z.number().min(0).max(23)
    .describe('Hour of day to run (0-23, UTC)'),
  timezone: z.string().default('UTC')
    .describe('Timezone for scheduling'),
})

// Report finding types
export const reportFindingTypeSchema = z.enum(['opportunity', 'issue', 'insight'])
  .describe('Type of finding')

export const reportFindingPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent'])
  .describe('Priority level of the finding')

export const reportFindingSchema = z.object({
  type: reportFindingTypeSchema,
  title: z.string().min(1).max(200)
    .describe('Short title for the finding'),
  description: z.string()
    .describe('Detailed description of the finding'),
  potential: z.string().optional()
    .describe('Estimated potential impact, e.g., "$15k potential"'),
  confidence: z.number().min(0).max(100).optional()
    .describe('Confidence score 0-100'),
  priority: reportFindingPrioritySchema.optional()
    .describe('Priority level'),
  suggestedAction: z.string().optional()
    .describe('Recommended action to take'),
})

// Report output structure
export const reportOutputSchema = z.object({
  summary: z.string()
    .describe('Executive summary of the report'),
  findings: z.array(reportFindingSchema)
    .describe('List of findings from the analysis'),
  rawMarkdown: z.string()
    .describe('Full report in markdown format'),
  tokensUsed: z.number().optional()
    .describe('Number of tokens used for generation'),
})

// Report execution status
export const reportExecutionStatusSchema = z.enum(['pending', 'running', 'completed', 'failed'])
  .describe('Current status of the report execution')

// Built-in template IDs
export const reportTemplateIds = [
  'seo_audit',
  'traffic_analysis',
  'conversion_funnel',
  'custom',
] as const

export const reportTemplateIdSchema = z.enum(reportTemplateIds)
  .describe('Built-in report template identifier')

// Full report schema
export const reportSchema = z.object({
  id: z.string().uuid().describe('Unique report identifier'),
  workspaceId: z.string().uuid().describe('Workspace this report belongs to'),
  templateId: reportTemplateIdSchema.nullable().optional()
    .describe('Template used for this report'),
  name: z.string().min(1).max(200).describe('Report name'),
  description: z.string().nullable().optional().describe('Report description'),
  schedule: reportScheduleSchema.nullable().optional()
    .describe('Schedule configuration'),
  customPrompt: z.string().nullable().optional()
    .describe('Custom prompt for custom template type'),
  integrations: z.array(z.string()).nullable().optional()
    .describe('Integration IDs to use for data'),
  isEnabled: z.boolean().describe('Whether the report is active'),
  lastRunAt: z.coerce.date().nullable().optional()
    .describe('When the report was last executed'),
  createdAt: z.coerce.date().describe('When the report was created'),
  updatedAt: z.coerce.date().describe('When the report was last updated'),
})

// Report execution schema
export const reportExecutionSchema = z.object({
  id: z.string().uuid().describe('Unique execution identifier'),
  reportId: z.string().uuid().describe('Report this execution belongs to'),
  status: reportExecutionStatusSchema,
  output: reportOutputSchema.nullable().optional()
    .describe('Structured output from the execution'),
  error: z.string().nullable().optional()
    .describe('Error message if execution failed'),
  startedAt: z.coerce.date().describe('When execution started'),
  completedAt: z.coerce.date().nullable().optional()
    .describe('When execution completed'),
})

// API request schemas
export const createReportSchema = z.object({
  name: z.string().min(1).max(200)
    .describe('Report name'),
  description: z.string().optional()
    .describe('Report description'),
  templateId: reportTemplateIdSchema.optional()
    .describe('Template to use'),
  schedule: reportScheduleSchema.optional()
    .describe('Schedule configuration'),
  customPrompt: z.string().optional()
    .describe('Custom prompt for custom template'),
  integrations: z.array(z.string()).optional()
    .describe('Integration IDs to use'),
})

export const updateReportSchema = z.object({
  name: z.string().min(1).max(200).optional()
    .describe('Report name'),
  description: z.string().nullable().optional()
    .describe('Report description'),
  templateId: reportTemplateIdSchema.nullable().optional()
    .describe('Template to use'),
  schedule: reportScheduleSchema.nullable().optional()
    .describe('Schedule configuration'),
  customPrompt: z.string().nullable().optional()
    .describe('Custom prompt'),
  integrations: z.array(z.string()).nullable().optional()
    .describe('Integration IDs'),
  isEnabled: z.boolean().optional()
    .describe('Whether the report is active'),
})

// API response schemas
export const reportResponseSchema = reportSchema

export const reportListResponseSchema = z.object({
  reports: z.array(reportSchema),
})

export const reportExecutionListResponseSchema = z.object({
  executions: z.array(reportExecutionSchema),
})

// Type exports
export type ReportSchedule = z.infer<typeof reportScheduleSchema>
export type ReportFindingType = z.infer<typeof reportFindingTypeSchema>
export type ReportFindingPriority = z.infer<typeof reportFindingPrioritySchema>
export type ReportFinding = z.infer<typeof reportFindingSchema>
export type ReportOutput = z.infer<typeof reportOutputSchema>
export type ReportExecutionStatus = z.infer<typeof reportExecutionStatusSchema>
export type ReportTemplateId = z.infer<typeof reportTemplateIdSchema>
export type Report = z.infer<typeof reportSchema>
export type ReportExecution = z.infer<typeof reportExecutionSchema>
export type CreateReport = z.infer<typeof createReportSchema>
export type UpdateReport = z.infer<typeof updateReportSchema>
