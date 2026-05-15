import { describe, it, expect, mock, beforeEach } from 'bun:test'
import { executeReport, createMockOutput, type ExecutionContext, type ExecutorDependencies } from './executor'

describe('executor', () => {
  describe('executeReport', () => {
    const baseContext: ExecutionContext = {
      workspaceId: '550e8400-e29b-41d4-a716-446655440000',
      reportId: '550e8400-e29b-41d4-a716-446655440001',
      templateId: 'seo_audit',
      customPrompt: null,
      integrations: ['google_search_console'],
      workspaceContext: 'E-commerce website selling shoes',
      integrationData: {
        searchConsoleData: { clicks: 1000, impressions: 50000 },
      },
    }

    it('executes report with template', async () => {
      const mockLLM = mock(() => Promise.resolve(JSON.stringify({
        summary: 'SEO analysis complete',
        findings: [{ type: 'opportunity', title: 'Test', description: 'Test finding' }],
        rawMarkdown: '# Report',
      })))

      const deps: ExecutorDependencies = { callLLM: mockLLM }
      const result = await executeReport(baseContext, deps)

      expect(mockLLM).toHaveBeenCalledTimes(1)
      expect(result.summary).toBe('SEO analysis complete')
      expect(result.findings.length).toBe(1)
    })

    it('passes context to template', async () => {
      let capturedPrompt = ''
      const mockLLM = mock((prompt: string) => {
        capturedPrompt = prompt
        return Promise.resolve(JSON.stringify({
          summary: 'Done',
          findings: [],
          rawMarkdown: '# Report',
        }))
      })

      await executeReport(baseContext, { callLLM: mockLLM })

      expect(capturedPrompt).toContain('E-commerce website selling shoes')
      expect(capturedPrompt).toContain('clicks')
    })

    it('executes report with custom prompt', async () => {
      const customContext: ExecutionContext = {
        ...baseContext,
        templateId: null,
        customPrompt: 'Analyze my website performance',
      }

      let capturedPrompt = ''
      const mockLLM = mock((prompt: string) => {
        capturedPrompt = prompt
        return Promise.resolve(JSON.stringify({
          summary: 'Custom analysis done',
          findings: [],
          rawMarkdown: '# Custom Report',
        }))
      })

      const result = await executeReport(customContext, { callLLM: mockLLM })

      expect(capturedPrompt).toContain('Analyze my website performance')
      expect(result.summary).toBe('Custom analysis done')
    })

    it('throws error for unknown template', async () => {
      const badContext: ExecutionContext = {
        ...baseContext,
        templateId: 'unknown_template' as any,
      }

      await expect(executeReport(badContext, {})).rejects.toThrow('Unknown template')
    })

    it('throws error when neither template nor custom prompt provided', async () => {
      const badContext: ExecutionContext = {
        ...baseContext,
        templateId: null,
        customPrompt: null,
      }

      await expect(executeReport(badContext, {})).rejects.toThrow(
        'Either templateId or customPrompt must be provided'
      )
    })

    it('handles non-JSON LLM response as raw markdown', async () => {
      const mockLLM = mock(() => Promise.resolve('# Raw Markdown Report\n\nSome content here'))

      const result = await executeReport(baseContext, { callLLM: mockLLM })

      expect(result.summary).toBe('Analysis complete')
      expect(result.rawMarkdown).toBe('# Raw Markdown Report\n\nSome content here')
      expect(result.findings).toEqual([])
    })

    it('uses default LLM when none provided', async () => {
      const result = await executeReport(baseContext)

      expect(result.summary).toBe('Mock analysis complete')
      expect(result.rawMarkdown).toContain('Mock Report')
    })

    it('includes analytics data in prompt for traffic_analysis', async () => {
      const trafficContext: ExecutionContext = {
        ...baseContext,
        templateId: 'traffic_analysis',
        integrationData: {
          analyticsData: { sessions: 10000, bounceRate: 0.45 },
        },
      }

      let capturedPrompt = ''
      const mockLLM = mock((prompt: string) => {
        capturedPrompt = prompt
        return Promise.resolve(JSON.stringify({
          summary: 'Traffic analysis done',
          findings: [],
          rawMarkdown: '# Traffic Report',
        }))
      })

      await executeReport(trafficContext, { callLLM: mockLLM })

      expect(capturedPrompt).toContain('sessions')
      expect(capturedPrompt).toContain('bounceRate')
    })

    it('includes funnel data in prompt for conversion_funnel', async () => {
      const funnelContext: ExecutionContext = {
        ...baseContext,
        templateId: 'conversion_funnel',
        integrationData: {
          funnelData: { steps: ['visit', 'cart', 'checkout', 'purchase'] },
        },
      }

      let capturedPrompt = ''
      const mockLLM = mock((prompt: string) => {
        capturedPrompt = prompt
        return Promise.resolve(JSON.stringify({
          summary: 'Funnel analysis done',
          findings: [],
          rawMarkdown: '# Funnel Report',
        }))
      })

      await executeReport(funnelContext, { callLLM: mockLLM })

      expect(capturedPrompt).toContain('visit')
      expect(capturedPrompt).toContain('checkout')
    })
  })

  describe('createMockOutput', () => {
    it('creates output for seo_audit template', () => {
      const output = createMockOutput('seo_audit')
      expect(output.summary).toContain('SEO audit')
      expect(output.findings.length).toBeGreaterThan(0)
      expect(output.rawMarkdown).toContain('# Report Analysis')
    })

    it('creates output for traffic_analysis template', () => {
      const output = createMockOutput('traffic_analysis')
      expect(output.summary).toContain('Traffic analysis')
    })

    it('creates output for conversion_funnel template', () => {
      const output = createMockOutput('conversion_funnel')
      expect(output.summary).toContain('Funnel analysis')
    })

    it('creates output for custom template', () => {
      const output = createMockOutput('custom')
      expect(output.summary).toContain('Custom analysis')
    })

    it('creates output for null template', () => {
      const output = createMockOutput(null)
      expect(output.summary).toContain('Custom analysis')
    })

    it('includes findings with correct structure', () => {
      const output = createMockOutput('seo_audit')
      for (const finding of output.findings) {
        expect(['opportunity', 'issue', 'insight']).toContain(finding.type)
        expect(finding.title).toBeDefined()
        expect(finding.description).toBeDefined()
      }
    })

    it('includes tokensUsed', () => {
      const output = createMockOutput('seo_audit')
      expect(output.tokensUsed).toBeDefined()
      expect(typeof output.tokensUsed).toBe('number')
    })

    it('includes markdown with sections', () => {
      const output = createMockOutput('seo_audit')
      expect(output.rawMarkdown).toContain('Executive Summary')
      expect(output.rawMarkdown).toContain('Key Findings')
      expect(output.rawMarkdown).toContain('Methodology')
      expect(output.rawMarkdown).toContain('Next Steps')
    })
  })
})
