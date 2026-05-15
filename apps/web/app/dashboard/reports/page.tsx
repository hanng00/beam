import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ReportList } from './components/report-list'
import { NewReportButton } from './components/new-report-button'

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: membership } = await supabase
    .from('workspace_memberships')
    .select('workspace_id')
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    redirect('/dashboard')
  }

  const { data: integrations } = await supabase
    .from('integrations')
    .select('provider')
    .eq('workspace_id', membership.workspace_id)

  const connectedIntegrations = integrations?.map(i => i.provider) || []

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-muted-foreground mt-1">
            Automated AI-powered analysis of your marketing data.
          </p>
        </div>
        <NewReportButton workspaceId={membership.workspace_id} />
      </div>

      <ReportList 
        workspaceId={membership.workspace_id}
        integrations={connectedIntegrations}
      />
    </div>
  )
}
