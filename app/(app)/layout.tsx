import AuthProvider from '@/components/AuthProvider'
import Nav from '@/components/Nav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Nav />
      <main className="max-w-3xl mx-auto px-4 pt-4 pb-28">{children}</main>
    </AuthProvider>
  )
}
