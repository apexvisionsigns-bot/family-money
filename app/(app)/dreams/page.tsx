'use client'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import { money } from '@/lib/format'

type Dream = {
  id: string
  title: string
  target_age: number | null
  target_amount: number | null
  saved_amount: number
  note: string | null
  photo_path: string | null
}

export default function Dreams() {
  const { uid, isAdmin } = useAuth()
  const [dreams, setDreams] = useState<Dream[]>([])
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [title, setTitle] = useState('')
  const [age, setAge] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('dreams')
      .select('id, title, target_age, target_amount, saved_amount, note, photo_path')
      .order('target_age', { ascending: true, nullsFirst: false })
    const list = (data as Dream[]) ?? []
    setDreams(list)
    const paths = list.map((d) => d.photo_path).filter((p): p is string => !!p)
    if (paths.length) {
      const { data: signed } = await supabase.storage.from('dream-photos').createSignedUrls(paths, 3600)
      const map: Record<string, string> = {}
      signed?.forEach((s) => {
        if (s.path && s.signedUrl) map[s.path] = s.signedUrl
      })
      setUrls(map)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function add() {
    setErr('')
    if (!title.trim()) return setErr('Enter your dream')
    setSaving(true)
    let photo_path: string | null = null
    if (file) {
      const safe = file.name.toLowerCase().replace(/[^a-z0-9.]/g, '-')
      const path = `${uid}/${Date.now()}-${safe}`
      const { error: upErr } = await supabase.storage.from('dream-photos').upload(path, file)
      if (upErr) {
        setSaving(false)
        return setErr('Photo upload failed: ' + upErr.message)
      }
      photo_path = path
    }
    const { error } = await supabase.from('dreams').insert({
      title: title.trim(),
      target_age: age ? Number(age) : null,
      target_amount: amount ? Number(amount) : null,
      note: note.trim() || null,
      photo_path,
    })
    setSaving(false)
    if (error) return setErr(error.message)
    setTitle('')
    setAge('')
    setAmount('')
    setNote('')
    setFile(null)
    load()
  }

  async function addSaving(d: Dream) {
    const v = window.prompt('How much did you save for this dream? (Rs.)')
    if (!v || Number(v) <= 0) return
    await supabase
      .from('dreams')
      .update({ saved_amount: Number(d.saved_amount) + Number(v) })
      .eq('id', d.id)
    load()
  }

  async function remove(d: Dream) {
    if (!confirm('Delete this dream?')) return
    await supabase.from('dreams').delete().eq('id', d.id)
    if (d.photo_path) await supabase.storage.from('dream-photos').remove([d.photo_path])
    load()
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Dreams</h1>

      <div className="panel p-4 space-y-3">
        <p className="font-medium">Add a dream</p>
        <input
          className="field"
          placeholder="Your dream, e.g. Own a house"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            className="field"
            placeholder="By age"
            type="number"
            inputMode="numeric"
            value={age}
            onChange={(e) => setAge(e.target.value)}
          />
          <input
            className="field"
            placeholder="Cost (Rs.)"
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <input
          className="field"
          placeholder="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <input
          type="file"
          accept="image/*"
          className="block w-full text-sm text-mute file:mr-3 file:rounded-lg file:border file:border-line file:bg-raised file:px-3 file:py-2 file:text-ink"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        {err && <p className="text-accent text-sm">{err}</p>}
        <button onClick={add} disabled={saving} className="btn">
          {saving ? 'Saving...' : 'Add dream'}
        </button>
      </div>

      <div className="space-y-3">
        {dreams.length === 0 && <p className="text-mute text-sm">No dreams yet. Add the first one above.</p>}
        {dreams.map((d) => {
          const pct = d.target_amount ? Math.min(100, (Number(d.saved_amount) / Number(d.target_amount)) * 100) : 0
          const img = d.photo_path ? urls[d.photo_path] : null
          return (
            <div key={d.id} className="panel overflow-hidden">
              {img && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={img} alt={d.title} className="w-full h-52 object-cover" />
              )}
              <div className="p-4 space-y-3">
                <div className="flex justify-between">
                  <p className="text-lg font-medium leading-snug">{d.title}</p>
                  {d.target_age && <p className="text-sm text-accent shrink-0 ml-3">By age {d.target_age}</p>}
                </div>
                {d.note && <p className="text-sm text-mute">{d.note}</p>}
                {d.target_amount ? (
                  <>
                    <div className="h-2 bg-raised rounded-full overflow-hidden">
                      <div className="h-2 bg-accent rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-mute num">
                      {money(d.saved_amount)} of {money(d.target_amount)} ({pct.toFixed(0)}%)
                    </p>
                  </>
                ) : null}
                <div className="flex gap-4 text-sm">
                  <button onClick={() => addSaving(d)} className="text-accent underline underline-offset-4">
                    Add savings
                  </button>
                  {isAdmin && (
                    <button onClick={() => remove(d)} className="link-danger">
                      delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
