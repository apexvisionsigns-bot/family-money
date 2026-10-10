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

  if (loading) return <p className="text-mute">Loading...</p>
  const total = bals.reduce((s, b) => s + Number(b.balance), 0)
  const flow = inc + exp
  const incPct = flow ? (inc / flow) * 100 : 50

  return (
    <div className="space-y-8">
      <section className="pt-4">
        <p className="text-mute text-sm">Total balance</p>
        <p className="num text-[2.6rem] leading-tight font-semibold tracking-tight">{money(total)}</p>

        <div className="mt-5">
          <div className="flex h-2 rounded-full overflow-hidden bg-raised">
            {flow > 0 && (
              <>
                <div className="bg-mint" style={{ width: `${incPct}%` }} />
                <div className="bg-rose" style={{ width: `${100 - incPct}%` }} />
              </>
            )}
          </div>
          <div className="flex justify-between mt-3 text-sm">
            <div>
              <p className="text-mute">In this month</p>
              <p className="num text-mint font-medium">{money(inc)}</p>
            </div>
            <div className="text-right">
              <p className="text-mute">Out this month</p>
              <p className="num text-rose font-medium">{money(exp)}</p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="font-medium mb-3">Accounts</h2>
        {bals.length === 0 ? (
          <div className="panel p-4 text-sm text-mute">
            Nothing here yet.{' '}
            <Link className="text-gold underline underline-offset-4" href="/accounts">
              Add your first bank account
            </Link>
          </div>
        ) : (
          <div className="panel rows">
            {bals.map((b) => (
              <div key={b.id} className="flex justify-between p-4">
                <span>{b.name}</span>
                <span className="num font-medium">{money(b.balance)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
