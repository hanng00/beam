import { Hono } from 'hono'
import { eq, desc } from 'drizzle-orm'
import { createDb } from '@beam/db/client'
import { reports, reportExecutions } from '@beam/db/schema'
import { createReportSchema, updateReportSchema } from '@beam/core/schemas'
import type { Env } from '../index'
import { createMockOutput, getAvailableTemplates } from '../reports'

export const reportsRoutes = new Hono<{ Bindings: Env }>()

// GET /api/workspaces/:workspaceId/reports
reportsRoutes.get('/', async (c) => {
  const workspaceId = c.req.param('workspaceId')
  if (!workspaceId) {
    return c.json({ error: 'Missing workspaceId' }, 400)
  }

  const db = createDb(c.env.DATABASE_URL)

  const allReports = await db
    .select()
    .from(reports)
    .where(eq(reports.workspaceId, workspaceId))
    .orderBy(desc(reports.createdAt))

  return c.json({ reports: allReports })
})

// POST /api/workspaces/:workspaceId/reports
reportsRoutes.post('/', async (c) => {
  const workspaceId = c.req.param('workspaceId')
  if (!workspaceId) {
    return c.json({ error: 'Missing workspaceId' }, 400)
  }

  const body = await c.req.json()
  const parsed = createReportSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: 'VALIDATION_ERROR', message: parsed.error.message }, 400)
  }

  const { name, description, templateId, schedule, customPrompt, integrations } = parsed.data
  const db = createDb(c.env.DATABASE_URL)

  const [report] = await db
    .insert(reports)
    .values({
      workspaceId,
      name,
      description: description ?? null,
      templateId: templateId ?? null,
      schedule: schedule ?? null,
      customPrompt: customPrompt ?? null,
      integrations: integrations ?? null,
      isEnabled: true,
    })
    .returning()

  if (!report) {
    return c.json({ error: 'CREATE_FAILED', message: 'Failed to create report' }, 500)
  }

  return c.json(report, 201)
})

// GET /api/workspaces/:workspaceId/reports/templates
reportsRoutes.get('/templates', async (c) => {
  const templates = getAvailableTemplates()
  return c.json({ templates })
})

// GET /api/workspaces/:workspaceId/reports/:reportId
reportsRoutes.get('/:reportId', async (c) => {
  const workspaceId = c.req.param('workspaceId')
  const reportId = c.req.param('reportId')
  if (!workspaceId || !reportId) {
    return c.json({ error: 'Missing parameters' }, 400)
  }

  const db = createDb(c.env.DATABASE_URL)

  const [report] = await db
    .select()
    .from(reports)
    .where(eq(reports.id, reportId))
    .limit(1)

  if (!report || report.workspaceId !== workspaceId) {
    return c.json({ error: 'NOT_FOUND', message: 'Report not found' }, 404)
  }

  return c.json(report)
})

// PATCH /api/workspaces/:workspaceId/reports/:reportId
reportsRoutes.patch('/:reportId', async (c) => {
  const workspaceId = c.req.param('workspaceId')
  const reportId = c.req.param('reportId')
  if (!workspaceId || !reportId) {
    return c.json({ error: 'Missing parameters' }, 400)
  }

  const body = await c.req.json()
  const parsed = updateReportSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: 'VALIDATION_ERROR', message: parsed.error.message }, 400)
  }

  const db = createDb(c.env.DATABASE_URL)

  const [existing] = await db
    .select()
    .from(reports)
    .where(eq(reports.id, reportId))
    .limit(1)

  if (!existing || existing.workspaceId !== workspaceId) {
    return c.json({ error: 'NOT_FOUND', message: 'Report not found' }, 404)
  }

  const updateData: Partial<typeof reports.$inferInsert> = {
    updatedAt: new Date(),
  }

  const { name, description, templateId, schedule, customPrompt, integrations, isEnabled } = parsed.data

  if (name !== undefined) updateData.name = name
  if (description !== undefined) updateData.description = description
  if (templateId !== undefined) updateData.templateId = templateId
  if (schedule !== undefined) updateData.schedule = schedule
  if (customPrompt !== undefined) updateData.customPrompt = customPrompt
  if (integrations !== undefined) updateData.integrations = integrations
  if (isEnabled !== undefined) updateData.isEnabled = isEnabled

  const [updated] = await db
    .update(reports)
    .set(updateData)
    .where(eq(reports.id, reportId))
    .returning()

  return c.json(updated)
})

