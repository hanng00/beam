import { Hono } from 'hono'
import type { Env } from '../index'
import { authRoutes } from './auth'
import { workspacesRoutes } from './workspaces'
import { integrationsRoutes } from './integrations'
import { contextRoutes } from './context'
import { ticketsRoutes } from './tickets'
import { reportsRoutes } from './reports'

export const apiRoutes = new Hono<{ Bindings: Env }>()

apiRoutes.route('/auth', authRoutes)
apiRoutes.route('/workspaces', workspacesRoutes)
apiRoutes.route('/workspaces/:workspaceId/integrations', integrationsRoutes)
apiRoutes.route('/workspaces/:workspaceId/context', contextRoutes)
apiRoutes.route('/workspaces/:workspaceId/tickets', ticketsRoutes)
apiRoutes.route('/workspaces/:workspaceId/reports', reportsRoutes)
