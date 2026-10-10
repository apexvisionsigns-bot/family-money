'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { money, localDate } from '@/lib/format'

type Bal = { id: string; name: string; balance: number }

export default function Dashboard() {
  const [bals, setBals] = useState<Bal[]>([])
  const [inc, setInc] = useState(0)
  const [exp, setExp] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const start = localDate().slice(0, 8) + '01'
      const [b, t] = await Promise.all([
        supabase.from('account_balances').select('id, name, balance').order('name'),
        supabase.from('transactions').select('kind, amount').gte('tx_date', start),
      ])
      setBals((b.data as Bal[]) ?? [])
      let i = 0
      let e = 0
      ;(t.data ?? []).forEach((r: { kind: string; amount: number }) => {
        if (r.kind === 'income') i += Number(r.amount)
        else e += Number(r.amount)
      })
      setInc(i)
      setExp(e)
      setLoading(false)
    })()
  }, [])

  if (loading) return <p>Loading...</p>
  const total = bals.reduce((s, b) => s + Number(b.balance), 0)

  return (
    <div className="space-y-4">
      <div className="bg-black text-white rounded-xl p-4">
        <p className="text-sm opacity-70">Total balance</p>
        <p className="text-3xl font-semibold">{money(total)}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border rounded-xl p-3">
          <p className="text-xs text-gray-500">Income this month</p>
          <p className="text-lg font-semibold text-green-700">{money(inc)}</p>
        </div>
        <div className="bg-white border rounded-xl p-3">
          <p className="text-xs text-gray-500">Spent this month</p>
          <p className="text-lg font-semibold text-red-700">{money(exp)}</p>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="font-medium">Accounts</h2>
        {bals.length === 0 && (
          <p className="text-gray-500 text-sm">
            No accounts yet. <Link className="underline" href="/accounts">Add your first account</Link>
          </p>
        )}
        {bals.map((b) => (
          <div key={b.id} className="flex justify-between bg-white border rounded-lg p-3">
            <span>{b.name}</span>
            <span>{money(b.balance)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
