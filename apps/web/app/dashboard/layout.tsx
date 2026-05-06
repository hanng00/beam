import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from './components/sidebar'
import { OnboardingModal } from './components/onboarding-modal'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch user's workspace
  const { data: membership } = await supabase
    .from('workspace_memberships')
    .select('workspace_id, role, workspaces(id, name, slug)')
    .eq('user_id', user.id)
    .single()

  const workspace = (membership?.workspaces as unknown as { id: string; name: string; slug: string }) ?? null

  // If no workspace, show onboarding modal
  if (!workspace) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <OnboardingModal user={user} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar user={user} workspace={workspace} />
      <main className="flex-1 ml-64">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
