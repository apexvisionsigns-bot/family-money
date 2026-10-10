'use client'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import { money, localDate } from '@/lib/format'

type Acc = { id: string; name: string }
type Cat = { id: string; name: string; kind: 'income' | 'expense' }
type Tx = {
  id: string
  kind: 'income' | 'expense'
  amount: number
  note: string | null
  tx_date: string
  accounts: { name: string } | null
  categories: { name: string } | null
}

export default function Transactions() {
  const { canEdit, isAdmin } = useAuth()
  const [accs, setAccs] = useState<Acc[]>([])
  const [cats, setCats] = useState<Cat[]>([])
  const [txs, setTxs] = useState<Tx[]>([])
  const [month, setMonth] = useState(localDate().slice(0, 7))

  const [kind, setKind] = useState<'income' | 'expense'>('expense')
  const [amount, setAmount] = useState('')
  const [accountId, setAccountId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [date, setDate] = useState(localDate())
  const [note, setNote] = useState('')
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)

  const loadTx = useCallback(async () => {
    const [y, m] = month.split('-').map(Number)
    const from = `${month}-01`
    const next = new Date(y, m, 1)
    const to = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`
    const { data } = await supabase
      .from('transactions')
      .select('id, kind, amount, note, tx_date, accounts(name), categories(name)')
      .gte('tx_date', from)
      .lt('tx_date', to)
      .order('tx_date', { ascending: false })
      .order('created_at', { ascending: false })
    setTxs((data as unknown as Tx[]) ?? [])
  }, [month])

  useEffect(() => {
    ;(async () => {
      const [a, c] = await Promise.all([
        supabase.from('accounts').select('id, name').order('name'),
        supabase.from('categories').select('id, name, kind').order('name'),
      ])
      const aList = (a.data as Acc[]) ?? []
      setAccs(aList)
      setCats((c.data as Cat[]) ?? [])
      if (aList.length) setAccountId((cur) => cur || aList[0].id)
    })()
  }, [])

  useEffect(() => {
    loadTx()
  }, [loadTx])

  async function save() {
    setErr('')
    if (!accountId) return setErr('Add a bank account first (Accounts page)')
    if (!amount || Number(amount) <= 0) return setErr('Enter an amount')
    setSaving(true)
    const { error } = await supabase.from('transactions').insert({
      account_id: accountId,
      category_id: categoryId || null,
      kind,
      amount: Number(amount),
      note: note.trim() || null,
      tx_date: date,
    })
    setSaving(false)
    if (error) return setErr(error.message)
    setAmount('')
    setNote('')
    loadTx()
  }

  async function remove(id: string) {
    if (!confirm('Delete this entry?')) return
    await supabase.from('transactions').delete().eq('id', id)
    loadTx()
  }

  const inc = txs.filter((t) => t.kind === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const exp = txs.filter((t) => t.kind === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  const catOptions = cats.filter((c) => c.kind === kind)

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Money in / out</h1>

      {canEdit && (
        <div className="bg-white border rounded-xl p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setKind('expense')
                setCategoryId('')
              }}
              className={'rounded p-2 border ' + (kind === 'expense' ? 'bg-red-600 text-white' : '')}
            >
              Expense
            </button>
            <button
              onClick={() => {
                setKind('income')
                setCategoryId('')
              }}
              className={'rounded p-2 border ' + (kind === 'income' ? 'bg-green-600 text-white' : '')}
            >
              Income
            </button>
          </div>
          <input
            className="w-full border rounded p-2"
            placeholder="Amount (Rs.)"
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <select
            className="w-full border rounded p-2"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
          >
            {accs.length === 0 && <option value="">No accounts</option>}
            {accs.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <select
            className="w-full border rounded p-2"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">Category (what was it for?)</option>
            {catOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            className="w-full border rounded p-2"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <input
            className="w-full border rounded p-2"
            placeholder="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          {err && <p className="text-red-600 text-sm">{err}</p>}
          <button
            onClick={save}
            disabled={saving}
            className="w-full bg-black text-white rounded p-2 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <input
          type="month"
          className="border rounded p-2"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        />
        <div className="text-right text-sm">
          <p className="text-green-700">In: {money(inc)}</p>
          <p className="text-red-700">Out: {money(exp)}</p>
        </div>
      </div>

      <div className="space-y-2">
        {txs.length === 0 && <p className="text-gray-500 text-sm">Nothing this month.</p>}
        {txs.map((t) => (
          <div key={t.id} className="flex justify-between bg-white border rounded-lg p-3">
            <div>
              <p className="text-sm">
                {t.categories?.name ?? 'Uncategorised'}
                {t.note ? ` - ${t.note}` : ''}
              </p>
              <p className="text-xs text-gray-500">
                {t.tx_date} | {t.accounts?.name}
              </p>
            </div>
            <div className="text-right">
              <p className={t.kind === 'income' ? 'text-green-700' : 'text-red-700'}>
                {t.kind === 'income' ? '+' : '-'}
                {money(t.amount)}
              </p>
              {isAdmin && (
                <button onClick={() => remove(t.id)} className="text-xs text-red-600 underline">
                  delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
