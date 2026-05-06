import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import type { Tool } from '@modelcontextprotocol/sdk/types.js'

/**
 * Creates an MCP tool definition from a Zod schema.
 * The schema's .describe() calls become the JSON Schema descriptions.
 */
export function createMcpTool<T extends z.ZodType>(
  name: string,
  description: string,
  schema: T
): Tool {
  const jsonSchema = zodToJsonSchema(schema, {
    $refStrategy: 'none', // Inline all refs for MCP compatibility
    target: 'jsonSchema7',
  })

  // Remove $schema property as MCP doesn't need it
  const { $schema, ...inputSchema } = jsonSchema as Record<string, unknown>

  return {
    name,
    description,
    inputSchema: inputSchema as Tool['inputSchema'],
  }
}

/**
 * Validates arguments against a Zod schema and returns typed result.
 * Throws ZodError with detailed messages on validation failure.
 */
export function validateArgs<T extends z.ZodType>(
  schema: T,
  args: unknown
): z.infer<T> {
  return schema.parse(args)
}

/**
 * Safely validates arguments, returning a result object instead of throwing.
 */
export function safeValidateArgs<T extends z.ZodType>(
  schema: T,
  args: unknown
): { success: true; data: z.infer<T> } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(args)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, error: result.error }
}

/**
 * Formats a ZodError into a human-readable message for MCP responses.
 */
export function formatZodError(error: z.ZodError): string {
  return error.errors
    .map((e) => {
      const path = e.path.length > 0 ? `${e.path.join('.')}: ` : ''
      return `${path}${e.message}`
    })
    .join('; ')
}
