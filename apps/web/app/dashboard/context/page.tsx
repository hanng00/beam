import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ContextList } from './components/context-list'

export default async function ContextPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get workspace
  const { data: membership } = await supabase
    .from('workspace_memberships')
    .select('workspace_id')
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    redirect('/dashboard')
  }

  // Get context nodes
  const { data: contextNodes } = await supabase
    .from('context_nodes')
    .select('*')
    .eq('workspace_id', membership.workspace_id)
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Context</h1>
          <p className="text-muted-foreground mt-1">
            Information about your company that AI agents can access via MCP.
          </p>
        </div>
      </div>

      <ContextList 
        contextNodes={contextNodes || []} 
        workspaceId={membership.workspace_id} 
      />
    </div>
  )
}
