import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; keyId: string }> }
) {
  const { workspaceId, keyId } = await params
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

  // Delete the API key
  const { error } = await adminClient
    .from('workspace_api_keys')
    .delete()
    .eq('id', keyId)
    .eq('workspace_id', workspaceId)

  if (error) {
    console.error('Failed to delete API key:', error)
    return NextResponse.json({ error: 'Failed to delete API key' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
