import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'
import { workspaces } from './workspaces'

export const contextNodes = pgTable('context_nodes', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  parentId: uuid('parent_id'), // Self-reference for tree structure
  nodeType: text('node_type').notNull(), // 'company_info' | 'competitor' | etc.
  title: text('title').notNull(),
  content: text('content').notNull().default(''),
  source: text('source').notNull().default('user_edited'), // 'user_edited' | 'ai_generated'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
