'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import { fmtTime, localDate } from '@/lib/format'

type Person = { id: string; full_name: string | null }
type Ev = { id: string; owner: string; title: string; starts_at: string; ends_at: string; note: string | null }

// "free time" is only looked for between these hours
const DAY_START = 7
const DAY_END = 22
const MIN_FREE_MINUTES = 60

function mondayOf(d: Date) {
  const x = new Date(d)
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7))
  x.setHours(0, 0, 0, 0)
  return x
}

export default function Schedule() {
  const { uid } = useAuth()
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()))
  const [people, setPeople] = useState<Person[]>([])
  const [events, setEvents] = useState<Ev[]>([])
  const [freeFor, setFreeFor] = useState('all')

  const [title, setTitle] = useState('')
  const [date, setDate] = useState(localDate())
  const [start, setStart] = useState('09:00')
  const [end, setEnd] = useState('10:00')
  const [owner, setOwner] = useState(uid)
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    const to = new Date(weekStart)
    to.setDate(to.getDate() + 7)
    const { data } = await supabase
      .from('events')
      .select('id, owner, title, starts_at, ends_at, note')
      .lt('starts_at', to.toISOString())
      .gt('ends_at', weekStart.toISOString())
      .order('starts_at')
    setEvents((data as Ev[]) ?? [])
  }, [weekStart])

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('role', ['admin', 'member'])
      setPeople((data as Person[]) ?? [])
    })()
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const nameOf = (id: string) => people.find((p) => p.id === id)?.full_name ?? 'Someone'

  async function add() {
    setErr('')
    if (!title.trim()) return setErr('Enter a title')
    const s = new Date(`${date}T${start}`)
    const e = new Date(`${date}T${end}`)
    if (!(e > s)) return setErr('End time must be after start time')
    const { error } = await supabase
      .from('events')
      .insert({ owner, title: title.trim(), starts_at: s.toISOString(), ends_at: e.toISOString() })
    if (error) return setErr(error.message)
    setTitle('')
    load()
  }

  async function remove(id: string) {
    if (!confirm('Delete this event?')) return
    await supabase.from('events').delete().eq('id', id)
    load()
  }

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart)
      d.setDate(d.getDate() + i)
      const dayEvents = events.filter((e) => new Date(e.starts_at).toDateString() === d.toDateString())

      const wStart = new Date(d)
      wStart.setHours(DAY_START, 0, 0, 0)
      const wEnd = new Date(d)
      wEnd.setHours(DAY_END, 0, 0, 0)

      const busy = events
        .filter((e) => freeFor === 'all' || e.owner === freeFor)
        .map((e) => ({ s: Math.max(+new Date(e.starts_at), +wStart), e: Math.min(+new Date(e.ends_at), +wEnd) }))
        .filter((b) => b.e > b.s)
        .sort((a, b) => a.s - b.s)

      const merged: { s: number; e: number }[] = []
      busy.forEach((b) => {
        const last = merged[merged.length - 1]
        if (last && b.s <= last.e) last.e = Math.max(last.e, b.e)
        else merged.push({ ...b })
      })

      const free: { s: Date; e: Date }[] = []
      let cursor = +wStart
      merged.forEach((b) => {
        if (b.s - cursor >= MIN_FREE_MINUTES * 60000) free.push({ s: new Date(cursor), e: new Date(b.s) })
        cursor = Math.max(cursor, b.e)
      })
      if (+wEnd - cursor >= MIN_FREE_MINUTES * 60000) free.push({ s: new Date(cursor), e: wEnd })

      return { d, dayEvents, free }
    })
  }, [events, weekStart, freeFor])

  function shiftWeek(n: number) {
    const x = new Date(weekStart)
    x.setDate(x.getDate() + n * 7)
    setWeekStart(x)
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Schedule</h1>

      <div className="bg-white border rounded-xl p-3 space-y-2">
        <p className="text-sm font-medium">Add event</p>
        <input
          className="w-full border rounded p-2"
          placeholder="What? (e.g. Work, Class, Hospital)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <select className="w-full border rounded p-2" value={owner} onChange={(e) => setOwner(e.target.value)}>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              For: {p.full_name}
            </option>
          ))}
        </select>
        <input type="date" className="w-full border rounded p-2" value={date} onChange={(e) => setDate(e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <input type="time" className="border rounded p-2" value={start} onChange={(e) => setStart(e.target.value)} />
          <input type="time" className="border rounded p-2" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
        {err && <p className="text-red-600 text-sm">{err}</p>}
        <button onClick={add} className="bg-black text-white rounded px-4 py-2">
          Add
        </button>
      </div>

      <div className="flex items-center justify-between">
        <button onClick={() => shiftWeek(-1)} className="border rounded px-3 py-1 bg-white">
          &larr;
        </button>
        <p className="text-sm font-medium">
          Week of {weekStart.toLocaleDateString([], { month: 'short', day: 'numeric' })}
        </p>
        <button onClick={() => shiftWeek(1)} className="border rounded px-3 py-1 bg-white">
          &rarr;
        </button>
      </div>

      <select className="w-full border rounded p-2 bg-white" value={freeFor} onChange={(e) => setFreeFor(e.target.value)}>
        <option value="all">Free time: all of us together</option>
        {people.map((p) => (
          <option key={p.id} value={p.id}>
            Free time: {p.full_name} only
          </option>
        ))}
      </select>

      <div className="space-y-3">
        {days.map(({ d, dayEvents, free }) => (
          <div key={d.toISOString()} className="bg-white border rounded-xl p-3 space-y-2">
            <p className="font-medium text-sm">
              {d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
            </p>
            {dayEvents.map((e) => (
              <div key={e.id} className="flex justify-between bg-gray-100 rounded p-2 text-sm">
                <span>
                  {fmtTime(new Date(e.starts_at))} - {fmtTime(new Date(e.ends_at))} | {e.title}
                  <span className="text-gray-500"> ({nameOf(e.owner)})</span>
                </span>
                <button onClick={() => remove(e.id)} className="text-red-600 text-xs underline ml-2">
                  x
                </button>
              </div>
            ))}
            {free.length === 0 && <p className="text-xs text-gray-500">No free slot of 1h+ ({DAY_START}:00-{DAY_END}:00)</p>}
            {free.map((f, i) => (
              <div key={i} className="bg-green-100 text-green-800 rounded p-2 text-sm">
                Free: {fmtTime(f.s)} - {fmtTime(f.e)}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
