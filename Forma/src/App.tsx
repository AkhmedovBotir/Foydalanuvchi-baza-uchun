import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { NotFoundPage } from './pages/NotFoundPage'
import { SurveyPage } from './pages/SurveyPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/surveys/:slug" element={<SurveyPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
