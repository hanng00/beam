import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ReportDetailClient } from './report-detail-client'

interface ReportDetailPageProps {
  params: Promise<{ reportId: string }>
}

export default async function ReportDetailPage({ params }: ReportDetailPageProps) {
  const { reportId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: membership } = await supabase
    .from('workspace_memberships')
    .select('workspace_id')
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    redirect('/dashboard')
  }

  return (
    <ReportDetailClient 
      workspaceId={membership.workspace_id} 
      reportId={reportId} 
    />
  )
}
