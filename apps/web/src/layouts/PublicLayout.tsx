import { Outlet } from 'react-router'

function PublicLayout() {
  return (
    <main className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <span className="text-xl font-bold tracking-tight text-slate-900">OpsHub</span>
      </header>

      <section className="flex flex-1 items-center justify-center p-6">
        <Outlet />
      </section>
    </main>
  )
}

export default PublicLayout
