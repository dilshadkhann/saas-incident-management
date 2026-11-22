import { NavLink, Outlet } from 'react-router'

function WorkspaceLayout() {
  const navigation = [
    { label: 'Dashboard', to: '.' },
    { label: 'Incidents', to: 'incidents' },
    { label: 'Services', to: 'services' },
  ]

  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside className="flex w-64 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-5">
          <span className="text-xl font-bold tracking-tight text-slate-900">OpsHub</span>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {navigation.map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              end={item.to === '.'}
              className={({ isActive }) =>
                `block rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-200 p-4">
          <p className="text-sm font-medium text-slate-900">Workspace</p>
          <p className="mt-1 text-xs text-slate-500">Organization</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
          <h1 className="text-sm font-semibold text-slate-800">Workspace</h1>
          <span className="text-sm text-slate-500">OpsHub</span>
        </header>

        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default WorkspaceLayout
