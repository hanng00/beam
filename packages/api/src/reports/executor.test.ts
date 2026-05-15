import { describe, it, expect, mock } from 'bun:test'
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

    it('executes report with template and passes context', async () => {
      let capturedPrompt = ''
      const mockLLM = mock((prompt: string) => {
        capturedPrompt = prompt
        return Promise.resolve(JSON.stringify({
          summary: 'SEO analysis complete',
          findings: [{ type: 'opportunity', title: 'Test', description: 'Test finding' }],
          rawMarkdown: '# Report',
        }))
      })

      const result = await executeReport(baseContext, { callLLM: mockLLM })

      expect(mockLLM).toHaveBeenCalledTimes(1)
      expect(result.summary).toBe('SEO analysis complete')
      expect(result.findings.length).toBe(1)
      expect(capturedPrompt).toContain('E-commerce website selling shoes')
      expect(capturedPrompt).toContain('clicks')
    })

    it('executes report with custom prompt', async () => {
      let capturedPrompt = ''
      const mockLLM = mock((prompt: string) => {
        capturedPrompt = prompt
        return Promise.resolve(JSON.stringify({
          summary: 'Custom analysis done',
          findings: [],
          rawMarkdown: '# Custom Report',
        }))
      })

      const result = await executeReport({
        ...baseContext,
        templateId: null,
        customPrompt: 'Analyze my website performance',
      }, { callLLM: mockLLM })

      expect(capturedPrompt).toContain('Analyze my website performance')
      expect(result.summary).toBe('Custom analysis done')
    })

    it('throws error for invalid configuration', async () => {
      await expect(executeReport({ ...baseContext, templateId: 'unknown_template' as any }, {}))
        .rejects.toThrow('Unknown template')

      await expect(executeReport({ ...baseContext, templateId: null, customPrompt: null }, {}))
        .rejects.toThrow('Either templateId or customPrompt must be provided')
    })

    it('handles non-JSON LLM response as raw markdown', async () => {
      const mockLLM = mock(() => Promise.resolve('# Raw Markdown Report\n\nSome content'))
      const result = await executeReport(baseContext, { callLLM: mockLLM })

      expect(result.summary).toBe('Analysis complete')
      expect(result.rawMarkdown).toBe('# Raw Markdown Report\n\nSome content')
    })
  })

  describe('createMockOutput', () => {
    it('creates valid output for each template type', () => {
      for (const templateId of ['seo_audit', 'traffic_analysis', 'conversion_funnel', 'custom', null] as const) {
        const output = createMockOutput(templateId)
        expect(output.summary).toBeDefined()
        expect(output.rawMarkdown).toContain('# Report Analysis')
        expect(typeof output.tokensUsed).toBe('number')
      }
    })
  })
})
