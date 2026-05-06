import 'dotenv/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import { eq } from 'drizzle-orm'
import postgres from 'postgres'
import { workspaces, workspaceApiKeys, contextNodes } from './schema'
import { generateApiKey } from '@beam/core/utils'

const client = postgres(process.env.DATABASE_URL!, { prepare: false })
const db = drizzle(client)

async function seed() {
  console.log('🌱 Seeding database...')

  // Check if workspace already exists
  let [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.slug, 'demo'))
    .limit(1)

  if (workspace) {
    console.log('✅ Workspace already exists:', workspace.id)
  } else {
    // Create a test workspace
    const [newWorkspace] = await db
      .insert(workspaces)
      .values({
        name: 'Demo Workspace',
        slug: 'demo',
        productTier: 'pro',
        websiteUrl: 'https://example.com',
      })
      .returning()

    if (!newWorkspace) {
      throw new Error('Failed to create workspace')
    }
    workspace = newWorkspace
    console.log('✅ Created workspace:', workspace.id)
  }

  // Generate a new API key (always create a new one so we can show it)
  const { key, hash, prefix } = await generateApiKey()

  await db.insert(workspaceApiKeys).values({
    workspaceId: workspace.id,
    keyHash: hash,
    keyPrefix: prefix,
    name: `API Key ${new Date().toISOString().slice(0, 10)}`,
  })

  console.log('✅ Created API key')
  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🔑 YOUR API KEY (save this, it won\'t be shown again):')
  console.log('')
  console.log(`   ${key}`)
  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')
  console.log('📋 Add this to your MCP config:')
  console.log('')
  console.log(JSON.stringify({
    mcpServers: {
      beam: {
        type: 'http',
        url: `http://localhost:8788/mcp/w/${workspace.id}`,
        headers: {
          Authorization: `Bearer ${key}`,
        },
      },
    },
  }, null, 2))
  console.log('')

  // Check if context nodes exist
  const existingNodes = await db
    .select()
    .from(contextNodes)
    .where(eq(contextNodes.workspaceId, workspace.id))
    .limit(1)

  if (existingNodes.length === 0) {
    await db.insert(contextNodes).values([
      {
        workspaceId: workspace.id,
        nodeType: 'company_info',
        title: 'Company Overview',
        content: `# Demo Company

This is a demo workspace for testing Beam MCP.

## What We Do
We help businesses grow through data-driven insights.

## Key Metrics
- Monthly Active Users: 10,000
- Revenue: $100k MRR
- Growth: 15% MoM`,
        source: 'user_edited',
      },
      {
        workspaceId: workspace.id,
        nodeType: 'strategy',
        title: 'Growth Strategy',
        content: `# Growth Strategy 2024

## Priorities
1. Increase organic traffic by 50%
2. Improve conversion rate from 2% to 4%
3. Launch referral program

## Channels
- SEO (primary)
- Paid ads (secondary)
- Content marketing`,
        source: 'ai_generated',
      },
    ])
    console.log('✅ Created initial context nodes')
  } else {
    console.log('✅ Context nodes already exist')
  }

  await client.end()
  console.log('')
  console.log('🎉 Seed complete!')
}

seed().catch(console.error)
