import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@workspace/ui/components/button'

export default async function Page() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="max-w-md text-center">
        <h1 className="text-4xl font-bold mb-4">Beam</h1>
        <p className="text-muted-foreground text-lg mb-8">
          AI-powered marketing intelligence. Connect your tools, get insights via MCP.
        </p>
        
        <div className="flex gap-4 justify-center">
          <Button variant="outline" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">Get started</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