// DELETE /api/workspaces/:workspaceId/reports/:reportId
reportsRoutes.delete('/:reportId', async (c) => {
  const workspaceId = c.req.param('workspaceId')
  const reportId = c.req.param('reportId')
  if (!workspaceId || !reportId) {
    return c.json({ error: 'Missing parameters' }, 400)
  }

  const db = createDb(c.env.DATABASE_URL)

  const [existing] = await db
    .select()
    .from(reports)
    .where(eq(reports.id, reportId))
    .limit(1)

  if (!existing || existing.workspaceId !== workspaceId) {
    return c.json({ error: 'NOT_FOUND', message: 'Report not found' }, 404)
  }

  await db.delete(reports).where(eq(reports.id, reportId))

  return c.json({ success: true })
})

// POST /api/workspaces/:workspaceId/reports/:reportId/run
reportsRoutes.post('/:reportId/run', async (c) => {
  const workspaceId = c.req.param('workspaceId')
  const reportId = c.req.param('reportId')
  if (!workspaceId || !reportId) {
    return c.json({ error: 'Missing parameters' }, 400)
  }

  const db = createDb(c.env.DATABASE_URL)

  const [report] = await db
    .select()
    .from(reports)
    .where(eq(reports.id, reportId))
    .limit(1)

  if (!report || report.workspaceId !== workspaceId) {
    return c.json({ error: 'NOT_FOUND', message: 'Report not found' }, 404)
  }

  // Create execution record
  const [execution] = await db
    .insert(reportExecutions)
    .values({
      reportId,
      status: 'running',
      startedAt: new Date(),
    })
    .returning()

  if (!execution) {
    return c.json({ error: 'EXECUTION_FAILED', message: 'Failed to create execution' }, 500)
  }

  // For now, use mock output (in production, this would be async with queue)
  const output = createMockOutput(report.templateId as 'seo_audit' | 'traffic_analysis' | 'conversion_funnel' | 'custom' | null)

  // Update execution with result
  const [completedExecution] = await db
    .update(reportExecutions)
    .set({
      status: 'completed',
      output,
      completedAt: new Date(),
    })
    .where(eq(reportExecutions.id, execution.id))
    .returning()

  // Update report's lastRunAt
  await db
    .update(reports)
    .set({ lastRunAt: new Date(), updatedAt: new Date() })
    .where(eq(reports.id, reportId))

  return c.json(completedExecution, 201)
})

// GET /api/workspaces/:workspaceId/reports/:reportId/executions
reportsRoutes.get('/:reportId/executions', async (c) => {
  const workspaceId = c.req.param('workspaceId')
  const reportId = c.req.param('reportId')
  if (!workspaceId || !reportId) {
    return c.json({ error: 'Missing parameters' }, 400)
  }

  const limitStr = c.req.query('limit')
  const limit = limitStr ? parseInt(limitStr, 10) : 20

  const db = createDb(c.env.DATABASE_URL)

  // Verify report belongs to workspace
  const [report] = await db
    .select()
    .from(reports)
    .where(eq(reports.id, reportId))
    .limit(1)

  if (!report || report.workspaceId !== workspaceId) {
    return c.json({ error: 'NOT_FOUND', message: 'Report not found' }, 404)
  }

  const executions = await db
    .select()
    .from(reportExecutions)
    .where(eq(reportExecutions.reportId, reportId))
    .orderBy(desc(reportExecutions.startedAt))
    .limit(Math.min(limit, 100))

  return c.json({ executions })
})
