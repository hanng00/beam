import { createDb } from '@beam/db/client'
import { integrations, integrationCredentials } from '@beam/db/schema'
import { eq, and } from 'drizzle-orm'

/**
 * Maps provider IDs to the integration provider name stored in the DB.
 * Both Google providers share a single OAuth integration under "google".
 */
const PROVIDER_TO_INTEGRATION: Record<string, string> = {
  google_search_console: 'google',
  google_analytics: 'google',
}

/**
 * Factory that creates a credential fetcher bound to a specific databaseUrl + workspaceId.
 * Returns a function matching the RegistryContext signature:
 *   (providerId: string) => Promise<Record<string, string> | null>
 */
export function createCredentialFetcher(
  databaseUrl: string,
  workspaceId: string
): (providerId: string) => Promise<Record<string, string> | null> {
  return async (providerId: string) => {
    const integrationProvider = PROVIDER_TO_INTEGRATION[providerId] ?? providerId
    const db = createDb(databaseUrl)

    const [integration] = await db
      .select()
      .from(integrations)
      .where(
        and(
          eq(integrations.workspaceId, workspaceId),
          eq(integrations.provider, integrationProvider),
          eq(integrations.isEnabled, true)
        )
      )
      .limit(1)

    if (!integration) return null

    const [creds] = await db
      .select()
      .from(integrationCredentials)
      .where(eq(integrationCredentials.integrationId, integration.id))
      .limit(1)

    if (!creds) return null

    return {
      accessToken: creds.accessToken,
      refreshToken: creds.refreshToken || '',
    }
  }
}
