'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { House, Landmark, ArrowLeftRight, ChartColumn, CalendarDays, Sparkles, LogOut } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'

export default function Nav() {
  const { name, role, canEdit } = useAuth()
  const path = usePathname()
  const router = useRouter()

  const links = [
    { href: '/dashboard', label: 'Home', Icon: House },
    { href: '/accounts', label: 'Accounts', Icon: Landmark },
    { href: '/transactions', label: 'Money', Icon: ArrowLeftRight },
    { href: '/reports', label: 'Reports', Icon: ChartColumn },
    ...(canEdit
      ? [
          { href: '/schedule', label: 'Schedule', Icon: CalendarDays },
          { href: '/dreams', label: 'Dreams', Icon: Sparkles },
        ]
      : []),
  ]

  async function logout() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  return (
    <>
      <header className="max-w-3xl mx-auto px-4 pt-5 pb-1 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-gold" />
          <span className="font-semibold tracking-tight">Family Money</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right leading-tight">
            <p className="text-sm">{name}</p>
            <p className="text-xs text-mute">{role}</p>
          </div>
          <button onClick={logout} aria-label="Log out" className="text-mute hover:text-ink p-2">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <nav className="fixed bottom-0 inset-x-0 z-20 bg-surface/95 backdrop-blur border-t border-line">
        <div className="max-w-3xl mx-auto flex justify-around px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {links.map(({ href, label, Icon }) => {
            const active = path.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={
                  'flex flex-col items-center gap-0.5 px-3 py-1 text-[11px] ' +
                  (active ? 'text-gold' : 'text-mute')
                }
              >
                <Icon size={21} strokeWidth={active ? 2.3 : 1.8} />
                {label}
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
