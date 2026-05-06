import type { Database } from '@beam/db/client'
import { isBeamError, BeamError } from '@beam/core/utils'
import { tools, executeTool } from './tools'
import type { Env } from './tools/types'

export class McpServer {
  private workspaceId: string
  private env: Env
  private db: Database

  constructor(workspaceId: string, env: Env, db: Database) {
    this.workspaceId = workspaceId
    this.env = env
    this.db = db
  }

  async handle(request: Request): Promise<Response> {
    try {
      const body = (await request.json()) as {
        jsonrpc?: string
        method?: string
        params?: unknown
        id?: unknown
      }

      if (body.jsonrpc !== '2.0') {
        return this.errorResponse(body.id, -32600, 'Invalid Request: expected jsonrpc 2.0')
      }

      switch (body.method) {
        case 'initialize':
          return this.handleInitialize(body.id)

        case 'tools/list':
          return this.handleToolsList(body.id)

        case 'tools/call':
          return this.handleToolCall(body.id, body.params)

        case 'notifications/initialized':
          return this.successResponse(body.id, {})

        default:
          return this.errorResponse(body.id, -32601, `Method not found: ${body.method}`)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return this.errorResponse(null, -32700, `Parse error: ${message}`)
    }
  }

  private handleInitialize(id: unknown): Response {
    return this.successResponse(id, {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {},
      },
      serverInfo: {
        name: 'beam-mcp',
        version: '0.1.0',
      },
    })
  }

  private handleToolsList(id: unknown): Response {
    return this.successResponse(id, { tools })
  }

  private async handleToolCall(id: unknown, params: unknown): Promise<Response> {
    const { name, arguments: args } = params as {
      name: string
      arguments?: Record<string, unknown>
    }

    try {
      const result = await executeTool(name, args ?? {}, {
        workspaceId: this.workspaceId,
        env: this.env,
        db: this.db,
      })

      return this.successResponse(id, {
        content: [
          {
            type: 'text',
            text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
          },
        ],
      })
    } catch (error) {
      // Format error response based on error type
      if (isBeamError(error)) {
        return this.successResponse(id, {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: error.code,
                message: error.message,
                details: error.details,
              }, null, 2),
            },
          ],
          isError: true,
        })
      }

      const message = error instanceof Error ? error.message : 'Unknown error'
      return this.successResponse(id, {
        content: [{ type: 'text', text: `Error: ${message}` }],
        isError: true,
      })
    }
  }

  private successResponse(id: unknown, result: unknown): Response {
    return Response.json({
      jsonrpc: '2.0',
      id,
      result,
    })
  }

  private errorResponse(id: unknown, code: number, message: string): Response {
    return Response.json({
      jsonrpc: '2.0',
      id,
      error: { code, message },
    })
  }
}
