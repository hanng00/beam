import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Plugs, GoogleLogo, GithubLogo } from '@phosphor-icons/react/dist/ssr'
import { Button } from '@workspace/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Badge } from '@workspace/ui/components/badge'

const availableIntegrations = [
  {
    id: 'google_search_console',
    name: 'Google Search Console',
    description: 'SEO performance data, search queries, and indexing status',
    icon: GoogleLogo,
  },
  {
    id: 'google_analytics',
    name: 'Google Analytics',
    description: 'Website traffic, user behavior, and conversion data',
    icon: GoogleLogo,
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Repository data, issues, and pull requests',
    icon: GithubLogo,
  },
]

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

  const connectedIds = new Set(integrations?.map((i) => i.provider) || [])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Integrations</h1>
        <p className="text-muted-foreground mt-1">
          Connect your marketing tools to enable AI-powered analysis.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {availableIntegrations.map((integration) => {
          const isConnected = connectedIds.has(integration.id)
          const Icon = integration.icon

          return (
            <Card key={integration.id}>
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-muted">
                    <Icon size={24} weight="fill" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base">{integration.name}</CardTitle>
                    <CardDescription>{integration.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isConnected ? (
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">Connected</Badge>
                    <Button variant="ghost" size="sm">
                      Disconnect
                    </Button>
                  </div>
                ) : (
                  <Button variant="secondary" className="w-full">
                    Connect
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

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
