import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router'
import { useAuth } from '../lib/use-auth'

function WorkspaceLayout() {
  const { user, organizations, organization, role, selectOrganization, logout } = useAuth()
  const navigate = useNavigate()
  const [loggingOut, setLoggingOut] = useState(false)
  const basePath =
    role === 'admin'
      ? '/admin'
      : role === 'responder'
        ? '/responder'
        : role === 'viewer'
          ? '/viewer'
          : '/workspace'

  const navigation = [
    { label: 'Dashboard', to: basePath, end: true },
    { label: 'Incidents', to: `${basePath}/incidents`, end: false },
    { label: 'Services', to: `${basePath}/services`, end: false },
    { label: 'Audit History', to: `${basePath}/audit-logs`, end: false },
  ]

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await logout()
      navigate('/login', { replace: true })
    } catch {
      navigate('/login', { replace: true })
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-5">
          <span className="text-xl font-bold tracking-tight text-slate-900">OpsHub</span>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {navigation.map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              end={item.end}
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
          <label
            htmlFor="organization-switcher"
            className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-500"
          >
            Organization
          </label>
          {organizations.length > 1 ? (
            <select
              id="organization-switcher"
              value={organization?.id ?? ''}
              onChange={(event) => selectOrganization(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
            >
              {organizations.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          ) : (
            <p className="truncate text-sm font-medium text-slate-800">
              {organization?.name ?? 'No organization'}
            </p>
          )}

          <div className="mt-5 border-t border-slate-200 pt-4">
            <p className="truncate text-sm font-medium text-slate-800">{user?.name}</p>
            <p className="truncate text-xs text-slate-500">{user?.email}</p>
            <p className="mt-1 text-xs capitalize text-slate-500">
              {role ?? 'Setting up workspace'}
            </p>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="mt-3 text-sm font-semibold text-red-600 hover:text-red-700 disabled:opacity-60"
            >
              {loggingOut ? 'Signing outâ€¦' : 'Sign out'}
            </button>
          </div>
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
