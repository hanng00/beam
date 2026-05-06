'use client'

import { useState } from 'react'
import { Key, Copy, Check, Plus, Trash } from '@phosphor-icons/react'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { Alert, AlertDescription } from '@workspace/ui/components/alert'
import { Card, CardContent } from '@workspace/ui/components/card'

interface ApiKey {
  id: string
  key_prefix: string
  name: string | null
  created_at: string
  last_used_at: string | null
}

interface ApiKeySectionProps {
  workspaceId: string
  apiKeys: ApiKey[]
}

export function ApiKeySection({ workspaceId, apiKeys }: ApiKeySectionProps) {
  const [keys, setKeys] = useState(apiKeys)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKey, setNewKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)

  const createApiKey = async () => {
    if (!newKeyName.trim()) return
    setLoading(true)

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/api-keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName }),
      })

      if (!res.ok) throw new Error('Failed to create API key')

      const data = await res.json()
      setNewKey(data.key)
      setKeys([data.apiKey, ...keys])
      setNewKeyName('')
    } catch (error) {
      console.error('Failed to create API key:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteApiKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this API key?')) return

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/api-keys/${keyId}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Failed to delete API key')

      setKeys(keys.filter((k) => k.id !== keyId))
    } catch (error) {
      console.error('Failed to delete API key:', error)
    }
  }

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4">
      {newKey && (
        <Alert>
          <AlertDescription>
            <p className="text-primary text-sm mb-2">
              API key created! Copy it now - it won't be shown again.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-2 rounded bg-muted text-primary text-sm font-mono">
                {newKey}
              </code>
              <Button variant="outline" size="icon-sm" onClick={() => copyToClipboard(newKey)}>
                {copied ? <Check size={18} /> : <Copy size={18} />}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2">
        <Input
          type="text"
          value={newKeyName}
          onChange={(e) => setNewKeyName(e.target.value)}
          placeholder="Key name (e.g., Claude Desktop)"
          className="flex-1"
        />
        <Button onClick={createApiKey} disabled={loading || !newKeyName.trim()}>
          <Plus size={18} />
          Create Key
        </Button>
      </div>

      <div className="space-y-2">
        {keys.length === 0 ? (
          <p className="text-muted-foreground text-sm">No API keys yet. Create one to use with MCP.</p>
        ) : (
          keys.map((key) => (
            <Card key={key.id} size="sm">
              <CardContent className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <Key size={20} className="text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{key.name || 'Unnamed key'}</p>
                    <p className="text-muted-foreground text-xs">
                      {key.key_prefix}••••••••
                      {key.last_used_at && (
                        <> · Last used {new Date(key.last_used_at).toLocaleDateString()}</>
                      )}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon-sm" onClick={() => deleteApiKey(key.id)}>
                  <Trash size={18} />
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
