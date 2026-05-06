import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateApiKey } from '@beam/core/utils'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params
  const supabase = await createClient()

  // Verify user is authenticated
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminClient = createAdminClient()

  // Verify user has access to this workspace
  const { data: membership } = await adminClient
    .from('workspace_memberships')
    .select('role')
    .eq('user_id', user.id)
    .eq('workspace_id', workspaceId)
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { name } = body

  // Generate API key
  const { key, hash, prefix } = await generateApiKey()

  // Store in database
  const { data: apiKey, error } = await adminClient
    .from('workspace_api_keys')
    .insert({
      workspace_id: workspaceId,
      key_hash: hash,
      key_prefix: prefix,
      name: name || null,
    })
    .select('id, key_prefix, name, created_at')
    .single()

  if (error) {
    console.error('Failed to create API key:', error)
    return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 })
  }

  // Return the key (only time it's visible)
  return NextResponse.json({ key, apiKey })
}
