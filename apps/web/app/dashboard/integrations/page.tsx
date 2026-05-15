import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Plugs } from '@phosphor-icons/react/dist/ssr'
import { Card, CardContent } from '@workspace/ui/components/card'
import { IntegrationList } from './components/integration-list'

export default async function IntegrationsPage() {
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
    .select('*')
    .eq('workspace_id', membership.workspace_id)

  const connectedProviders = new Set(integrations?.map((i) => i.provider) || [])

  // Get Google Client ID from env (public)
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || null

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Integrations</h1>
        <p className="text-muted-foreground mt-1">
          Connect your marketing tools to enable AI-powered analysis.
        </p>
      </div>

      <IntegrationList
        workspaceId={membership.workspace_id}
        connectedProviders={connectedProviders}
        googleClientId={googleClientId}
      />

      <Card className="mt-8">
        <CardContent className="flex items-start gap-4 py-6">
          <Plugs size={24} className="text-muted-foreground" />
          <div>
            <p className="font-medium">More integrations coming soon</p>
            <p className="text-muted-foreground text-sm mt-1">
              We're working on adding support for Meta Ads, LinkedIn Ads, HubSpot, and more.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
