import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './layouts/AppLayout'
import { GuestRoute, ProtectedRoute } from './routes/guards'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { ProfilePage } from './pages/ProfilePage'
import { SettingsPage } from './pages/SettingsPage'
import { SurveysPage } from './pages/SurveysPage'
import { SurveyEditorPage } from './pages/SurveyEditorPage'
import { SurveyResponsesPage } from './pages/SurveyResponsesPage'
import { CardsPage } from './pages/CardsPage'
import { AppointmentsPage } from './pages/AppointmentsPage'

export default function App() {
  return (
    <Routes>
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="surveys" element={<SurveysPage />} />
          <Route path="surveys/new" element={<SurveyEditorPage />} />
          <Route path="surveys/responses" element={<SurveyResponsesPage />} />
          <Route path="surveys/:id/edit" element={<SurveyEditorPage />} />
          <Route path="surveys/:id/responses" element={<SurveyResponsesPage />} />
          <Route path="appointments" element={<AppointmentsPage />} />
          <Route path="cards" element={<CardsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
