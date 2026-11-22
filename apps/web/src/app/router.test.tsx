import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import { AppRoutes } from './router'

function renderRoute(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  )
}

describe('AppRouter', () => {
  it('renders the home page', () => {
    renderRoute('/')

    expect(screen.getByRole('heading', { name: 'OpsHub' })).toBeInTheDocument()
  })

  it('renders the login page', () => {
    renderRoute('/login')

    expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument()
  })

  it('renders the registration page', () => {
    renderRoute('/register')

    expect(screen.getByRole('heading', { name: 'Register' })).toBeInTheDocument()
  })

  it.each([
    ['admin', 'Admin Dashboard'],
    ['responder', 'Responder Dashboard'],
    ['viewer', 'Viewer Dashboard'],
  ])('renders the %s dashboard', (role, heading) => {
    renderRoute(`/${role}`)

    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument()
  })

  it.each(['admin', 'responder', 'viewer'])('renders the incidents page for %s', (role) => {
    renderRoute(`/${role}/incidents`)

    expect(screen.getByRole('heading', { name: 'Incidents' })).toBeInTheDocument()
  })

  it.each(['admin', 'responder', 'viewer'])('renders the services page for %s', (role) => {
    renderRoute(`/${role}/services`)

    expect(screen.getByRole('heading', { name: 'Services' })).toBeInTheDocument()
  })

  it('renders the not found page for an unknown route', () => {
    renderRoute('/unknown-route')

    expect(screen.getByRole('heading', { name: /404/ })).toBeInTheDocument()
  })
})
