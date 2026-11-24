import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router'
import AdminDashboardPage from '../pages/admin/AdminDashboardPage'
import IncidentsPage from '../pages/IncidentsPage'
import LoginPage from '../pages/auth/LoginPage'
import RegisterPage from '../pages/auth/RegisterPage'
import HomePage from '../pages/HomePage'
import NotFoundPage from '../pages/NotFoundPage'
import OrganizationSetupPage from '../pages/OrganizationSetupPage'
import ResponderDashboardPage from '../pages/responder/ResponderDashboardPage'
import ServicesPage from '../pages/ServicesPage'
import ViewerDashboardPage from '../pages/viewer/ViewerDashboardPage'
import PublicLayout from '../layouts/PublicLayout'
import WorkspaceLayout from '../layouts/WorkspaceLayout'
import { AuthProvider } from '../lib/auth-provider'
import type { Role } from '../lib/auth-context'
import { useAuth } from '../lib/use-auth'

function LoadingMessage() {
  return (
    <div className="p-8 text-sm text-slate-500" role="status">
      Loading workspace…
    </div>
  )
}

function roleHome(role: Role) {
  return role === 'admin' ? '/admin' : role === 'responder' ? '/responder' : '/viewer'
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingMessage />
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return children
}

function RequireOrganization({ children }: { children: ReactNode }) {
  const { organization, role } = useAuth()

  if (!organization || !role) {
    return <Navigate to="/workspace" replace />
  }
  return children
}

function RequireRole({ allowed, children }: { allowed: Role[]; children: ReactNode }) {
  const { user, organization, role, loading } = useAuth()

  if (loading) return <LoadingMessage />
  if (!user) return <Navigate to="/login" replace />
  if (!organization || !role) return <Navigate to="/workspace" replace />
  if (!allowed.includes(role)) return <Navigate to={roleHome(role)} replace />

  return children
}

function WorkspaceIndex() {
  const { role, organization, loading } = useAuth()

  if (loading) return <LoadingMessage />

  if (!organization) return <OrganizationSetupPage />

  if (role) return <Navigate to={roleHome(role)} replace />

  return (
    <div className="rounded-xl border border-amber-200 bg-white p-8">
      <h1 className="text-xl font-bold text-slate-900">Organization membership unavailable</h1>
      <p className="mt-2 text-sm text-slate-600">
        Your organization is available, but your membership could not be loaded. Refresh the page or
        contact your organization administrator.
      </p>
    </div>
  )
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />

      <Route element={<PublicLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route
        path="/workspace"
        element={
          <RequireAuth>
            <WorkspaceLayout />
          </RequireAuth>
        }
      >
        <Route index element={<WorkspaceIndex />} />
        <Route
          path="incidents"
          element={
            <RequireOrganization>
              <IncidentsPage />
            </RequireOrganization>
          }
        />
        <Route
          path="services"
          element={
            <RequireOrganization>
              <ServicesPage />
            </RequireOrganization>
          }
        />
      </Route>

      <Route
        path="/admin"
        element={
          <RequireRole allowed={['admin']}>
            <WorkspaceLayout />
          </RequireRole>
        }
      >
        <Route index element={<AdminDashboardPage />} />
        <Route path="incidents" element={<IncidentsPage />} />
        <Route path="services" element={<ServicesPage />} />
      </Route>

      <Route
        path="/responder"
        element={
          <RequireRole allowed={['admin', 'responder']}>
            <WorkspaceLayout />
          </RequireRole>
        }
      >
        <Route index element={<ResponderDashboardPage />} />
        <Route path="incidents" element={<IncidentsPage />} />
        <Route path="services" element={<ServicesPage />} />
      </Route>

      <Route
        path="/viewer"
        element={
          <RequireRole allowed={['admin', 'responder', 'viewer']}>
            <WorkspaceLayout />
          </RequireRole>
        }
      >
        <Route index element={<ViewerDashboardPage />} />
        <Route path="incidents" element={<IncidentsPage />} />
        <Route path="services" element={<ServicesPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

function AppRouter() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default AppRouter
