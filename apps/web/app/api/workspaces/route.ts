import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateApiKey } from '@beam/core/utils'

export async function POST(request: NextRequest) {
  // Debug: check if secret key is loaded
  const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  console.log('Secret key loaded:', secretKey ? `${secretKey.slice(0, 15)}...` : 'NOT FOUND')

  const supabase = await createClient()

  // Verify user is authenticated
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use admin client for database operations (bypasses RLS)
  const adminClient = createAdminClient()

  // Check if user already has a workspace
  const { data: existingMembership } = await adminClient
    .from('workspace_memberships')
    .select('workspace_id')
    .eq('user_id', user.id)
    .single()

  if (existingMembership) {
    return NextResponse.json({ error: 'User already has a workspace' }, { status: 400 })
  }

  const body = await request.json()
  const { name } = body

  // Generate a slug from the name
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50) + '-' + Math.random().toString(36).slice(2, 6)

  // Create workspace
  const { data: workspace, error: workspaceError } = await adminClient
    .from('workspaces')
    .insert({
      name,
      slug,
      product_tier: 'free',
    })
    .select()
    .single()

  if (workspaceError) {
    console.error('Failed to create workspace:', workspaceError)
    return NextResponse.json({ error: 'Failed to create workspace', details: workspaceError.message }, { status: 500 })
  }

  // Create membership
  const { error: membershipError } = await adminClient
    .from('workspace_memberships')
    .insert({
      workspace_id: workspace.id,
      user_id: user.id,
      role: 'owner',
    })

  if (membershipError) {
    console.error('Failed to create membership:', membershipError)
    // Rollback workspace creation
    await adminClient.from('workspaces').delete().eq('id', workspace.id)
    return NextResponse.json({ error: 'Failed to create membership', details: membershipError.message }, { status: 500 })
  }

  // Generate initial API key
  const { key, hash, prefix } = await generateApiKey()

  const { error: keyError } = await adminClient
    .from('workspace_api_keys')
    .insert({
      workspace_id: workspace.id,
      key_hash: hash,
      key_prefix: prefix,
      name: 'Default API Key',
    })

  if (keyError) {
    console.error('Failed to create API key:', keyError)
  }

  return NextResponse.json({ 
    workspace, 
    apiKey: key
  })
}
