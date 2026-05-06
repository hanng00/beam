'use client'

import { useState } from 'react'
import { Ticket, CaretRight } from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Badge } from '@workspace/ui/components/badge'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@workspace/ui/components/empty'

interface TicketData {
  id: string
  title: string
  description: string
  status: string
  priority: string
  potential: string | null
  confidence: number | null
  tags: string[] | null
  created_at: string
}

interface TicketListProps {
  tickets: TicketData[]
  workspaceId: string
}

const statusVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  new: 'default',
  assigned: 'secondary',
  in_progress: 'secondary',
  review: 'secondary',
  analysis: 'secondary',
  done: 'outline',
  archived: 'outline',
}

const priorityVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  low: 'outline',
  medium: 'secondary',
  high: 'default',
  urgent: 'destructive',
}

export function TicketList({ tickets, workspaceId }: TicketListProps) {
  const [selectedTicket, setSelectedTicket] = useState<TicketData | null>(null)

  if (tickets.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Ticket size={24} />
          </EmptyMedia>
          <EmptyTitle>No tickets yet</EmptyTitle>
          <EmptyDescription>
            Tickets will appear here when created via MCP or the API. Connect your MCP to Claude or Cursor and ask it to analyze your marketing data!
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="flex gap-6">
      <div className="flex-1 space-y-2">
        {tickets.map((ticket) => (
          <Card
            key={ticket.id}
            size="sm"
            className={`cursor-pointer transition-colors ${
              selectedTicket?.id === ticket.id ? 'ring-2 ring-ring' : ''
            }`}
            onClick={() => setSelectedTicket(ticket)}
          >
            <CardContent className="py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{ticket.title}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={statusVariants[ticket.status] || 'secondary'}>
                      {ticket.status.replace('_', ' ')}
                    </Badge>
                    <Badge variant={priorityVariants[ticket.priority] || 'secondary'}>
                      {ticket.priority}
                    </Badge>
                    {ticket.potential && (
                      <span className="text-xs text-green-500">{ticket.potential}</span>
                    )}
                  </div>
                </div>
                <CaretRight size={20} className="text-muted-foreground flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedTicket && (
        <Card className="w-96">
          <CardHeader>
            <CardTitle>{selectedTicket.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Badge variant={statusVariants[selectedTicket.status]}>
                {selectedTicket.status.replace('_', ' ')}
              </Badge>
              <Badge variant={priorityVariants[selectedTicket.priority]}>
                {selectedTicket.priority}
              </Badge>
            </div>

            {selectedTicket.potential && (
              <div>
                <p className="text-xs text-muted-foreground">Potential</p>
                <p className="text-green-500 font-medium">{selectedTicket.potential}</p>
              </div>
            )}

            {selectedTicket.confidence !== null && (
              <div>
                <p className="text-xs text-muted-foreground">Confidence</p>
                <p>{selectedTicket.confidence}%</p>
              </div>
            )}

            {selectedTicket.tags && selectedTicket.tags.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Tags</p>
                <div className="flex flex-wrap gap-1">
                  {selectedTicket.tags.map((tag) => (
                    <Badge key={tag} variant="outline">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-xs text-muted-foreground mb-1">Description</p>
              <p className="text-sm whitespace-pre-wrap">{selectedTicket.description}</p>
            </div>

            <p className="text-xs text-muted-foreground pt-4 border-t">
              Created {new Date(selectedTicket.created_at).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
