import AuthProvider from '@/components/AuthProvider'
import Nav from '@/components/Nav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Nav />
      <main className="max-w-3xl mx-auto p-4 pb-24">{children}</main>
    </AuthProvider>
  )
}
