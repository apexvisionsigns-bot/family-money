'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export type Role = 'admin' | 'member' | 'viewer'
type Ctx = { uid: string; name: string; role: Role; canEdit: boolean; isAdmin: boolean }

const AuthCtx = createContext<Ctx | null>(null)

export function useAuth() {
  const c = useContext(AuthCtx)
  if (!c) throw new Error('useAuth must be used inside AuthProvider')
  return c
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [ctx, setCtx] = useState<Ctx | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        router.replace('/login')
        return
      }
      const uid = data.session.user.id
      const { data: p } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', uid)
        .single()
      if (!active) return
      const role = (p?.role ?? 'viewer') as Role
      setCtx({
        uid,
        name: p?.full_name ?? data.session.user.email ?? '',
        role,
        canEdit: role !== 'viewer',
        isAdmin: role === 'admin',
      })
    }
    load()
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) router.replace('/login')
    })
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [router])

  if (!ctx) return <p className="p-6">Loading...</p>
  return <AuthCtx.Provider value={ctx}>{children}</AuthCtx.Provider>
}
