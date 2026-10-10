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
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Bank accounts</h1>

      {canEdit && (
        <div className="panel p-4 space-y-3">
          <p className="font-medium">Add an account</p>
          <input
            className="field"
            placeholder="Name, e.g. BOC Savings"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="field"
            placeholder="Balance right now (Rs.)"
            type="number"
            inputMode="decimal"
            value={opening}
            onChange={(e) => setOpening(e.target.value)}
          />
          {err && <p className="text-rose text-sm">{err}</p>}
          <button onClick={add} className="btn">
            Add account
          </button>
        </div>
      )}

      {rows.length === 0 ? (
        <p className="text-mute text-sm">No accounts yet.</p>
      ) : (
        <div className="panel rows">
          {rows.map((r) => (
            <div key={r.id} className="flex justify-between items-center p-4">
              <div>
                <p>{r.name}</p>
                <p className="text-xs text-mute num">Started with {money(r.opening_balance)}</p>
              </div>
              <div className="text-right">
                <p className="num font-medium">{money(r.balance)}</p>
                {isAdmin && (
                  <button onClick={() => remove(r.id)} className="link-danger">
                    delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
