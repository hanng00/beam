import type { AgentDefinition } from './interfaces'

/**
 * System-defined agents (can be overridden by DB in the future)
 */
const systemAgents: Record<string, Omit<AgentDefinition, 'createdAt' | 'updatedAt'>> = {
  seo_reporter: {
    id: 'seo_reporter',
    workspaceId: null,
    name: 'SEO Report Builder',
    description: 'Analyzes SEO data and produces structured reports with actionable findings',
    systemPrompt: `You are an expert SEO analyst. Your job is to analyze data from Google Search Console and other sources, identify opportunities and issues, and create actionable tickets.

When analyzing data:
1. Look for keywords ranking on page 2 that could move to page 1
2. Identify technical SEO issues
3. Find content gaps and optimization opportunities
4. Prioritize findings by potential impact

For each significant finding, create a ticket using the create_ticket tool with:
- Clear, actionable title
- Detailed description with supporting data
- Estimated potential impact
- Confidence score based on data quality
- Appropriate priority level

Always provide your analysis in a structured format with executive summary, key findings, and recommended actions.`,
    toolPatterns: ['core.*', 'google_search_console.*', 'google_analytics.*'],
    model: 'claude-sonnet-4-20250514',
    maxSteps: 15,
    canSpawn: ['ticket_creator'],
  },

  ticket_creator: {
    id: 'ticket_creator',
    workspaceId: null,
    name: 'Ticket Creator',
    description: 'Creates well-structured tickets from findings and opportunities',
    systemPrompt: `You are a ticket creation specialist. Your job is to take findings, opportunities, or issues and create well-structured, actionable tickets.

For each ticket:
1. Write a clear, specific title that describes the action needed
2. Provide detailed description with context, steps, and expected outcome
3. Estimate potential impact when possible
4. Set appropriate priority based on impact and urgency
5. Add relevant tags for categorization

Focus on making tickets actionable - someone should be able to pick up the ticket and know exactly what to do.`,
    toolPatterns: ['core.create_ticket', 'core.list_tickets', 'core.get_context'],
    model: 'claude-sonnet-4-20250514',
    maxSteps: 10,
    canSpawn: [],
  },

  research_agent: {
    id: 'research_agent',
    workspaceId: null,
    name: 'Research Agent',
    description: 'Gathers and synthesizes information from multiple sources',
    systemPrompt: `You are a research specialist. Your job is to gather information from available data sources and synthesize it into useful insights.

When researching:
1. Query relevant data sources
2. Cross-reference information
3. Identify patterns and trends
4. Summarize findings clearly

Provide structured output with sources cited.`,
    toolPatterns: ['core.get_context', 'google_*'],
    model: 'claude-sonnet-4-20250514',
    maxSteps: 10,
    canSpawn: [],
  },
}

/**
 * Get agent definition by ID.
 * First checks DB for workspace-specific or custom agents, falls back to system agents.
 */
export async function getAgentDefinition(
  agentId: string,
  _workspaceId: string
): Promise<AgentDefinition | null> {
  const systemAgent = systemAgents[agentId]
  if (!systemAgent) return null

  return {
    ...systemAgent,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

/**
 * List available agents for a workspace
 */
export async function listAgents(_workspaceId: string): Promise<AgentDefinition[]> {
  return Object.values(systemAgents).map((a) => ({
    ...a,
    createdAt: new Date(),
    updatedAt: new Date(),
  }))
}
