'use client'

import { useState } from 'react'
import { Brain } from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Badge } from '@workspace/ui/components/badge'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@workspace/ui/components/empty'

interface ContextNode {
  id: string
  node_type: string
  title: string
  content: string
  source: string
  created_at: string
  updated_at: string
}

interface ContextListProps {
  contextNodes: ContextNode[]
  workspaceId: string
}

const nodeTypeLabels: Record<string, string> = {
  company_info: 'Company Info',
  competitor: 'Competitor',
  strategy: 'Strategy',
  metrics: 'Metrics',
  brand: 'Brand',
  audience: 'Audience',
  custom: 'Custom',
}

const nodeTypeVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  company_info: 'default',
  competitor: 'destructive',
  strategy: 'secondary',
  metrics: 'default',
  brand: 'secondary',
  audience: 'secondary',
  custom: 'outline',
}

export function ContextList({ contextNodes, workspaceId }: ContextListProps) {
  const [selectedNode, setSelectedNode] = useState<ContextNode | null>(null)

  if (contextNodes.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Brain size={24} />
          </EmptyMedia>
          <EmptyTitle>No context yet</EmptyTitle>
          <EmptyDescription>
            Add information about your company, competitors, and strategy. AI agents will use this context when analyzing your data and creating tickets.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        {contextNodes.map((node) => (
          <Card
            key={node.id}
            size="sm"
            className={`cursor-pointer transition-colors ${
              selectedNode?.id === node.id ? 'ring-2 ring-ring' : ''
            }`}
            onClick={() => setSelectedNode(node)}
          >
            <CardContent className="py-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={nodeTypeVariants[node.node_type] || 'outline'}>
                  {nodeTypeLabels[node.node_type] || node.node_type}
                </Badge>
                {node.source === 'ai_generated' && (
                  <Badge variant="outline">AI Generated</Badge>
                )}
              </div>
              <h3 className="font-medium">{node.title}</h3>
              <p className="text-muted-foreground text-sm mt-1 line-clamp-2">
                {node.content.slice(0, 150)}...
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedNode && (
        <Card className="h-fit sticky top-8">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={nodeTypeVariants[selectedNode.node_type]}>
                {nodeTypeLabels[selectedNode.node_type] || selectedNode.node_type}
              </Badge>
            </div>
            <CardTitle>{selectedNode.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="whitespace-pre-wrap text-sm">
              {selectedNode.content}
            </div>

            <div className="mt-6 pt-4 border-t flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Updated {new Date(selectedNode.updated_at).toLocaleDateString()}
              </p>
              <Badge variant="outline">
                {selectedNode.source === 'ai_generated' ? 'AI Generated' : 'User Edited'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
