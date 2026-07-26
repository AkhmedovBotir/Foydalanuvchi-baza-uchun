import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './layouts/AppLayout'
import { GuestRoute, ProtectedRoute } from './routes/ProtectedRoute'
import { paths } from './routes/paths'
import { LoginPage } from './pages/LoginPage'
import { HomePage } from './pages/HomePage'
import { AdminsPage } from './pages/AdminsPage'
import { CompaniesPage } from './pages/CompaniesPage'
import { SettingsPage } from './pages/SettingsPage'
import { ProfilePage } from './pages/ProfilePage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<GuestRoute />}>
          <Route path={paths.login} element={<LoginPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<HomePage />} />
            <Route path={paths.admins} element={<AdminsPage />} />
            <Route path={paths.companies} element={<CompaniesPage />} />
            <Route path={paths.settings} element={<SettingsPage />} />
            <Route path={paths.profile} element={<ProfilePage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to={paths.home} replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
