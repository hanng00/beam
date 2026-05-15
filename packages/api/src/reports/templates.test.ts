import { describe, it, expect } from 'bun:test'
import { getTemplate, buildPrompt, getAvailableTemplates, reportTemplates } from './templates'

describe('templates', () => {
  describe('getTemplate', () => {
    it('returns seo_audit template', () => {
      const template = getTemplate('seo_audit')
      expect(template).not.toBeNull()
      expect(template?.id).toBe('seo_audit')
      expect(template?.name).toBe('SEO Audit')
      expect(template?.requiredIntegrations).toContain('google_search_console')
    })

    it('returns traffic_analysis template', () => {
      const template = getTemplate('traffic_analysis')
      expect(template).not.toBeNull()
      expect(template?.id).toBe('traffic_analysis')
      expect(template?.requiredIntegrations).toContain('google_analytics')
    })

    it('returns conversion_funnel template', () => {
      const template = getTemplate('conversion_funnel')
      expect(template).not.toBeNull()
      expect(template?.id).toBe('conversion_funnel')
    })

    it('returns null for custom template', () => {
      const template = getTemplate('custom')
      expect(template).toBeNull()
    })

    it('returns null for unknown template', () => {
      const template = getTemplate('unknown' as any)
      expect(template).toBeNull()
    })
  })

  describe('buildPrompt', () => {
    it('replaces single placeholder', () => {
      const template = {
        id: 'test' as const,
        name: 'Test',
        description: 'Test template',
        requiredIntegrations: [],
        promptTemplate: 'Hello {{name}}!',
      }
      const result = buildPrompt(template, { name: 'World' })
      expect(result).toBe('Hello World!')
    })

    it('replaces multiple placeholders', () => {
      const template = {
        id: 'test' as const,
        name: 'Test',
        description: 'Test template',
        requiredIntegrations: [],
        promptTemplate: '{{greeting}} {{name}}, welcome to {{place}}!',
      }
      const result = buildPrompt(template, {
        greeting: 'Hello',
        name: 'User',
        place: 'Beam',
      })
      expect(result).toBe('Hello User, welcome to Beam!')
    })

    it('replaces same placeholder multiple times', () => {
      const template = {
        id: 'test' as const,
        name: 'Test',
        description: 'Test template',
        requiredIntegrations: [],
        promptTemplate: '{{name}} said hello to {{name}}',
      }
      const result = buildPrompt(template, { name: 'Alice' })
      expect(result).toBe('Alice said hello to Alice')
    })

    it('leaves unreplaced placeholders as-is', () => {
      const template = {
        id: 'test' as const,
        name: 'Test',
        description: 'Test template',
        requiredIntegrations: [],
        promptTemplate: 'Hello {{name}}, your data: {{data}}',
      }
      const result = buildPrompt(template, { name: 'User' })
      expect(result).toBe('Hello User, your data: {{data}}')
    })

    it('handles empty context', () => {
      const template = {
        id: 'test' as const,
        name: 'Test',
        description: 'Test template',
        requiredIntegrations: [],
        promptTemplate: 'No placeholders here',
      }
      const result = buildPrompt(template, {})
      expect(result).toBe('No placeholders here')
    })

    it('works with real SEO audit template', () => {
      const template = getTemplate('seo_audit')!
      const result = buildPrompt(template, {
        context: 'E-commerce website selling shoes',
        searchConsoleData: '{"clicks": 1000}',
      })
      expect(result).toContain('E-commerce website selling shoes')
      expect(result).toContain('{"clicks": 1000}')
    })
  })

  describe('getAvailableTemplates', () => {
    it('returns all templates', () => {
      const templates = getAvailableTemplates()
      expect(templates.length).toBe(3)
    })

    it('returns templates with required properties', () => {
      const templates = getAvailableTemplates()
      for (const template of templates) {
        expect(template.id).toBeDefined()
        expect(template.name).toBeDefined()
        expect(template.description).toBeDefined()
        expect(template.requiredIntegrations).toBeDefined()
        expect(template.promptTemplate).toBeDefined()
      }
    })

    it('does not include custom template', () => {
      const templates = getAvailableTemplates()
      const ids = templates.map((t) => t.id)
      expect(ids).not.toContain('custom')
    })
  })

  describe('reportTemplates', () => {
    it('has correct structure for each template', () => {
      for (const [key, template] of Object.entries(reportTemplates)) {
        expect(template.id).toBe(key)
        expect(typeof template.name).toBe('string')
        expect(typeof template.description).toBe('string')
        expect(Array.isArray(template.requiredIntegrations)).toBe(true)
        expect(typeof template.promptTemplate).toBe('string')
      }
    })
  })
})
