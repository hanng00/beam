import type { ReportOutput, ReportTemplateId } from '@beam/core/schemas'
import { getTemplate, buildPrompt } from './templates'
import { executeAgent } from '../agents/executor'
import '../agents/providers'

export interface ExecutionContext {
  workspaceId: string
  reportId: string
  templateId: ReportTemplateId | null
  customPrompt: string | null
  integrations: string[]
  workspaceContext: string
  integrationData: Record<string, unknown>
  databaseUrl?: string
}

export interface ExecutorDependencies {
  callLLM?: (prompt: string) => Promise<string>
}

/**
 * Execute a report using the agent orchestration system.
 * Delegates to the seo_reporter agent which has access to all necessary tools.
 */
export async function executeReport(
  context: ExecutionContext,
  deps: ExecutorDependencies = {}
): Promise<ReportOutput> {
  const { templateId, customPrompt, workspaceContext, integrationData } = context

  // If a custom LLM caller is provided (e.g. in tests), use the legacy path
  if (deps.callLLM) {
    return executeLegacy(context, deps.callLLM)
  }

  // Build the input prompt for the agent
  let agentInput: string

  if (templateId && templateId !== 'custom') {
    const template = getTemplate(templateId)
    if (!template) {
      throw new Error(`Unknown template: ${templateId}`)
    }

    const templateContext: Record<string, string> = {
      context: workspaceContext,
    }

    if (integrationData.searchConsoleData) {
      templateContext.searchConsoleData = JSON.stringify(integrationData.searchConsoleData, null, 2)
    }
    if (integrationData.analyticsData) {
      templateContext.analyticsData = JSON.stringify(integrationData.analyticsData, null, 2)
    }
    if (integrationData.funnelData) {
      templateContext.funnelData = JSON.stringify(integrationData.funnelData, null, 2)
    }

    agentInput = buildPrompt(template, templateContext)
  } else if (customPrompt) {
    agentInput = `## Context\n${workspaceContext}\n\n## Custom Analysis Request\n${customPrompt}`
  } else {
    throw new Error('Either templateId or customPrompt must be provided')
  }

  agentInput += `\n\nIMPORTANT: Respond with valid JSON in this format:
{
  "summary": "executive summary string",
  "findings": [{ "type": "opportunity|issue|insight", "title": "...", "description": "...", "potential": "...", "confidence": 0-100, "priority": "low|medium|high|urgent", "suggestedAction": "..." }],
  "rawMarkdown": "full markdown report"
}`

  const result = await executeAgent(
    {
      workspaceId: context.workspaceId,
      agentId: 'seo_reporter',
      sessionId: `report-${context.reportId}-${Date.now()}`,
      input: agentInput,
    },
    { databaseUrl: context.databaseUrl }
  )

  return parseReportOutput(result.text)
}

async function executeLegacy(
  context: ExecutionContext,
  callLLM: (prompt: string) => Promise<string>
): Promise<ReportOutput> {
  const { templateId, customPrompt, workspaceContext, integrationData } = context

  let prompt: string

  if (templateId && templateId !== 'custom') {
    const template = getTemplate(templateId)
    if (!template) {
      throw new Error(`Unknown template: ${templateId}`)
    }

    const templateContext: Record<string, string> = {
      context: workspaceContext,
    }

    if (integrationData.searchConsoleData) {
      templateContext.searchConsoleData = JSON.stringify(integrationData.searchConsoleData, null, 2)
    }
    if (integrationData.analyticsData) {
      templateContext.analyticsData = JSON.stringify(integrationData.analyticsData, null, 2)
    }
    if (integrationData.funnelData) {
      templateContext.funnelData = JSON.stringify(integrationData.funnelData, null, 2)
    }

    prompt = buildPrompt(template, templateContext)
  } else if (customPrompt) {
    prompt = `## Context\n${workspaceContext}\n\n## Custom Analysis Request\n${customPrompt}`
  } else {
    throw new Error('Either templateId or customPrompt must be provided')
  }

  const rawResponse = await callLLM(prompt)
  return parseReportOutput(rawResponse)
}

function parseReportOutput(rawResponse: string): ReportOutput {
  try {
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/)
    const jsonStr = jsonMatch ? jsonMatch[0] : rawResponse
    const parsed = JSON.parse(jsonStr)
    return {
      summary: parsed.summary ?? 'Analysis complete',
      findings: Array.isArray(parsed.findings) ? parsed.findings : [],
      rawMarkdown: parsed.rawMarkdown ?? rawResponse,
      tokensUsed: parsed.tokensUsed,
    }
  } catch {
    return {
      summary: 'Analysis complete',
      findings: [],
      rawMarkdown: rawResponse,
    }
  }
}

export function createMockOutput(templateId: ReportTemplateId | null): ReportOutput {
  const baseFindings = [
    {
      type: 'opportunity' as const,
      title: 'High-potential keyword opportunity',
      description: 'Several keywords with high search volume are ranking on page 2. With optimization, these could move to page 1.',
      potential: '$5,000/month',
      confidence: 85,
      priority: 'high' as const,
      suggestedAction: 'Optimize content for target keywords and build internal links',
    },
    {
      type: 'issue' as const,
      title: 'Mobile usability issues detected',
      description: 'Several pages have mobile usability issues that may be affecting rankings and user experience.',
      priority: 'medium' as const,
      suggestedAction: 'Fix viewport configuration and tap target sizes',
    },
    {
      type: 'insight' as const,
      title: 'Traffic trend analysis',
      description: 'Organic traffic has increased 15% month-over-month, primarily driven by blog content.',
      confidence: 95,
    },
  ]

  const summaries: Record<string, string> = {
    seo_audit: 'SEO audit reveals 3 high-priority opportunities and 2 technical issues. Estimated potential: $15k/month in additional organic traffic value.',
    traffic_analysis: 'Traffic analysis shows healthy growth trends with 15% MoM increase. Key opportunity: optimize underperforming landing pages.',
    conversion_funnel: 'Funnel analysis identifies 23% drop-off at checkout. Addressing cart abandonment could increase revenue by $8k/month.',
  }

  const summary = templateId && templateId !== 'custom'
    ? summaries[templateId] ?? 'Analysis complete with actionable findings.'
    : 'Custom analysis complete with actionable findings.'

  return {
    summary,
    findings: baseFindings,
    rawMarkdown: `# Report Analysis

## Executive Summary
${summary}

## Key Findings

${baseFindings.map((f, i) => `### ${i + 1}. ${f.title}
**Type:** ${f.type} | **Priority:** ${f.priority ?? 'N/A'}
${f.description}
${f.potential ? `**Potential:** ${f.potential}` : ''}
${f.suggestedAction ? `**Action:** ${f.suggestedAction}` : ''}
`).join('\n')}

## Methodology
This analysis was performed using data from connected integrations and AI-powered pattern recognition.

## Next Steps
1. Address high-priority issues first
2. Implement suggested optimizations
3. Schedule follow-up report in 2 weeks
`,
    tokensUsed: 1250,
  }
}
