'use client'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import { money } from '@/lib/format'

type Bal = { id: string; name: string; opening_balance: number; balance: number }

export default function Accounts() {
  const { canEdit, isAdmin } = useAuth()
  const [rows, setRows] = useState<Bal[]>([])
  const [name, setName] = useState('')
  const [opening, setOpening] = useState('')
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('account_balances')
      .select('id, name, opening_balance, balance')
      .order('name')
    setRows((data as Bal[]) ?? [])
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function add() {
    setErr('')
    if (!name.trim()) return setErr('Enter an account name')
    const { error } = await supabase
      .from('accounts')
      .insert({ name: name.trim(), opening_balance: Number(opening || 0) })
    if (error) return setErr(error.message)
    setName('')
    setOpening('')
    load()
  }

  async function remove(id: string) {
    if (!confirm('Delete this account?')) return
    const { error } = await supabase.from('accounts').delete().eq('id', id)
    if (error) alert('Cannot delete (account has transactions?): ' + error.message)
    else load()
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Bank accounts</h1>

      {canEdit && (
        <div className="bg-white border rounded-xl p-3 space-y-2">
          <p className="text-sm font-medium">Add account</p>
          <input
            className="w-full border rounded p-2"
            placeholder="Name (e.g. BOC Savings)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="w-full border rounded p-2"
            placeholder="Current balance (Rs.)"
            type="number"
            inputMode="decimal"
            value={opening}
            onChange={(e) => setOpening(e.target.value)}
          />
          {err && <p className="text-red-600 text-sm">{err}</p>}
          <button onClick={add} className="bg-black text-white rounded px-4 py-2">
            Add
          </button>
        </div>
      )}

      <div className="space-y-2">
        {rows.length === 0 && <p className="text-gray-500 text-sm">No accounts yet.</p>}
        {rows.map((r) => (
          <div key={r.id} className="flex justify-between items-center bg-white border rounded-lg p-3">
            <div>
              <p>{r.name}</p>
              <p className="text-xs text-gray-500">Started with {money(r.opening_balance)}</p>
            </div>
            <div className="text-right">
              <p className="font-medium">{money(r.balance)}</p>
              {isAdmin && (
                <button onClick={() => remove(r.id)} className="text-xs text-red-600 underline">
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
