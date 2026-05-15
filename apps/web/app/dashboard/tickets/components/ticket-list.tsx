'use client'

import { useState, useMemo } from 'react'
import { Ticket as TicketIcon, CaretRight, Funnel, Rows, Columns } from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@workspace/ui/components/empty'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@workspace/ui/components/tabs'
import { TicketKanban } from './ticket-kanban'
import Link from 'next/link'

interface TicketData {
  id: string
  title: string
  description: string
  status: string
  priority: string
  potential?: string | null
  confidence?: number | null
  effort?: string | null
  tags?: string[] | null
  report_execution_id?: string | null
  reportExecutionId?: string | null
  created_at?: string
  createdAt?: string
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

const effortLabels: Record<string, { label: string; color: string }> = {
  trivial: { label: 'XS', color: 'text-emerald-500' },
  small: { label: 'S', color: 'text-emerald-500' },
  medium: { label: 'M', color: 'text-muted-foreground' },
  large: { label: 'L', color: 'text-muted-foreground' },
  epic: { label: 'XL', color: 'text-destructive' },
}

export function TicketList({ tickets, workspaceId }: TicketListProps) {
  const [selectedTicket, setSelectedTicket] = useState<TicketData | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [view, setView] = useState<'list' | 'kanban'>('list')

  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      if (statusFilter !== 'all' && ticket.status !== statusFilter) return false
      if (priorityFilter !== 'all' && ticket.priority !== priorityFilter) return false
      return true
    })
  }, [tickets, statusFilter, priorityFilter])

  if (tickets.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <TicketIcon size={24} />
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
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Funnel size={16} className="text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="review">Review</SelectItem>
              <SelectItem value="done">Done</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          {(statusFilter !== 'all' || priorityFilter !== 'all') && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                setStatusFilter('all')
                setPriorityFilter('all')
              }}
            >
              Clear filters
            </Button>
          )}
        </div>

        <Tabs value={view} onValueChange={(v) => setView(v as 'list' | 'kanban')}>
          <TabsList>
            <TabsTrigger value="list">
              <Rows size={16} className="mr-1" />
              List
            </TabsTrigger>
            <TabsTrigger value="kanban">
              <Columns size={16} className="mr-1" />
              Kanban
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {view === 'kanban' ? (
        <TicketKanban tickets={filteredTickets} workspaceId={workspaceId} />
      ) : (
        <div className="flex gap-6">
          <div className="flex-1 space-y-2">
            {filteredTickets.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No tickets match your filters
                </CardContent>
              </Card>
            ) : (
              filteredTickets.map((ticket) => (
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
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Badge variant={statusVariants[ticket.status] || 'secondary'}>
                            {ticket.status.replace('_', ' ')}
                          </Badge>
                          <Badge variant={priorityVariants[ticket.priority] || 'secondary'}>
                            {ticket.priority}
                          </Badge>
                          {ticket.effort && effortLabels[ticket.effort] && (
                            <span className={`text-xs font-medium ${effortLabels[ticket.effort]!.color}`}>
                              {effortLabels[ticket.effort]!.label}
                            </span>
                          )}
                          {ticket.potential && (
                            <span className="text-xs text-emerald-500">{ticket.potential}</span>
                          )}
                          {(ticket.report_execution_id || ticket.reportExecutionId) && (
                            <Badge variant="outline" className="text-xs">
                              From Report
                            </Badge>
                          )}
                        </div>
                      </div>
                      <CaretRight size={20} className="text-muted-foreground flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {selectedTicket && (
            <Card className="w-96 h-fit sticky top-8">
              <CardHeader>
                <CardTitle>{selectedTicket.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2 flex-wrap">
                  <Badge variant={statusVariants[selectedTicket.status]}>
                    {selectedTicket.status.replace('_', ' ')}
                  </Badge>
                  <Badge variant={priorityVariants[selectedTicket.priority]}>
                    {selectedTicket.priority}
                  </Badge>
                  {selectedTicket.effort && effortLabels[selectedTicket.effort] && (
                    <Badge variant="outline">
                      Effort: {effortLabels[selectedTicket.effort]!.label}
                    </Badge>
                  )}
                </div>

                {selectedTicket.potential && (
                  <div>
                    <p className="text-xs text-muted-foreground">Potential</p>
                    <p className="text-emerald-500 font-medium">{selectedTicket.potential}</p>
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

                {(selectedTicket.report_execution_id || selectedTicket.reportExecutionId) && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-2">Source</p>
                    <Link href="/dashboard/reports">
                      <Button variant="outline" size="sm" className="w-full">
                        View Source Report
                      </Button>
                    </Link>
                  </div>
                )}

                <p className="text-xs text-muted-foreground pt-4 border-t">
                  Created {new Date(selectedTicket.created_at || selectedTicket.createdAt || '').toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
