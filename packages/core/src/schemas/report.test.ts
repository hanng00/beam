import { describe, it, expect } from 'bun:test'
import {
  reportScheduleSchema,
  reportFindingSchema,
  reportOutputSchema,
  reportSchema,
  reportExecutionSchema,
  createReportSchema,
  updateReportSchema,
} from './report'

describe('report schemas', () => {
  describe('reportScheduleSchema', () => {
    it('accepts valid schedules', () => {
      expect(reportScheduleSchema.parse({ frequency: 'daily', hour: 9 }).frequency).toBe('daily')
      expect(reportScheduleSchema.parse({ frequency: 'weekly', dayOfWeek: 1, hour: 9 }).dayOfWeek).toBe(1)
      expect(reportScheduleSchema.parse({ frequency: 'monthly', dayOfMonth: 15, hour: 9 }).dayOfMonth).toBe(15)
    })

    it('rejects invalid schedule values', () => {
      expect(() => reportScheduleSchema.parse({ frequency: 'hourly', hour: 9 })).toThrow()
      expect(() => reportScheduleSchema.parse({ frequency: 'daily', hour: 25 })).toThrow()
      expect(() => reportScheduleSchema.parse({ frequency: 'weekly', dayOfWeek: 7, hour: 9 })).toThrow()
    })
  })

  describe('reportFindingSchema', () => {
    it('accepts valid finding', () => {
      const result = reportFindingSchema.parse({
        type: 'opportunity',
        title: 'Keyword opportunity',
        description: 'Found high-potential keywords',
        priority: 'high',
        confidence: 85,
      })
      expect(result.type).toBe('opportunity')
      expect(result.confidence).toBe(85)
    })

    it('rejects invalid finding', () => {
      expect(() => reportFindingSchema.parse({ type: 'opportunity', title: '', description: 'Desc' })).toThrow()
      expect(() => reportFindingSchema.parse({ type: 'opportunity', title: 'T', description: 'D', confidence: 101 })).toThrow()
    })
  })

  describe('reportOutputSchema', () => {
    it('accepts valid output', () => {
      const result = reportOutputSchema.parse({
        summary: 'Analysis complete',
        findings: [{ type: 'opportunity', title: 'Test', description: 'Test finding' }],
        rawMarkdown: '# Report\n\nContent here',
        tokensUsed: 1500,
      })
      expect(result.findings.length).toBe(1)
      expect(result.tokensUsed).toBe(1500)
    })
  })

  describe('reportSchema', () => {
    const validReport = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      workspaceId: '550e8400-e29b-41d4-a716-446655440001',
      templateId: 'seo_audit',
      name: 'Weekly SEO Report',
      description: 'Automated SEO analysis',
      schedule: { frequency: 'weekly', dayOfWeek: 1, hour: 9 },
      customPrompt: null,
      integrations: ['google_search_console'],
      isEnabled: true,
      lastRunAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    it('accepts valid report', () => {
      const result = reportSchema.parse(validReport)
      expect(result.name).toBe('Weekly SEO Report')
    })

    it('accepts report with custom template', () => {
      const result = reportSchema.parse({
        ...validReport,
        templateId: 'custom',
        customPrompt: 'Analyze my website performance',
      })
      expect(result.templateId).toBe('custom')
    })
  })

  describe('reportExecutionSchema', () => {
    it('accepts completed execution', () => {
      const result = reportExecutionSchema.parse({
        id: '550e8400-e29b-41d4-a716-446655440000',
        reportId: '550e8400-e29b-41d4-a716-446655440001',
        status: 'completed',
        output: { summary: 'Done', findings: [], rawMarkdown: '# Report' },
        error: null,
        startedAt: new Date(),
        completedAt: new Date(),
      })
      expect(result.status).toBe('completed')
    })

    it('accepts failed execution', () => {
      const result = reportExecutionSchema.parse({
        id: '550e8400-e29b-41d4-a716-446655440000',
        reportId: '550e8400-e29b-41d4-a716-446655440001',
        status: 'failed',
        output: null,
        error: 'Integration timeout',
        startedAt: new Date(),
        completedAt: new Date(),
      })
      expect(result.error).toBe('Integration timeout')
    })
  })

  describe('createReportSchema', () => {
    it('accepts valid input', () => {
      const result = createReportSchema.parse({
        name: 'SEO Report',
        description: 'Weekly SEO analysis',
        templateId: 'seo_audit',
        schedule: { frequency: 'weekly', dayOfWeek: 1, hour: 9 },
      })
      expect(result.templateId).toBe('seo_audit')
    })

    it('rejects empty name', () => {
      expect(() => createReportSchema.parse({ name: '' })).toThrow()
    })
  })

  describe('updateReportSchema', () => {
    it('accepts partial updates', () => {
      const result = updateReportSchema.parse({ name: 'Updated', isEnabled: false })
      expect(result.name).toBe('Updated')
      expect(result.isEnabled).toBe(false)
    })
  })
})
