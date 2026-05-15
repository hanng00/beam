'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Badge } from '@workspace/ui/components/badge'
import { useMoveTicket } from '@/lib/hooks/use-tickets'

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

interface TicketKanbanProps {
  tickets: TicketData[]
  workspaceId: string
}

const columns = [
  { id: 'new', label: 'New' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'review', label: 'Review' },
  { id: 'done', label: 'Done' },
] as const

type ColumnId = typeof columns[number]['id']

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

export function TicketKanban({ tickets, workspaceId }: TicketKanbanProps) {
  const moveTicket = useMoveTicket(workspaceId)
  const [draggedTicket, setDraggedTicket] = useState<TicketData | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<ColumnId | null>(null)

  const getTicketsForColumn = useCallback((columnId: ColumnId) => {
    return tickets.filter(ticket => ticket.status === columnId)
  }, [tickets])

  const handleDragStart = (e: React.DragEvent, ticket: TicketData) => {
    setDraggedTicket(ticket)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', ticket.id)
  }

  const handleDragEnd = () => {
    setDraggedTicket(null)
    setDragOverColumn(null)
  }

  const handleDragOver = (e: React.DragEvent, columnId: ColumnId) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverColumn(columnId)
  }

  const handleDragLeave = () => {
    setDragOverColumn(null)
  }

  const handleDrop = async (e: React.DragEvent, columnId: ColumnId) => {
    e.preventDefault()
    setDragOverColumn(null)

    if (!draggedTicket || draggedTicket.status === columnId) {
      return
    }

    try {
      await moveTicket.mutateAsync({
        ticketId: draggedTicket.id,
        status: columnId,
      })
    } catch (error) {
      console.error('Failed to move ticket:', error)
    }
  }

  return (
    <div className="grid grid-cols-4 gap-4 min-h-[600px]">
      {columns.map((column) => {
        const columnTickets = getTicketsForColumn(column.id)
        const isOver = dragOverColumn === column.id

        return (
          <div
            key={column.id}
            className={`flex flex-col rounded-xl bg-muted/30 p-3 transition-colors ${
              isOver ? 'bg-muted/60 ring-2 ring-ring ring-dashed' : ''
            }`}
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="font-medium text-sm">{column.label}</h3>
              <Badge variant="outline" className="text-xs">
                {columnTickets.length}
              </Badge>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto">
              {columnTickets.map((ticket) => (
                <Card
                  key={ticket.id}
                  size="sm"
                  draggable
                  onDragStart={(e) => handleDragStart(e, ticket)}
                  onDragEnd={handleDragEnd}
                  className={`cursor-grab active:cursor-grabbing transition-all ${
                    draggedTicket?.id === ticket.id ? 'opacity-50 scale-95' : ''
                  }`}
                >
                  <CardContent className="py-3">
                    <h4 className="font-medium text-sm line-clamp-2 mb-2">
                      {ticket.title}
                    </h4>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge 
                        variant={priorityVariants[ticket.priority] || 'secondary'}
                        className="text-xs"
                      >
                        {ticket.priority}
                      </Badge>
                      {ticket.effort && effortLabels[ticket.effort] && (
                        <span className={`text-xs font-medium ${effortLabels[ticket.effort]!.color}`}>
                          {effortLabels[ticket.effort]!.label}
                        </span>
                      )}
                      {ticket.potential && (
                        <span className="text-xs text-emerald-500 truncate max-w-[80px]">
                          {ticket.potential}
                        </span>
                      )}
                    </div>
                    {ticket.confidence !== null && (
                      <div className="mt-2 flex items-center gap-1">
                        <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${ticket.confidence}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {ticket.confidence}%
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {columnTickets.length === 0 && (
                <div className="flex-1 flex items-center justify-center min-h-[100px] text-sm text-muted-foreground border-2 border-dashed rounded-lg">
                  Drop tickets here
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
