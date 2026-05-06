import { pgTable, uuid, text, timestamp, integer } from 'drizzle-orm/pg-core'
import { workspaces } from './workspaces'

export const tickets = pgTable('tickets', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  status: text('status').notNull().default('new'), // 'new' | 'assigned' | 'in_progress' | etc.
  priority: text('priority').notNull().default('medium'), // 'low' | 'medium' | 'high' | 'urgent'
  potential: text('potential'), // e.g., "$15k potential"
  confidence: integer('confidence'), // 0-100
  tags: text('tags').array().default([]),
  assigneeId: uuid('assignee_id'), // References Supabase auth.users
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const ticketComments = pgTable('ticket_comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  ticketId: uuid('ticket_id')
    .notNull()
    .references(() => tickets.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id'), // References Supabase auth.users, null for AI
  content: text('content').notNull(),
  isAiGenerated: text('is_ai_generated').notNull().default('false'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
