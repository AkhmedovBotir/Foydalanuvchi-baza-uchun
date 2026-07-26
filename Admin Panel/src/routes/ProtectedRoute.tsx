import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Box, CircularProgress } from '@mui/material'
import { motion } from 'framer-motion'
import { useAuth } from '../auth/AuthContext'
import { paths } from './paths'

export function ProtectedRoute() {
  const { admin, loading } = useAuth()
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

  if (!admin) {
    return <Navigate to={paths.login} replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}

export function GuestRoute() {
  const { admin, loading } = useAuth()

  if (loading) {
    return (
      <Box className="grid min-h-svh place-items-center">
        <CircularProgress />
      </Box>
    )
  }

  if (admin) {
    return <Navigate to={paths.home} replace />
  }

  return <Outlet />
}
