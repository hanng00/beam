'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { SpinnerGap, CheckCircle, XCircle } from '@phosphor-icons/react'

export default function OAuthCallbackPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const code = searchParams.get('code')
    const state = searchParams.get('state') // Contains provider:workspaceId
    const errorParam = searchParams.get('error')

    if (errorParam) {
      setStatus('error')
      setError(`OAuth error: ${errorParam}`)
      return
    }

    if (!code || !state) {
      setStatus('error')
      setError('Missing authorization code or state')
      return
    }

    const [provider, workspaceId] = state.split(':')
    if (!provider || !workspaceId) {
      setStatus('error')
      setError('Invalid state parameter')
      return
    }

    // Exchange code for tokens
    const exchangeCode = async () => {
      try {
        const redirectUri = `${window.location.origin}/dashboard/integrations/callback`
        
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/workspaces/${workspaceId}/integrations/${provider}/callback`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, redirectUri }),
          }
        )

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to connect integration')
        }

        setStatus('success')
        
        // Redirect back to integrations page after short delay
        setTimeout(() => {
          router.push(`/dashboard/integrations?connected=${provider}`)
        }, 1500)
      } catch (err) {
        setStatus('error')
        setError(err instanceof Error ? err.message : 'Unknown error')
      }
    }

    exchangeCode()
  }, [searchParams, router])

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">
            {status === 'loading' && 'Connecting...'}
            {status === 'success' && 'Connected!'}
            {status === 'error' && 'Connection Failed'}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {status === 'loading' && (
            <SpinnerGap size={48} className="animate-spin text-primary" />
          )}
          {status === 'success' && (
            <CheckCircle size={48} weight="fill" className="text-green-500" />
          )}
          {status === 'error' && (
            <>
              <XCircle size={48} weight="fill" className="text-destructive" />
              <p className="text-sm text-muted-foreground text-center">{error}</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
