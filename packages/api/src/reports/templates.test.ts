import { describe, it, expect } from 'bun:test'
import { getTemplate, buildPrompt, getAvailableTemplates } from './templates'

describe('templates', () => {
  describe('getTemplate', () => {
    it('returns templates by id', () => {
      expect(getTemplate('seo_audit')?.id).toBe('seo_audit')
      expect(getTemplate('traffic_analysis')?.id).toBe('traffic_analysis')
      expect(getTemplate('conversion_funnel')?.id).toBe('conversion_funnel')
      expect(getTemplate('custom')).toBeNull()
      expect(getTemplate('unknown' as any)).toBeNull()
    })
  })

  describe('buildPrompt', () => {
    it('replaces placeholders correctly', () => {
      const template = {
        id: 'test' as const,
        name: 'Test',
        description: 'Test template',
        requiredIntegrations: [],
        promptTemplate: '{{greeting}} {{name}}, data: {{data}}',
      }
      
      const result = buildPrompt(template, { greeting: 'Hello', name: 'User' })
      expect(result).toBe('Hello User, data: {{data}}')
    })

    it('works with real SEO audit template', () => {
      const template = getTemplate('seo_audit')!
      const result = buildPrompt(template, {
        context: 'E-commerce website',
        searchConsoleData: '{"clicks": 1000}',
      })
      expect(result).toContain('E-commerce website')
      expect(result).toContain('{"clicks": 1000}')
    })
  })

  describe('getAvailableTemplates', () => {
    it('returns all templates with required properties', () => {
      const templates = getAvailableTemplates()
      expect(templates.length).toBe(3)
      for (const t of templates) {
        expect(t.id).toBeDefined()
        expect(t.name).toBeDefined()
        expect(t.promptTemplate).toBeDefined()
      }
    })
  })
})
