import { Hono } from 'hono'
import type { Env } from '../index'
import { createDb } from '@beam/db/client'
import { integrations, integrationCredentials } from '@beam/db/schema'
import { eq, and } from 'drizzle-orm'
import { ValidationError, NotFoundError, IntegrationError } from '@beam/core/utils'

export const integrationsRoutes = new Hono<{ Bindings: Env }>()

// Supported OAuth providers and their configs
const OAUTH_PROVIDERS = {
  google_search_console: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  },
  google_analytics: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
  },
  google_ads: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: ['https://www.googleapis.com/auth/adwords'],
  },
  github: {
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    scopes: ['repo', 'read:user'],
  },
} as const

type OAuthProvider = keyof typeof OAUTH_PROVIDERS

function getWorkspaceId(c: { req: { param: (name: string) => string | undefined } }): string {
  const workspaceId = c.req.param('workspaceId')
  if (!workspaceId) {
    throw new ValidationError('Missing workspaceId')
  }
  return workspaceId
}

// GET /api/workspaces/:workspaceId/integrations - List integrations
integrationsRoutes.get('/', async (c) => {
  const workspaceId = getWorkspaceId(c)
  const db = createDb(c.env.DATABASE_URL)

  const workspaceIntegrations = await db
    .select({
      id: integrations.id,
      provider: integrations.provider,
      accountId: integrations.accountId,
      accountName: integrations.accountName,
      isEnabled: integrations.isEnabled,
      createdAt: integrations.createdAt,
    })
    .from(integrations)
    .where(eq(integrations.workspaceId, workspaceId))

  return c.json({
    integrations: workspaceIntegrations,
    availableProviders: Object.keys(OAUTH_PROVIDERS),
  })
})

// GET /api/integrations/oauth-config/:provider - Get OAuth config for client-side flow
integrationsRoutes.get('/oauth-config/:provider', async (c) => {
  const provider = c.req.param('provider') as OAuthProvider

  if (!OAUTH_PROVIDERS[provider]) {
    throw new ValidationError(`Unsupported provider: ${provider}`)
  }

  const config = OAUTH_PROVIDERS[provider]
  const clientId = c.env.GOOGLE_CLIENT_ID

  if (!clientId) {
    throw new IntegrationError(provider, 'OAuth not configured for this provider')
  }

  return c.json({
    authUrl: config.authUrl,
    clientId,
    scopes: config.scopes,
  })
})

// POST /api/workspaces/:workspaceId/integrations/:provider/callback - Exchange code for tokens (called by frontend)
integrationsRoutes.post('/:provider/callback', async (c) => {
  const workspaceId = getWorkspaceId(c)
  const provider = c.req.param('provider') as OAuthProvider
  const body = await c.req.json() as { code: string; redirectUri: string }

  if (!body.code) {
    throw new ValidationError('Missing authorization code')
  }

  if (!body.redirectUri) {
    throw new ValidationError('Missing redirect URI')
  }

  const config = OAUTH_PROVIDERS[provider]
  if (!config) {
    throw new ValidationError(`Unsupported provider: ${provider}`)
  }

  const clientId = c.env.GOOGLE_CLIENT_ID
  const clientSecret = c.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new IntegrationError(provider, 'OAuth not configured')
  }

  // Exchange code for tokens
  const tokenResponse = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: body.code,
      redirect_uri: body.redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text()
    throw new IntegrationError(provider, `Token exchange failed: ${errorText}`)
  }

  const tokens = await tokenResponse.json() as {
    access_token: string
    refresh_token?: string
    expires_in?: number
  }

  const db = createDb(c.env.DATABASE_URL)

  // Check if integration already exists
  const [existing] = await db
    .select()
    .from(integrations)
    .where(
      and(
        eq(integrations.workspaceId, workspaceId),
        eq(integrations.provider, provider)
      )
    )
    .limit(1)

  let integrationId: string

  if (existing) {
    integrationId = existing.id
    await db
      .update(integrations)
      .set({
        isEnabled: true,
        tokenExpiresAt: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000)
          : null,
        updatedAt: new Date(),
      })
      .where(eq(integrations.id, existing.id))

    await db
      .update(integrationCredentials)
      .set({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || null,
        updatedAt: new Date(),
      })
      .where(eq(integrationCredentials.integrationId, existing.id))
  } else {
    const [newIntegration] = await db
      .insert(integrations)
      .values({
        workspaceId,
        provider,
        scopes: [...config.scopes],
        isEnabled: true,
        tokenExpiresAt: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000)
          : null,
      })
      .returning()

    if (!newIntegration) {
      throw new Error('Failed to create integration')
    }

    integrationId = newIntegration.id

    await db.insert(integrationCredentials).values({
      integrationId: newIntegration.id,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || null,
    })
  }

  return c.json({ success: true, integrationId })
})

// DELETE /api/workspaces/:workspaceId/integrations/:id - Disconnect integration
integrationsRoutes.delete('/:id', async (c) => {
  const workspaceId = getWorkspaceId(c)
  const integrationId = c.req.param('id')

  if (!integrationId) {
    throw new ValidationError('Missing integration ID')
  }

  const db = createDb(c.env.DATABASE_URL)

  const [integration] = await db
    .select()
    .from(integrations)
    .where(
      and(
        eq(integrations.id, integrationId),
        eq(integrations.workspaceId, workspaceId)
      )
    )
    .limit(1)

  if (!integration) {
    throw new NotFoundError('Integration', integrationId)
  }

  // Delete credentials first (foreign key)
  await db
    .delete(integrationCredentials)
    .where(eq(integrationCredentials.integrationId, integrationId))

  // Delete integration
  await db
    .delete(integrations)
    .where(eq(integrations.id, integrationId))

  return c.json({ success: true })
})
