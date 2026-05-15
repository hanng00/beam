import { pgTable, uuid, text, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core'
import { workspaces } from './workspaces'

// Report templates define what analysis to run
export const reports = pgTable('reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  templateId: text('template_id'), // 'seo_audit' | 'traffic_analysis' | 'conversion_funnel' | 'custom'
  name: text('name').notNull(),
  description: text('description'),
  // Schedule config: { frequency: 'daily'|'weekly'|'monthly', dayOfWeek?: 0-6, hour: 0-23, timezone: 'UTC' }
  schedule: jsonb('schedule').$type<{
    frequency: 'daily' | 'weekly' | 'monthly' | 'manual'
    dayOfWeek?: number
    dayOfMonth?: number
    hour: number
    timezone: string
  }>(),
  // Custom prompt for 'custom' template type
  customPrompt: text('custom_prompt'),
  // Which integrations to use
  integrations: text('integrations').array(), // ['google_search_console', 'google_analytics']
  isEnabled: boolean('is_enabled').notNull().default(true),
  lastRunAt: timestamp('last_run_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Each execution of a report
export const reportExecutions = pgTable('report_executions', {
  id: uuid('id').primaryKey().defaultRandom(),
  reportId: uuid('report_id')
    .notNull()
    .references(() => reports.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('pending'), // 'pending' | 'running' | 'completed' | 'failed'
  // Structured output from Claude
  output: jsonb('output').$type<{
    summary: string
    findings: Array<{
      type: 'opportunity' | 'issue' | 'insight'
      title: string
      description: string
      potential?: string
      confidence?: number
      priority?: 'low' | 'medium' | 'high' | 'urgent'
      suggestedAction?: string
    }>
    rawMarkdown: string
    tokensUsed?: number
  }>(),
  error: text('error'),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
})
