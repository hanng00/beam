import type { Tool } from 'ai'

/**
 * Context passed to tool providers for credential lookup and workspace scoping.
 * Each provider receives a pre-bound getCredentials (no argument needed).
 */
export interface ProviderContext {
  workspaceId: string
  databaseUrl: string
  getCredentials: () => Promise<Record<string, string> | null>
  spawnAgent?: (agentId: string, input: string) => Promise<AgentResult>
}

/**
 * Context accepted by the registry — has a provider-keyed credential fetcher
 * that gets auto-bound per-provider before being passed to ToolProviders.
 */
export interface RegistryContext {
  workspaceId: string
  databaseUrl: string
  getCredentials: (providerId: string) => Promise<Record<string, string> | null>
  spawnAgent?: (agentId: string, input: string) => Promise<AgentResult>
}

/**
 * Interface for tool providers - plugins that supply tools to agents
 *
 * Providers self-register with the ToolRegistry on import.
 * Each provider represents an integration (Google, PostHog, etc.) or core functionality.
 */
export interface ToolProvider {
  /** Unique provider ID, e.g., "google_search_console" */
  id: string

  /** Human-readable name */
  name: string

  /** Capabilities this provider offers, e.g., ["seo_analysis", "keyword_tracking"] */
  capabilities: string[]

  /** Check if this provider is available for a workspace (has credentials) */
  isAvailable(ctx: ProviderContext): Promise<boolean>

  /** Returns tools for a given workspace context, keyed by tool name */
  getTools(ctx: ProviderContext): Record<string, Tool>
}

/**
 * Agent definition - can be system-defined or workspace-specific
 */
export interface AgentDefinition {
  id: string
  workspaceId: string | null // null = system-defined agent
  name: string
  description: string
  systemPrompt: string
  toolPatterns: string[] // Glob patterns: "google_*", "core.*"
  model: string
  maxSteps: number
  canSpawn: string[] // Agent IDs this agent can spawn
  createdAt: Date
  updatedAt: Date
}

/**
 * Context for agent execution
 */
export interface ExecutionContext {
  workspaceId: string
  agentId: string
  sessionId: string
  input: string
  parentContext?: ExecutionContext // For sub-agents
}

/**
 * Result from agent execution
 */
export interface AgentResult {
  text: string
  toolCalls: Array<{
    toolName: string
    args: Record<string, unknown>
    result: unknown
  }>
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  finishReason: string
}

/**
 * Credentials stored for an integration
 */
export interface IntegrationCredentials {
  accessToken: string
  refreshToken?: string
  expiresAt?: Date
}
