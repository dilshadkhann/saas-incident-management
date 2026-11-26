import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { StrictMode } from 'react'
import { MemoryRouter, useLocation } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppRoutes } from '../app/router'
import { AuthProvider } from './auth-provider'
import { useAuth } from './use-auth'

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

function jsonResponse(data: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => data } as Response
}

// StrictMode runs the provider's mount effect twice, so two refreshes overlap. Real network
// responses settle in separate macrotasks, so React renders between them. These per-request
// delays construct the exact interleaving deterministically instead of relying on timer luck:
//
//   t=30  first refresh gets /auth/me        t=40  second refresh gets /auth/me
//   t=60  first refresh gets /organizations  t=80  second refresh gets /organizations
//         ...and issues its members request (invalidating the first refresh's request)
//   t=90  first refresh's members reply arrives, is stale, and the first refresh finishes
//         while the second refresh's members reply (t=120) has not arrived yet
const FIRST_CALL_DELAY_MS = 30
const SECOND_CALL_DELAY_MS = 40

function mockApi() {
  const calls = new Map<string, number>()

  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      const key = url.includes('/auth/me')
        ? 'me'
        : url.endsWith('/organizations')
          ? 'organizations'
          : url.includes('/members')
            ? 'members'
            : 'other'
      const count = (calls.get(key) ?? 0) + 1
      calls.set(key, count)
      const delay = key === 'other' ? 1 : count === 1 ? FIRST_CALL_DELAY_MS : SECOND_CALL_DELAY_MS
      await new Promise((resolve) => setTimeout(resolve, delay))

      if (key === 'me') return jsonResponse(user)
      if (key === 'organizations') return jsonResponse([organization])
      if (key === 'members') {
        return jsonResponse([
          { user_id: user.id, name: user.name, email: user.email, role: 'admin' },
        ])
      }
      if (url.includes('/audit-logs')) {
        return jsonResponse({ items: [], total: 0, limit: 20, offset: 0 })
      }
      if (url.includes('/incidents') || url.includes('/services')) return jsonResponse([])
      return jsonResponse({})
    }),
  )
}

function LocationRecorder({ visited }: { visited: string[] }) {
  const { pathname } = useLocation()
  if (visited[visited.length - 1] !== pathname) visited.push(pathname)
  return null
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('AuthProvider under React StrictMode', () => {
  it.each(['/admin/services', '/admin/incidents', '/admin/audit-logs'])(
    'keeps a signed-in admin on a deep link to %s instead of bouncing through /workspace',
    async (path) => {
      mockApi()
      const visited: string[] = []

      render(
        <StrictMode>
          <MemoryRouter initialEntries={[path]}>
            <AuthProvider>
              <LocationRecorder visited={visited} />
              <AppRoutes />
            </AuthProvider>
          </MemoryRouter>
        </StrictMode>,
      )

      // Wait until the page has finished loading its session and rendered the workspace shell.
      await screen.findByRole('navigation')
      await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument())

      expect(visited).toEqual([path])
    },
  )
})

describe('AuthProvider logout', () => {
  it('is not undone by a refresh that was still in flight when the user signed out', async () => {
    mockApi()

    function Probe() {
      const auth = useAuth()
      return (
        <>
          <button type="button" onClick={() => void auth.logout()}>
            Sign out
          </button>
          <p role="note">
            {auth.loading
              ? 'loading'
              : auth.user
                ? `signed-in:${auth.role ?? 'no-role'}`
                : 'signed-out'}
          </p>
        </>
      )
    }

    render(
      <MemoryRouter>
        <AuthProvider>
          <Probe />
        </AuthProvider>
      </MemoryRouter>,
    )

    // The initial refresh is still waiting on the network when the user signs out.
    expect(screen.getByRole('note')).toHaveTextContent('loading')
    act(() => screen.getByRole('button', { name: 'Sign out' }).click())
    await waitFor(() => expect(screen.getByRole('note')).toHaveTextContent('signed-out'))

    // Let every delayed response from the abandoned refresh arrive; it must not restore the user.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 200))
    })
    expect(screen.getByRole('note')).toHaveTextContent('signed-out')
  })
})
