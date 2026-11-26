import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router'
import { Button } from '../components/ui/Button'
import { useAuth } from '../lib/use-auth'

function Wordmark() {
  return (
    <span className="flex items-center gap-2.5">
      <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
        <rect x="2" y="9" width="5" height="11" rx="1" fill="currentColor" />
        <rect x="8.5" y="2" width="5" height="18" rx="1" fill="currentColor" />
        <rect x="15" y="6" width="5" height="14" rx="1" fill="currentColor" />
      </svg>
      <span className="text-lg font-bold tracking-tight text-slate-900">OpsHub</span>
    </span>
  )
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" fill="none">
      {open ? (
        <path
          d="M4 4l12 12M16 4L4 16"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      ) : (
        <path
          d="M3 5.5h14M3 10h14M3 14.5h14"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      )}
    </svg>
  )
}

function WorkspaceLayout() {
  const { user, organizations, organization, role, selectOrganization, logout } = useAuth()
  const navigate = useNavigate()
  const [loggingOut, setLoggingOut] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

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
    { label: 'Audit history', to: `${basePath}/audit-logs`, end: false },
  ]

  useEffect(() => {
    if (!menuOpen) return
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [menuOpen])

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
    <div className="min-h-screen bg-slate-100 lg:grid lg:grid-cols-[15.5rem_minmax(0,1fr)]">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 lg:hidden">
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="primary-sidebar"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          className="-ml-2 inline-flex h-10 w-10 items-center justify-center rounded-md text-slate-800 hover:bg-slate-200/70"
        >
          <MenuIcon open={menuOpen} />
        </button>
        <Wordmark />
      </header>

      {menuOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          tabIndex={-1}
          onClick={() => setMenuOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
        />
      ) : null}

      <aside
        id="primary-sidebar"
        className={`${
          menuOpen ? 'fixed inset-y-0 left-0 z-50 block w-72 shadow-xl' : 'hidden'
        } border-r border-slate-200 bg-slate-50 lg:block lg:w-auto lg:shadow-none`}
      >
        <div className="flex h-full flex-col lg:sticky lg:top-0 lg:h-screen">
          <div className="px-6 py-6">
            <Wordmark />
          </div>

          <nav aria-label="Primary" className="flex-1 space-y-0.5 px-3">
            {navigation.map((item) => (
              <NavLink
                key={item.label}
                to={item.to}
                end={item.end}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `block rounded-md px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? 'bg-white font-semibold text-slate-900 shadow-[inset_3px_0_0_var(--color-slate-900)]'
                      : 'font-medium text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="space-y-4 border-t border-slate-200 p-4">
            <div>
              <label
                htmlFor="organization-switcher"
                className="mb-1.5 block text-xs font-medium text-slate-500"
              >
                Organization
              </label>
              {organizations.length > 1 ? (
                <select
                  id="organization-switcher"
                  value={organization?.id ?? ''}
                  onChange={(event) => selectOrganization(event.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
                >
                  {organizations.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="truncate text-sm font-semibold text-slate-900">
                  {organization?.name ?? 'No organization'}
                </p>
              )}
            </div>

            <div>
              <p className="truncate text-sm font-medium text-slate-900">{user?.name}</p>
              <p className="truncate text-xs text-slate-500">{user?.email}</p>
              <p className="mt-0.5 text-xs capitalize text-slate-500">{role ?? 'Setting up'}</p>
              <Button
                variant="secondary"
                onClick={handleLogout}
                disabled={loggingOut}
                className="mt-3 w-full"
              >
                {loggingOut ? 'Signing out…' : 'Sign out'}
              </Button>
            </div>
          </div>
        </div>
      </aside>

      <main className="min-w-0 px-4 py-6 sm:px-8 lg:px-10 lg:py-9">
        <Outlet />
      </main>
    </div>
  )
}

export default WorkspaceLayout
