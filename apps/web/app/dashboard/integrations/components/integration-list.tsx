'use client'

import { useState, useEffect } from 'react'
import { GoogleLogo, GithubLogo, Gear, Check, Warning } from '@phosphor-icons/react'
import { Button } from '@workspace/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Badge } from '@workspace/ui/components/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'

const OAUTH_CONFIG = {
  google_search_console: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  },
  google_analytics: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    scopes: [
      'https://www.googleapis.com/auth/analytics.readonly',
      'https://www.googleapis.com/auth/analytics.manage.users.readonly',
    ],
  },
} as const

type IntegrationConfig = {
  siteUrl?: string
  propertyId?: string
  propertyName?: string
}

type Integration = {
  id: string
  provider: string
  config: IntegrationConfig | null
  isEnabled: boolean
}

const availableIntegrations = [
  {
    id: 'google_search_console' as const,
    name: 'Google Search Console',
    description: 'SEO performance data, search queries, and indexing status',
    icon: GoogleLogo,
    configKey: 'siteUrl' as const,
    configLabel: 'Site',
  },
  {
    id: 'google_analytics' as const,
    name: 'Google Analytics',
    description: 'Website traffic, user behavior, and conversion data',
    icon: GoogleLogo,
    configKey: 'propertyId' as const,
    configLabel: 'Property',
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
  connectedIntegrations: Integration[]
  googleClientId: string | null
}

export function IntegrationList({ workspaceId, connectedIntegrations, googleClientId }: IntegrationListProps) {
  const [configDialogOpen, setConfigDialogOpen] = useState(false)
  const [selectedIntegration, setSelectedIntegration] = useState<typeof availableIntegrations[0] | null>(null)
  const [availableOptions, setAvailableOptions] = useState<Array<{ value: string; label: string }>>([])
  const [selectedValue, setSelectedValue] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const connectedProviders = new Set(connectedIntegrations.map(i => i.provider))

  const getIntegrationConfig = (providerId: string): IntegrationConfig | null => {
    const integration = connectedIntegrations.find(i => i.provider === providerId)
    return integration?.config ?? null
  }

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

  const handleConfigure = async (integration: typeof availableIntegrations[0]) => {
    setSelectedIntegration(integration)
    setConfigDialogOpen(true)
    setIsLoading(true)
    setError(null)
    setAvailableOptions([])
    setSelectedValue('')

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://beam-api.gssonhannes.workers.dev'
      const endpoint = integration.id === 'google_search_console' 
        ? 'list_gsc_sites' 
        : 'list_ga_properties'

      const response = await fetch(`${apiUrl}/mcp/w/${workspaceId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: { name: endpoint, arguments: {} },
        }),
        credentials: 'include',
      })

      const data = await response.json()
      const result = JSON.parse(data.result?.content?.[0]?.text || '{}')

      if (result.error) {
        setError(result.message || 'Failed to load options')
        return
      }

      if (integration.id === 'google_search_console') {
        setAvailableOptions(
          (result.sites || []).map((site: { siteUrl: string; permissionLevel: string }) => ({
            value: site.siteUrl,
            label: `${site.siteUrl} (${site.permissionLevel})`,
          }))
        )
        setSelectedValue(result.configuredSite || '')
      } else {
        setAvailableOptions(
          (result.properties || []).map((prop: { propertyId: string; displayName: string; account: string }) => ({
            value: prop.propertyId,
            label: `${prop.displayName} (${prop.account})`,
          }))
        )
        setSelectedValue(result.configuredProperty || '')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load options')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveConfig = async () => {
    if (!selectedIntegration || !selectedValue) return

    setIsLoading(true)
    setError(null)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://beam-api.gssonhannes.workers.dev'
      const configPayload = selectedIntegration.id === 'google_search_console'
        ? { siteUrl: selectedValue }
        : { propertyId: selectedValue }

      const response = await fetch(`${apiUrl}/mcp/w/${workspaceId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: {
            name: 'configure_integration',
            arguments: {
              provider: selectedIntegration.id,
              config: configPayload,
            },
          },
        }),
        credentials: 'include',
      })

      const data = await response.json()
      const result = JSON.parse(data.result?.content?.[0]?.text || '{}')

      if (result.error) {
        setError(result.message || 'Failed to save configuration')
        return
      }

      // Refresh the page to show updated config
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {availableIntegrations.map((integration) => {
          const isConnected = connectedProviders.has(integration.id)
          const config = getIntegrationConfig(integration.id)
          const Icon = integration.icon
          const isDisabled = 'disabled' in integration && integration.disabled
          const configValue = config?.siteUrl || config?.propertyId
          const isConfigured = !!configValue

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
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      {isConfigured ? (
                        <Badge variant="default" className="gap-1">
                          <Check size={12} weight="bold" />
                          Connected
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <Warning size={12} weight="bold" />
                          Needs Setup
                        </Badge>
                      )}
                    </div>
                    
                    {isConfigured && (
                      <p className="text-sm text-muted-foreground truncate" title={configValue}>
                        {configValue}
                      </p>
                    )}

                    <div className="flex items-center gap-2">
                      {'configKey' in integration && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() => handleConfigure(integration)}
                        >
                          <Gear size={14} />
                          {isConfigured ? 'Change' : 'Configure'}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDisconnect(integration.id)}
                      >
                        Disconnect
                      </Button>
                    </div>
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

      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure {selectedIntegration?.name}</DialogTitle>
            <DialogDescription>
              Select which {'configLabel' in (selectedIntegration || {}) ? (selectedIntegration as any).configLabel?.toLowerCase() : 'resource'} to use for this integration.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading available options...</p>
            ) : error ? (
              <div className="text-sm text-destructive">{error}</div>
            ) : availableOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No {selectedIntegration?.id === 'google_search_console' ? 'sites' : 'properties'} found. 
                Make sure you have access in your Google account.
              </p>
            ) : (
              <Select value={selectedValue} onValueChange={setSelectedValue}>
                <SelectTrigger>
                  <SelectValue placeholder={`Select a ${'configLabel' in (selectedIntegration || {}) ? (selectedIntegration as any).configLabel?.toLowerCase() : 'resource'}`} />
                </SelectTrigger>
                <SelectContent>
                  {availableOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfigDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveConfig} 
              disabled={isLoading || !selectedValue}
            >
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
