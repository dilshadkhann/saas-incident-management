import { BrowserRouter, Route, Routes } from 'react-router'

import AdminDashboardPage from '../pages/admin/AdminDashboardPage'
import IncidentsPage from '../pages/IncidentsPage'
import LoginPage from '../pages/auth/LoginPage'
import RegisterPage from '../pages/auth/RegisterPage'
import HomePage from '../pages/HomePage'
import NotFoundPage from '../pages/NotFoundPage'
import ResponderDashboardPage from '../pages/responder/ResponderDashboardPage'
import ServicesPage from '../pages/ServicesPage'
import ViewerDashboardPage from '../pages/viewer/ViewerDashboardPage'
import PublicLayout from '../layouts/PublicLayout'
import WorkspaceLayout from '../layouts/WorkspaceLayout'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />

      <Route element={<PublicLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route path="/admin" element={<WorkspaceLayout />}>
        <Route index element={<AdminDashboardPage />} />
        <Route path="incidents" element={<IncidentsPage />} />
        <Route path="services" element={<ServicesPage />} />
      </Route>

      <Route path="/responder" element={<WorkspaceLayout />}>
        <Route index element={<ResponderDashboardPage />} />
        <Route path="incidents" element={<IncidentsPage />} />
        <Route path="services" element={<ServicesPage />} />
      </Route>

      <Route path="/viewer" element={<WorkspaceLayout />}>
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
      <AppRoutes />
    </BrowserRouter>
  )
}

export default AppRouter
