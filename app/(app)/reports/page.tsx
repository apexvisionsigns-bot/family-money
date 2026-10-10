'use client'
import { useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { supabase } from '@/lib/supabase'
import { money, localDate } from '@/lib/format'

type Row = {
  kind: 'income' | 'expense'
  amount: number
  tx_date: string
  accounts: { name: string } | null
  categories: { name: string } | null
}

const COLORS = ['#f0b94a', '#52d3a8', '#6aa7ff', '#ff7b8b', '#b794f6', '#f6975a', '#4fd1e0', '#a3e635', '#94a3b8', '#f472b6']
const TICK = { fill: '#8693b2', fontSize: 12 }
const TIP = {
  contentStyle: { background: '#1b2640', border: '1px solid #263250', borderRadius: 10, color: '#e9edf6' },
  itemStyle: { color: '#e9edf6' },
  labelStyle: { color: '#8693b2' },
}

function startOfWeek(d: Date) {
  const x = new Date(d)
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7))
  x.setHours(0, 0, 0, 0)
  return x
}

export default function Reports() {
  const [mode, setMode] = useState<'monthly' | 'weekly'>('monthly')
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const now = new Date()
      const since = new Date(now.getFullYear(), now.getMonth() - 5, 1)
      const { data } = await supabase
        .from('transactions')
        .select('kind, amount, tx_date, accounts(name), categories(name)')
        .gte('tx_date', localDate(since))
      setRows((data as unknown as Row[]) ?? [])
      setLoading(false)
    })()
  }, [])

  const bars = useMemo(() => {
    const now = new Date()
    const buckets: { key: string; label: string; income: number; expense: number }[] = []
    if (mode === 'monthly') {
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const key = localDate(d).slice(0, 7)
        buckets.push({
          key,
          label: d.toLocaleString('en', { month: 'short' }),
          income: 0,
          expense: 0,
        })
      }
    } else {
      const thisWeek = startOfWeek(now)
      for (let i = 7; i >= 0; i--) {
        const d = new Date(thisWeek)
        d.setDate(d.getDate() - i * 7)
        buckets.push({ key: localDate(d), label: localDate(d).slice(5), income: 0, expense: 0 })
      }
    }
    rows.forEach((r) => {
      const d = new Date(r.tx_date + 'T00:00:00')
      const key = mode === 'monthly' ? r.tx_date.slice(0, 7) : localDate(startOfWeek(d))
      const b = buckets.find((x) => x.key === key)
      if (!b) return
      if (r.kind === 'income') b.income += Number(r.amount)
      else b.expense += Number(r.amount)
    })
    return buckets
  }, [rows, mode])

  const thisMonth = localDate().slice(0, 7)
  const monthRows = rows.filter((r) => r.tx_date.startsWith(thisMonth))

  const byCategory = useMemo(() => {
    const m = new Map<string, number>()
    monthRows
      .filter((r) => r.kind === 'expense')
      .forEach((r) => {
        const k = r.categories?.name ?? 'Uncategorised'
        m.set(k, (m.get(k) ?? 0) + Number(r.amount))
      })
    return Array.from(m, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [monthRows])

  const byAccount = useMemo(() => {
    const m = new Map<string, { income: number; expense: number }>()
    monthRows.forEach((r) => {
      const k = r.accounts?.name ?? 'Unknown'
      const cur = m.get(k) ?? { income: 0, expense: 0 }
      if (r.kind === 'income') cur.income += Number(r.amount)
      else cur.expense += Number(r.amount)
      m.set(k, cur)
    })
    return Array.from(m, ([name, v]) => ({ name, ...v }))
  }, [monthRows])

  if (loading) return <p className="text-mute">Loading...</p>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>

      <div className="grid grid-cols-2 gap-2">
        {(['monthly', 'weekly'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className="seg"
            style={mode === m ? { background: 'rgba(240,185,74,.14)', borderColor: 'var(--color-gold)', color: 'var(--color-gold)' } : undefined}
          >
            {m === 'monthly' ? 'Monthly' : 'Weekly'}
          </button>
        ))}
      </div>

      <div className="panel p-4">
        <p className="font-medium mb-3">Income vs Expenses</p>
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer>
            <BarChart data={bars}>
              <XAxis dataKey="label" tick={TICK} axisLine={{ stroke: '#263250' }} tickLine={false} />
              <YAxis tick={TICK} width={48} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => money(Number(v))} cursor={{ fill: 'rgba(255,255,255,0.04)' }} {...TIP} />
              <Legend wrapperStyle={{ color: '#8693b2', fontSize: 12 }} />
              <Bar dataKey="income" name="Income" fill="#52d3a8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="Expense" fill="#ff7b8b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="panel p-4">
        <p className="font-medium mb-3">Where the money went this month</p>
        {byCategory.length === 0 ? (
          <p className="text-sm text-mute">No spending recorded this month.</p>
        ) : (
          <>
            <div style={{ width: '100%', height: 220 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={byCategory} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} stroke="#141c2e" strokeWidth={3}>
                    {byCategory.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => money(Number(v))} {...TIP} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1 mt-2">
              {byCategory.map((c, i) => (
                <div key={c.name} className="flex justify-between text-sm num">
                  <span className="flex items-center gap-2">
                    <span
                      className="inline-block w-3 h-3 rounded-full"
                      style={{ background: COLORS[i % COLORS.length] }}
                    />
                    {c.name}
                  </span>
                  <span>{money(c.value)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="panel p-4">
        <p className="font-medium mb-3">By bank account this month</p>
        {byAccount.length === 0 && <p className="text-sm text-mute">Nothing yet.</p>}
        {byAccount.map((a) => (
          <div key={a.name} className="flex justify-between text-sm py-2 border-t border-line first:border-0 num">
            <span>{a.name}</span>
            <span>
              <span className="text-mint">+{money(a.income)}</span>{' '}
              <span className="text-rose">-{money(a.expense)}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
