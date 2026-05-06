import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// In Cloudflare Workers, each request needs its own connection
// The Supabase pooler handles actual connection pooling server-side
export function createDb(connectionString: string) {
  const client = postgres(connectionString, {
    prepare: false, // Required for Supabase transaction pooler
    max: 1, // Single connection per request in Workers
  })
  
  return drizzle(client, { schema })
}

export type Database = ReturnType<typeof createDb>
