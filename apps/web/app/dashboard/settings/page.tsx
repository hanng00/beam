import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ApiKeySection } from './components/api-key-section'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Label } from '@workspace/ui/components/label'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: membership } = await supabase
    .from('workspace_memberships')
    .select('workspace_id, workspaces(id, name, slug)')
    .eq('user_id', user.id)
    .single()

  const workspace = (membership?.workspaces as unknown as { id: string; name: string; slug: string }) ?? null

  if (!workspace) {
    return (
      <div className="text-muted-foreground">
        No workspace found. Please contact support.
      </div>
    )
  }

  const { data: apiKeys } = await supabase
    .from('workspace_api_keys')
    .select('id, key_prefix, name, created_at, last_used_at')
    .eq('workspace_id', workspace.id)
    .order('created_at', { ascending: false })

  const mcpConfig = {
    mcpServers: {
      beam: {
        type: 'http',
        url: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8788'}/mcp/w/${workspace.id}`,
        headers: {
          Authorization: 'Bearer YOUR_API_KEY',
        },
      },
    },
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Workspace</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Name</Label>
              <p>{workspace.name}</p>
            </div>
            <div className="space-y-1">
              <Label>ID</Label>
              <p className="font-mono text-sm">{workspace.id}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API Keys</CardTitle>
          </CardHeader>
          <CardContent>
            <ApiKeySection workspaceId={workspace.id} apiKeys={apiKeys || []} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>MCP Configuration</CardTitle>
            <CardDescription>
              Add this to your Claude Desktop or Cursor MCP settings. Replace YOUR_API_KEY with an API key from above.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="p-4 rounded-lg bg-muted overflow-x-auto">
              <code className="text-sm text-primary">
                {JSON.stringify(mcpConfig, null, 2)}
              </code>
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
