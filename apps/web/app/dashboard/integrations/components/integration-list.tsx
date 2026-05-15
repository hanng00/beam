'use client'

import { GoogleLogo, GithubLogo } from '@phosphor-icons/react'
import { Button } from '@workspace/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Badge } from '@workspace/ui/components/badge'

const OAUTH_CONFIG = {
  google_search_console: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  },
  google_analytics: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
  },
} as const

const availableIntegrations = [
  {
    id: 'google_search_console' as const,
    name: 'Google Search Console',
    description: 'SEO performance data, search queries, and indexing status',
    icon: GoogleLogo,
  },
  {
    id: 'google_analytics' as const,
    name: 'Google Analytics',
    description: 'Website traffic, user behavior, and conversion data',
    icon: GoogleLogo,
  },
  {
    id: 'github' as const,
    name: 'GitHub',
    description: 'Repository data, issues, and pull requests',
    icon: GithubLogo,
    disabled: true,
  },
]

interface IntegrationListProps {
  workspaceId: string
  connectedProviders: Set<string>
  googleClientId: string | null
}

export function IntegrationList({ workspaceId, connectedProviders, googleClientId }: IntegrationListProps) {
  const handleConnect = (providerId: keyof typeof OAUTH_CONFIG) => {
    if (!googleClientId) {
      alert('OAuth not configured. Please contact support.')
      return
    }

    const config = OAUTH_CONFIG[providerId]
    if (!config) {
      alert('This integration is not yet available.')
      return
    }

    const redirectUri = `${window.location.origin}/dashboard/integrations/callback`
    const state = `${providerId}:${workspaceId}`

    const params = new URLSearchParams({
      client_id: googleClientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: config.scopes.join(' '),
      state,
      access_type: 'offline',
      prompt: 'consent',
    })

    window.location.href = `${config.authUrl}?${params.toString()}`
  }

  const handleDisconnect = async (integrationId: string) => {
    // TODO: Implement disconnect
    console.log('Disconnect', integrationId)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {availableIntegrations.map((integration) => {
        const isConnected = connectedProviders.has(integration.id)
        const Icon = integration.icon
        const isDisabled = 'disabled' in integration && integration.disabled

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
                  <Button variant="ghost" size="sm" onClick={() => handleDisconnect(integration.id)}>
                    Disconnect
                  </Button>
                </div>
              ) : (
                <Button
                  variant="secondary"
                  className="w-full"
                  disabled={isDisabled}
                  onClick={() => !isDisabled && handleConnect(integration.id as keyof typeof OAUTH_CONFIG)}
                >
                  {isDisabled ? 'Coming Soon' : 'Connect'}
                </Button>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
