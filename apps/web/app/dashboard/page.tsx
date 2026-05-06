import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'

export default async function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card size="sm">
          <CardHeader>
            <CardDescription>Context Nodes</CardDescription>
            <CardTitle className="text-3xl">-</CardTitle>
          </CardHeader>
        </Card>
        
        <Card size="sm">
          <CardHeader>
            <CardDescription>Open Tickets</CardDescription>
            <CardTitle className="text-3xl">-</CardTitle>
          </CardHeader>
        </Card>
        
        <Card size="sm">
          <CardHeader>
            <CardDescription>Integrations</CardDescription>
            <CardTitle className="text-3xl">-</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Getting Started</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 text-muted-foreground">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center">1</span>
              <span>Add your company context in the <strong className="text-foreground">Context</strong> tab</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-muted text-muted-foreground text-sm flex items-center justify-center">2</span>
              <span>Connect your marketing tools in <strong className="text-foreground">Integrations</strong></span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-muted text-muted-foreground text-sm flex items-center justify-center">3</span>
              <span>Copy your MCP config from <strong className="text-foreground">Settings</strong> to use with Claude/Cursor</span>
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}
