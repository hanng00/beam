import type { Tool } from 'ai'
import { minimatch } from 'minimatch'
import type { ToolProvider, ProviderContext, RegistryContext } from './interfaces'

/**
 * ToolRegistry - Plugin host for tool providers
 *
 * Providers self-register on import. The registry handles:
 * - Pattern-based tool discovery for agents
 * - Capability-based provider lookup
 * - Credential-aware availability checking
 * - Auto-binding credentials per-provider (RegistryContext → ProviderContext)
 */
class ToolRegistry {
  private providers = new Map<string, ToolProvider>()

  register(provider: ToolProvider): void {
    if (this.providers.has(provider.id)) {
      console.warn(`Provider ${provider.id} already registered, overwriting`)
    }
    this.providers.set(provider.id, provider)
  }

  getProvider(id: string): ToolProvider | undefined {
    return this.providers.get(id)
  }

  getAllProviders(): ToolProvider[] {
    return [...this.providers.values()]
  }

  /**
   * Get tools matching glob patterns for an agent.
   * Accepts a RegistryContext (provider-keyed credentials) and auto-binds
   * each provider's context so providers receive a no-arg getCredentials.
   */
  async getToolsForPatterns(
    patterns: string[],
    ctx: RegistryContext
  ): Promise<Record<string, Tool>> {
    const tools: Record<string, Tool> = {}

    for (const [providerId, provider] of this.providers) {
      const providerMatches = patterns.some(
        (p) => minimatch(providerId, p) || p.startsWith(`${providerId}.`)
      )
      if (!providerMatches) continue

      const providerCtx = this.buildProviderContext(providerId, ctx)

      const available = await provider.isAvailable(providerCtx)
      if (!available) continue

      const providerTools = provider.getTools(providerCtx)

      for (const [toolName, toolDef] of Object.entries(providerTools)) {
        const fullName = `${providerId}.${toolName}`

        const toolMatches = patterns.some((p) => {
          if (p === fullName) return true
          if (p === `${providerId}.*`) return true
          return minimatch(fullName, p)
        })

        if (toolMatches) {
          tools[fullName] = toolDef
        }
      }
    }

    return tools
  }

  findByCapability(capability: string): ToolProvider[] {
    return [...this.providers.values()].filter((p) =>
      p.capabilities.includes(capability)
    )
  }

  async getAvailableProviders(ctx: RegistryContext): Promise<ToolProvider[]> {
    const available: ToolProvider[] = []

    for (const [providerId, provider] of this.providers) {
      const providerCtx = this.buildProviderContext(providerId, ctx)
      if (await provider.isAvailable(providerCtx)) {
        available.push(provider)
      }
    }

    return available
  }

  async getAllAvailableTools(
    ctx: RegistryContext
  ): Promise<Array<{ provider: string; name: string; description: string }>> {
    const result: Array<{ provider: string; name: string; description: string }> = []

    for (const [providerId, provider] of this.providers) {
      const providerCtx = this.buildProviderContext(providerId, ctx)
      if (!(await provider.isAvailable(providerCtx))) continue

      const tools = provider.getTools(providerCtx)
      for (const [toolName, toolDef] of Object.entries(tools)) {
        result.push({
          provider: provider.id,
          name: toolName,
          description: toolDef.description || '',
        })
      }
    }

    return result
  }

  /**
   * Build a ProviderContext from a RegistryContext by binding
   * the credential fetcher to a specific provider ID.
   */
  private buildProviderContext(providerId: string, ctx: RegistryContext): ProviderContext {
    return {
      workspaceId: ctx.workspaceId,
      databaseUrl: ctx.databaseUrl,
      getCredentials: () => ctx.getCredentials(providerId),
      spawnAgent: ctx.spawnAgent,
    }
  }
}

// Singleton instance
export const toolRegistry = new ToolRegistry()
