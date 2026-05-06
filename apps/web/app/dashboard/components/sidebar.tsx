'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@workspace/ui/components/button'
import {
  House,
  Brain,
  Ticket,
  Plugs,
  Gear,
  SignOut,
} from '@phosphor-icons/react'

interface SidebarProps {
  user: { id: string; email?: string; user_metadata?: { full_name?: string } }
  workspace: { id: string; name: string; slug: string } | null
}

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: House },
  { href: '/dashboard/context', label: 'Context', icon: Brain },
  { href: '/dashboard/tickets', label: 'Tickets', icon: Ticket },
  { href: '/dashboard/integrations', label: 'Integrations', icon: Plugs },
  { href: '/dashboard/settings', label: 'Settings', icon: Gear },
]

export function Sidebar({ user, workspace }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
      <div className="p-6 border-b border-sidebar-border">
        <h1 className="text-xl font-bold text-sidebar-foreground">Beam</h1>
        {workspace && (
          <p className="text-sm text-muted-foreground mt-1 truncate">{workspace.name}</p>
        )}
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/dashboard' && pathname.startsWith(item.href))
            const Icon = item.icon

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                  }`}
                >
                  <Icon size={20} weight={isActive ? 'fill' : 'regular'} />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-foreground text-sm font-medium">
            {user.user_metadata?.full_name?.[0] || user.email?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user.user_metadata?.full_name || 'User'}
            </p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleSignOut} className="w-full justify-start">
          <SignOut size={18} />
          Sign out
        </Button>
      </div>
    </aside>
  )
}
