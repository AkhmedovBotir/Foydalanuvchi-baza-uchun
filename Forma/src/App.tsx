import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { NotFoundPage } from './pages/NotFoundPage'
import { SurveyPage } from './pages/SurveyPage'
import { BookingPage } from './pages/BookingPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/surveys/:slug" element={<SurveyPage />} />
        <Route path="/book/:slug" element={<BookingPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
