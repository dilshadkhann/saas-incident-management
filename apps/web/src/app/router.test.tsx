import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../lib/auth-provider'
import { AppRoutes } from './router'
const user = {
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
  created_at: '2026-01-01T00:00:00Z',
}
const organization = {
  id: 'org-1',
  name: 'Test Organization',
  slug: 'test-organization',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}
type TestRole = 'admin' | 'responder' | 'viewer' | null
function jsonResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  } as Response
}
function mockApi(role: TestRole = null, hasOrganization = true, services: unknown[] = []) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/auth/me')) {
        return role ? jsonResponse(user) : jsonResponse({ detail: 'Not authenticated' }, 401)
      }
      if (url.endsWith('/organizations')) {
        return jsonResponse(role && hasOrganization ? [organization] : [])
      }
      if (url.includes('/members')) {
        return jsonResponse(
          role && hasOrganization
            ? [
                {
                  user_id: user.id,
                  name: user.name,
                  email: user.email,
                  role,
                  joined_at: '2026-01-01T00:00:00Z',
                },
              ]
            : [],
        )
      }
      if (url.includes('/audit-logs')) {
        return jsonResponse({ items: [], total: 0, limit: 8, offset: 0 })
      }
      if (url.includes('/services')) return jsonResponse(services)
      if (url.includes('/incidents')) return jsonResponse([])
      return jsonResponse({})
    }),
  )
}
function renderRoute(
  path: string,
  role: TestRole = null,
  hasOrganization = true,
  services: unknown[] = [],
) {
  mockApi(role, hasOrganization, services)
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </MemoryRouter>,
  )
}
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})
describe('AppRouter', () => {
  it('renders the home page', () => {
    renderRoute('/')
    expect(screen.getByRole('heading', { name: 'OpsHub' })).toBeInTheDocument()
  })
  it('renders the login page', () => {
    renderRoute('/login')
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
  })
  it('renders the registration page', () => {
    renderRoute('/register')
    expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument()
  })
  it.each(['admin', 'responder', 'viewer'] as const)('renders the %s dashboard', async (role) => {
    renderRoute(`/${role}`, role)
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Nothing to monitor yet' }),
    ).toBeInTheDocument()
  })
  it.each([
    ['admin', true],
    ['responder', true],
    ['viewer', false],
  ] as const)(
    'offers the first-service action on an empty %s dashboard: %s',
    async (role, canAdd) => {
      renderRoute(`/${role}`, role)
      await screen.findByRole('heading', { level: 1, name: 'Nothing to monitor yet' })
      // One action only, and no way to report an incident when there is nothing to report against.
      expect(screen.queryAllByRole('link', { name: 'Add a service' })).toHaveLength(canAdd ? 1 : 0)
      expect(screen.queryByRole('link', { name: 'Report an incident' })).not.toBeInTheDocument()
    },
  )

  it.each([
    ['admin', true],
    ['responder', true],
    ['viewer', false],
  ] as const)(
    'shows report actions on a %s dashboard that has services: %s',
    async (role, canReport) => {
      renderRoute(`/${role}`, role, true, [
        {
          id: 'svc-1',
          organization_id: 'org-1',
          name: 'Public API',
          description: null,
          status: 'operational',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
      ])
      await screen.findByRole('heading', { level: 1, name: 'All systems operational' })
      const report = screen.queryByRole('link', { name: 'Report an incident' })
      if (canReport) expect(report).toBeInTheDocument()
      else expect(report).not.toBeInTheDocument()
    },
  )

  it.each(['admin', 'responder', 'viewer'] as const)(
    'renders the incidents page for %s',
    async (role) => {
      renderRoute(`/${role}/incidents`, role)
      expect(await screen.findByRole('heading', { name: 'Incidents' })).toBeInTheDocument()
    },
  )
  it.each(['admin', 'responder', 'viewer'] as const)(
    'renders the services page for %s',
    async (role) => {
      renderRoute(`/${role}/services`, role)
      expect(await screen.findByRole('heading', { name: 'Services' })).toBeInTheDocument()
    },
  )
  it('redirects unauthenticated users from protected routes to login', async () => {
    renderRoute('/admin')
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
  })
  it('shows organization setup when an authenticated user has no organization', async () => {
    renderRoute('/workspace', 'admin', false)
    expect(
      await screen.findByRole('heading', { name: /create your organization/i }),
    ).toBeInTheDocument()
  })
  it('redirects a viewer away from the admin dashboard', async () => {
    renderRoute('/admin', 'viewer')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Nothing to monitor yet' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Report an incident' })).not.toBeInTheDocument()
  })
  it('renders the not found page for an unknown route', () => {
    renderRoute('/unknown-route')
    expect(screen.getByRole('heading', { name: /404/ })).toBeInTheDocument()
  })
})
