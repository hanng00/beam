import type { ReportTemplateId } from '@beam/core/schemas'

export interface ReportTemplate {
  id: ReportTemplateId
  name: string
  description: string
  requiredIntegrations: string[]
  promptTemplate: string
}

export const reportTemplates: Record<Exclude<ReportTemplateId, 'custom'>, ReportTemplate> = {
  seo_audit: {
    id: 'seo_audit',
    name: 'SEO Audit',
    description: 'Comprehensive SEO analysis including technical issues, content gaps, and ranking opportunities',
    requiredIntegrations: ['google_search_console'],
    promptTemplate: `You are an expert SEO analyst. Analyze the following data and provide a comprehensive SEO audit.

## Context
{{context}}

## Search Console Data
{{searchConsoleData}}

## Instructions
1. Identify technical SEO issues (crawl errors, indexing problems, mobile usability)
2. Analyze keyword performance and ranking opportunities
3. Find content gaps and optimization opportunities
4. Prioritize findings by potential impact

Provide your analysis in the following structure:
- Executive summary (2-3 sentences)
- Key findings with type (opportunity/issue/insight), priority, and suggested actions
- Detailed markdown report with supporting data`,
  },

  traffic_analysis: {
    id: 'traffic_analysis',
    name: 'Traffic Analysis',
    description: 'Deep dive into traffic patterns, user behavior, and acquisition channels',
    requiredIntegrations: ['google_analytics'],
    promptTemplate: `You are a web analytics expert. Analyze the following traffic data and provide actionable insights.

## Context
{{context}}

## Analytics Data
{{analyticsData}}

## Instructions
1. Analyze traffic trends and patterns
2. Identify top-performing and underperforming pages
3. Evaluate acquisition channels and their effectiveness
4. Spot anomalies or concerning trends
5. Recommend optimizations based on user behavior

Provide your analysis in the following structure:
- Executive summary (2-3 sentences)
- Key findings with type (opportunity/issue/insight), priority, and suggested actions
- Detailed markdown report with charts and data tables`,
  },

  conversion_funnel: {
    id: 'conversion_funnel',
    name: 'Conversion Funnel Analysis',
    description: 'Analyze conversion paths, identify drop-off points, and optimize funnel performance',
    requiredIntegrations: ['google_analytics'],
    promptTemplate: `You are a conversion rate optimization specialist. Analyze the following funnel data and identify optimization opportunities.

## Context
{{context}}

## Funnel Data
{{funnelData}}

## Instructions
1. Map the current conversion funnel stages
2. Identify drop-off points and their severity
3. Analyze user segments with different conversion rates
4. Recommend A/B tests and optimizations
5. Estimate potential revenue impact of improvements

Provide your analysis in the following structure:
- Executive summary (2-3 sentences)
- Key findings with type (opportunity/issue/insight), priority, potential impact, and suggested actions
- Detailed markdown report with funnel visualization and recommendations`,
  },
}

export function getTemplate(templateId: ReportTemplateId): ReportTemplate | null {
  if (templateId === 'custom') {
    return null
  }
  return reportTemplates[templateId] ?? null
}

export function buildPrompt(
  template: ReportTemplate,
  context: Record<string, string>
): string {
  let prompt = template.promptTemplate

  for (const [key, value] of Object.entries(context)) {
    prompt = prompt.replace(new RegExp(`{{${key}}}`, 'g'), value)
  }

  return prompt
}

export function getAvailableTemplates(): ReportTemplate[] {
  return Object.values(reportTemplates)
}
