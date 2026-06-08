'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Truck,
  FolderOpen,
  FileText,
  Settings,
  LogOut,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/fleet', icon: Truck, label: 'Fleet' },
  { href: '/projects', icon: FolderOpen, label: 'Projects' },
  { href: '/quotations', icon: FileText, label: 'Quotations' },
]

const adminItems = [
  { href: '/admin/units', label: 'Units' },
  { href: '/admin/pricelist', label: 'Pricelist' },
  { href: '/admin/clients', label: 'Clients' },
  { href: '/admin/users', label: 'Users' },
]

interface SidebarProps {
  role: string
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r bg-background">
      <div className="border-b px-6 py-5">
        <p className="font-semibold">SAPATrack</p>
        <p className="text-xs text-muted-foreground">PT Sarana Asset Prioritas</p>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {navItems.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
              pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
                ? 'bg-muted font-medium text-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Icon className="size-4 shrink-0" />
            {label}
          </Link>
        ))}

        {role === 'admin' && (
          <div className="pt-4">
            <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Admin
            </p>
            {adminItems.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  pathname.startsWith(href)
                    ? 'bg-muted font-medium text-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Settings className="size-4 shrink-0" />
                {label}
              </Link>
            ))}
          </div>
        )}
      </nav>

      <div className="border-t p-3">
        <form action={logout}>
          <Button
            type="submit"
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground"
          >
            <LogOut className="size-4 shrink-0" />
            Logout
          </Button>
        </form>
      </div>
    </aside>
  )
}
