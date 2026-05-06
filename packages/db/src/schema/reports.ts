import { pgTable, uuid, text, timestamp, integer, jsonb } from 'drizzle-orm/pg-core'
import { workspaces } from './workspaces'

export const reports = pgTable('reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  templateId: text('template_id'), // Reference to built-in templates
  name: text('name').notNull(),
  description: text('description'),
  schedule: jsonb('schedule'), // { frequency, dayOfWeek, hour, timezone }
  lastRunAt: timestamp('last_run_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const reportExecutions = pgTable('report_executions', {
  id: uuid('id').primaryKey().defaultRandom(),
  reportId: uuid('report_id')
    .notNull()
    .references(() => reports.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('pending'), // 'pending' | 'running' | 'completed' | 'failed'
  output: text('output'), // Markdown output
  error: text('error'),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
})
