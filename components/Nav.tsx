'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'

export default function Nav() {
  const { name, role, canEdit } = useAuth()
  const path = usePathname()
  const router = useRouter()

  const links = [
    { href: '/dashboard', label: 'Home' },
    { href: '/accounts', label: 'Accounts' },
    { href: '/transactions', label: 'Money' },
    { href: '/reports', label: 'Reports' },
    ...(canEdit
      ? [
          { href: '/schedule', label: 'Schedule' },
          { href: '/dreams', label: 'Dreams' },
        ]
      : []),
  ]

  async function logout() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  return (
    <header className="bg-white border-b sticky top-0 z-10">
      <div className="max-w-3xl mx-auto px-4 pt-3 flex justify-between items-center">
        <div>
          <p className="font-semibold">Family Money</p>
          <p className="text-xs text-gray-500">
            {name} ({role})
          </p>
        </div>
        <button onClick={logout} className="text-sm underline">
          Logout
        </button>
      </div>
      <nav className="max-w-3xl mx-auto px-2 flex gap-1 overflow-x-auto">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={
              'px-3 py-2 text-sm whitespace-nowrap border-b-2 ' +
              (path.startsWith(l.href)
                ? 'border-black font-medium'
                : 'border-transparent text-gray-500')
            }
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  )
}
