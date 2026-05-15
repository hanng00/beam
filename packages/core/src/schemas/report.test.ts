import { describe, it, expect } from 'bun:test'
import {
  reportScheduleSchema,
  reportFindingTypeSchema,
  reportFindingPrioritySchema,
  reportFindingSchema,
  reportOutputSchema,
  reportExecutionStatusSchema,
  reportTemplateIdSchema,
  reportSchema,
  reportExecutionSchema,
  createReportSchema,
  updateReportSchema,
  reportTemplateIds,
} from './report'

describe('report schemas', () => {
  describe('reportScheduleSchema', () => {
    it('accepts valid daily schedule', () => {
      const result = reportScheduleSchema.parse({
        frequency: 'daily',
        hour: 9,
      })
      expect(result.frequency).toBe('daily')
      expect(result.timezone).toBe('UTC')
    })

    it('accepts valid weekly schedule', () => {
      const result = reportScheduleSchema.parse({
        frequency: 'weekly',
        dayOfWeek: 1,
        hour: 9,
      })
      expect(result.dayOfWeek).toBe(1)
    })

    it('accepts valid monthly schedule', () => {
      const result = reportScheduleSchema.parse({
        frequency: 'monthly',
        dayOfMonth: 15,
        hour: 9,
      })
      expect(result.dayOfMonth).toBe(15)
    })

    it('rejects invalid frequency', () => {
      expect(() => reportScheduleSchema.parse({
        frequency: 'hourly',
        hour: 9,
      })).toThrow()
    })

    it('rejects invalid hour', () => {
      expect(() => reportScheduleSchema.parse({
        frequency: 'daily',
        hour: 25,
      })).toThrow()
    })

    it('rejects invalid dayOfWeek', () => {
      expect(() => reportScheduleSchema.parse({
        frequency: 'weekly',
        dayOfWeek: 7,
        hour: 9,
      })).toThrow()
    })

    it('rejects invalid dayOfMonth', () => {
      expect(() => reportScheduleSchema.parse({
        frequency: 'monthly',
        dayOfMonth: 32,
        hour: 9,
      })).toThrow()
    })
  })

  describe('reportFindingTypeSchema', () => {
    it.each(['opportunity', 'issue', 'insight'] as const)('accepts valid type: %s', (type) => {
      expect(reportFindingTypeSchema.parse(type)).toBe(type)
    })

    it('rejects invalid type', () => {
      expect(() => reportFindingTypeSchema.parse('warning')).toThrow()
    })
  })

  describe('reportFindingPrioritySchema', () => {
    it.each(['low', 'medium', 'high', 'urgent'] as const)('accepts valid priority: %s', (priority) => {
      expect(reportFindingPrioritySchema.parse(priority)).toBe(priority)
    })

    it('rejects invalid priority', () => {
      expect(() => reportFindingPrioritySchema.parse('critical')).toThrow()
    })
  })

  describe('reportFindingSchema', () => {
    it('accepts minimal valid finding', () => {
      const result = reportFindingSchema.parse({
        type: 'opportunity',
        title: 'Keyword opportunity',
        description: 'Found high-potential keywords',
      })
      expect(result.type).toBe('opportunity')
    })

    it('accepts full finding', () => {
      const result = reportFindingSchema.parse({
        type: 'issue',
        title: 'Mobile usability',
        description: 'Pages have mobile issues',
        potential: '$5k/month',
        confidence: 85,
        priority: 'high',
        suggestedAction: 'Fix viewport settings',
      })
      expect(result.confidence).toBe(85)
    })

    it('rejects empty title', () => {
      expect(() => reportFindingSchema.parse({
        type: 'opportunity',
        title: '',
        description: 'Description',
      })).toThrow()
    })

    it('rejects title too long', () => {
      expect(() => reportFindingSchema.parse({
        type: 'opportunity',
        title: 'a'.repeat(201),
        description: 'Description',
      })).toThrow()
    })

    it('rejects confidence out of range', () => {
      expect(() => reportFindingSchema.parse({
        type: 'opportunity',
        title: 'Title',
        description: 'Description',
        confidence: 101,
      })).toThrow()
    })
  })

  describe('reportOutputSchema', () => {
    it('accepts valid output', () => {
      const result = reportOutputSchema.parse({
        summary: 'Analysis complete',
        findings: [
          { type: 'opportunity', title: 'Test', description: 'Test finding' },
        ],
        rawMarkdown: '# Report\n\nContent here',
      })
      expect(result.findings.length).toBe(1)
    })

    it('accepts output with tokensUsed', () => {
      const result = reportOutputSchema.parse({
        summary: 'Analysis complete',
        findings: [],
        rawMarkdown: '# Report',
        tokensUsed: 1500,
      })
      expect(result.tokensUsed).toBe(1500)
    })

    it('accepts empty findings array', () => {
      const result = reportOutputSchema.parse({
        summary: 'No findings',
        findings: [],
        rawMarkdown: '# Empty Report',
      })
      expect(result.findings).toEqual([])
    })
  })

  describe('reportExecutionStatusSchema', () => {
    it.each(['pending', 'running', 'completed', 'failed'] as const)('accepts valid status: %s', (status) => {
      expect(reportExecutionStatusSchema.parse(status)).toBe(status)
    })

    it('rejects invalid status', () => {
      expect(() => reportExecutionStatusSchema.parse('cancelled')).toThrow()
    })
  })

  describe('reportTemplateIdSchema', () => {
    it.each(reportTemplateIds)('accepts valid template: %s', (templateId) => {
      expect(reportTemplateIdSchema.parse(templateId)).toBe(templateId)
    })

    it('rejects invalid template', () => {
      expect(() => reportTemplateIdSchema.parse('unknown_template')).toThrow()
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

    it('rejects invalid UUID', () => {
      expect(() => reportSchema.parse({ ...validReport, id: 'invalid' })).toThrow()
    })

    it('rejects empty name', () => {
      expect(() => reportSchema.parse({ ...validReport, name: '' })).toThrow()
    })

    it('rejects name too long', () => {
      expect(() => reportSchema.parse({ ...validReport, name: 'a'.repeat(201) })).toThrow()
    })
  })

  describe('reportExecutionSchema', () => {
    const validExecution = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      reportId: '550e8400-e29b-41d4-a716-446655440001',
      status: 'completed',
      output: {
        summary: 'Analysis complete',
        findings: [],
        rawMarkdown: '# Report',
      },
      error: null,
      startedAt: new Date(),
      completedAt: new Date(),
    }

    it('accepts valid execution', () => {
      const result = reportExecutionSchema.parse(validExecution)
      expect(result.status).toBe('completed')
    })

    it('accepts failed execution with error', () => {
      const result = reportExecutionSchema.parse({
        ...validExecution,
        status: 'failed',
        output: null,
        error: 'Integration timeout',
        completedAt: new Date(),
      })
      expect(result.error).toBe('Integration timeout')
    })

    it('accepts pending execution', () => {
      const result = reportExecutionSchema.parse({
        ...validExecution,
        status: 'pending',
        output: null,
        completedAt: null,
      })
      expect(result.completedAt).toBeNull()
    })
  })

  describe('createReportSchema', () => {
    it('accepts minimal input', () => {
      const result = createReportSchema.parse({
        name: 'My Report',
      })
      expect(result.name).toBe('My Report')
    })

    it('accepts full input', () => {
      const result = createReportSchema.parse({
        name: 'SEO Report',
        description: 'Weekly SEO analysis',
        templateId: 'seo_audit',
        schedule: { frequency: 'weekly', dayOfWeek: 1, hour: 9 },
        integrations: ['google_search_console'],
      })
      expect(result.templateId).toBe('seo_audit')
    })

    it('rejects empty name', () => {
      expect(() => createReportSchema.parse({ name: '' })).toThrow()
    })
  })

  describe('updateReportSchema', () => {
    it('accepts empty object', () => {
      const result = updateReportSchema.parse({})
      expect(result).toEqual({})
    })

    it('accepts partial updates', () => {
      const result = updateReportSchema.parse({
        name: 'Updated Name',
        isEnabled: false,
      })
      expect(result.name).toBe('Updated Name')
      expect(result.isEnabled).toBe(false)
    })

    it('accepts null values for nullable fields', () => {
      const result = updateReportSchema.parse({
        description: null,
        schedule: null,
        customPrompt: null,
      })
      expect(result.description).toBeNull()
    })
  })
})
