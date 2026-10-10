'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function signIn() {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) setError(error.message)
    else router.push('/dashboard')
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-5">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <span className="inline-block w-3 h-3 rounded-full bg-accent mb-4" />
          <h1 className="text-3xl font-semibold tracking-tight">Family Money</h1>
          <p className="text-mute mt-1">Sign in to see where the money stands.</p>
        </div>
        <div className="panel p-4 space-y-3">
          <input
            className="field"
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="field"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && signIn()}
          />
          {error && <p className="text-accent text-sm">{error}</p>}
          <button onClick={signIn} disabled={loading} className="btn w-full">
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </div>
      </div>
    </main>
  )
}
