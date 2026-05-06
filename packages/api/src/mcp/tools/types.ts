import type { Database } from '@beam/db/client'

export interface Env {
  DATABASE_URL: string
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
  SUPABASE_SERVICE_ROLE_KEY: string
  ENVIRONMENT: string
}

export interface ToolContext {
  workspaceId: string
  env: Env
  db: Database
}
