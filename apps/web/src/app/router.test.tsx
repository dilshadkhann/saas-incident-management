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
function mockApi(role: TestRole = null, hasOrganization = true) {
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
      if (url.includes('/incidents') || url.includes('/services')) {
        return jsonResponse([])
      }
      return jsonResponse({})
    }),
  )
}
function renderRoute(path: string, role: TestRole = null, hasOrganization = true) {
  mockApi(role, hasOrganization)
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
  it.each([
    ['admin', 'Admin Dashboard'],
    ['responder', 'Responder Dashboard'],
    ['viewer', 'Viewer Dashboard'],
  ] as const)('renders the %s dashboard', async (role, heading) => {
    renderRoute(`/${role}`, role)
    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument()
  })
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
    expect(await screen.findByRole('heading', { name: 'Viewer Dashboard' })).toBeInTheDocument()
  })
  it('renders the not found page for an unknown route', () => {
    renderRoute('/unknown-route')
    expect(screen.getByRole('heading', { name: /404/ })).toBeInTheDocument()
  })
})
