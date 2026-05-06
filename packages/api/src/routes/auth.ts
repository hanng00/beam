import { Hono } from 'hono'
import type { Env } from '../index'
import { createSupabaseAdmin } from '@beam/db/supabase'

export const authRoutes = new Hono<{ Bindings: Env }>()

// GET /api/auth/session - Get current session
authRoutes.get('/session', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ user: null })
  }

  const token = authHeader.slice(7)
  const supabase = createSupabaseAdmin(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)

  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    return c.json({ user: null })
  }

  return c.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name || user.user_metadata?.name,
      avatarUrl: user.user_metadata?.avatar_url,
    },
  })
})
