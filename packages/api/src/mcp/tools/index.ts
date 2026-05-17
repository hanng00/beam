import { z } from 'zod'
import type { Tool } from '@modelcontextprotocol/sdk/types.js'
import { isBeamError, ValidationError } from '@beam/core/utils'
import { formatZodError } from '../tool-builder'
import type { ToolContext } from './types'

// Import tool definitions and executors
import { contextTools, executeGetContext, executeUpdateContext } from './context'
import { ticketTools, executeListTickets, executeCreateTicket, executeUpdateTicket } from './tickets'
import { 
  integrationTools, 
  executeGetIntegrations, 
  executeQueryGSC, 
  executeQueryGA,
  executeListGSCSites,
  executeListGAProperties,
  executeListGoogleAdsAccounts,
  executeQueryGoogleAds,
  executeConfigureIntegration,
} from './integrations'
import { agentTools, executeListAgents, executeRunAgent } from './agents'

// Aggregate all tools
export const tools: Tool[] = [
  ...contextTools,
  ...ticketTools,
  ...integrationTools,
  ...agentTools,
]

// Tool executor registry
const executors: Record<string, (args: unknown, ctx: ToolContext) => Promise<unknown>> = {
  // Context tools
  get_context: executeGetContext,
  update_context: executeUpdateContext,
  // Ticket tools
  list_tickets: executeListTickets,
  create_ticket: executeCreateTicket,
  update_ticket: executeUpdateTicket,
  // Integration tools
  get_integrations: executeGetIntegrations,
  list_gsc_sites: executeListGSCSites,
  list_ga_properties: executeListGAProperties,
  list_google_ads_accounts: executeListGoogleAdsAccounts,
  configure_integration: executeConfigureIntegration,
  query_google_search_console: executeQueryGSC,
  query_google_analytics: executeQueryGA,
  query_google_ads: executeQueryGoogleAds,
  // Agent tools
  list_available_agents: executeListAgents,
  run_agent: executeRunAgent,
}

/**
 * Execute a tool by name with the given arguments.
 * Handles Zod validation errors and BeamErrors appropriately.
 */
export async function executeTool(
  name: string,
  args: unknown,
  ctx: ToolContext
): Promise<unknown> {
  const executor = executors[name]
  if (!executor) {
    throw new ValidationError(`Unknown tool: ${name}`)
  }

  try {
    return await executor(args, ctx)
  } catch (error) {
    // Re-throw BeamErrors as-is for structured error handling
    if (isBeamError(error)) {
      throw error
    }

    // Convert Zod validation errors to ValidationError
    if (error instanceof z.ZodError) {
      throw new ValidationError(formatZodError(error))
    }

    // Re-throw other errors
    throw error
  }
}

// Re-export types
export type { ToolContext } from './types'
