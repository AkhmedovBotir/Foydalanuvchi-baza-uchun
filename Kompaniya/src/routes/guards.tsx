import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Box, CircularProgress } from '@mui/material'
import { motion } from 'framer-motion'
import { useAuth } from '../auth/AuthContext'

export function ProtectedRoute() {
  const { company, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <Box className="grid min-h-svh place-items-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <CircularProgress />
        </motion.div>
      </Box>
    )
  }

  if (!company) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}

export function GuestRoute() {
  const { company, loading } = useAuth()

  if (loading) {
    return (
      <Box className="grid min-h-svh place-items-center">
        <CircularProgress />
      </Box>
    )
  }

  if (company) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
