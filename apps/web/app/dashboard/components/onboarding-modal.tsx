'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Check } from '@phosphor-icons/react'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Alert, AlertDescription } from '@workspace/ui/components/alert'

interface OnboardingModalProps {
  user: { id: string; email?: string; user_metadata?: { full_name?: string } }
}

export function OnboardingModal({ user }: OnboardingModalProps) {
  const [workspaceName, setWorkspaceName] = useState(
    user.user_metadata?.full_name 
      ? `${user.user_metadata.full_name}'s Workspace`
      : 'My Workspace'
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const router = useRouter()

  const createWorkspace = async () => {
    if (!workspaceName.trim()) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: workspaceName }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create workspace')
      }

      const data = await res.json()
      setApiKey(data.apiKey)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  const copyApiKey = async () => {
    if (!apiKey) return
    await navigator.clipboard.writeText(apiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const continueToApp = () => {
    router.refresh()
  }

  return (
    <Card className="w-full max-w-md">
      {!apiKey ? (
        <>
          <CardHeader>
            <CardTitle>Welcome to Beam!</CardTitle>
            <CardDescription>Let's create your workspace to get started.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Workspace name</Label>
              <Input
                id="name"
                type="text"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                placeholder="My Company"
              />
            </div>

            <Button onClick={createWorkspace} disabled={loading || !workspaceName.trim()} className="w-full">
              {loading ? 'Creating...' : 'Create Workspace'}
            </Button>
          </CardContent>
        </>
      ) : (
        <>
          <CardHeader>
            <CardTitle>You're all set!</CardTitle>
            <CardDescription>
              Here's your API key for connecting Claude or Cursor. Save it now - you won't see it again!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-muted">
              <div className="flex items-center gap-2 mb-2">
                <code className="flex-1 text-primary text-sm font-mono break-all">
                  {apiKey}
                </code>
                <Button variant="outline" size="icon-sm" onClick={copyApiKey}>
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                </Button>
              </div>
              <p className="text-muted-foreground text-xs">
                You can create more API keys in Settings later.
              </p>
            </div>

            <Button onClick={continueToApp} className="w-full">
              Continue to Dashboard
            </Button>
          </CardContent>
        </>
      )}
    </Card>
  )
}
