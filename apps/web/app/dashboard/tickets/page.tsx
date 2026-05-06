import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TicketList } from './components/ticket-list'

export default async function TicketsPage() {
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

  // Get tickets
  const { data: tickets } = await supabase
    .from('tickets')
    .select('*')
    .eq('workspace_id', membership.workspace_id)
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Tickets</h1>
      </div>

      <TicketList 
        tickets={tickets || []} 
        workspaceId={membership.workspace_id} 
      />
    </div>
  )
}
