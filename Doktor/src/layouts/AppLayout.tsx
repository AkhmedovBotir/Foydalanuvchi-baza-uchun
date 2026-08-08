import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  AppBar,
  Avatar,
  Box,
  Button,
  IconButton,
  Toolbar,
  Typography,
} from '@mui/material'
import {
  DashboardRounded,
  EventAvailableRounded,
  LogoutRounded,
  QuizRounded,
} from '@mui/icons-material'
import { useAuth } from '../auth/AuthContext'

const nav = [
  { to: '/', label: 'Bosh sahifa', icon: <DashboardRounded fontSize="small" />, end: true },
  { to: '/responses', label: 'So‘rovnomalar', icon: <QuizRounded fontSize="small" /> },
  { to: '/bookings', label: 'Qabul', icon: <EventAvailableRounded fontSize="small" /> },
]

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <Box className="min-h-svh">
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: 'rgba(255,255,255,0.88)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid',
          borderColor: 'divider',
          color: 'text.primary',
        }}
      >
        <Toolbar className="mx-auto flex w-full max-w-6xl gap-3 px-3 sm:px-4">
          <Box className="min-w-0 flex-1">
            <Typography
              variant="h6"
              sx={{
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 800,
                letterSpacing: '-0.02em',
                lineHeight: 1.15,
              }}
            >
              Shifokor
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {user?.name}
              {user?.specialty ? ` · ${user.specialty}` : ''}
            </Typography>
          </Box>
          <Avatar
            sx={{
              width: 36,
              height: 36,
              bgcolor: 'primary.main',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {user ? initials(user.name) : 'D'}
          </Avatar>
          <IconButton onClick={handleLogout} aria-label="Chiqish" color="inherit">
            <LogoutRounded />
          </IconButton>
        </Toolbar>
        <Box className="mx-auto flex w-full max-w-6xl gap-1 overflow-x-auto px-3 pb-2 sm:px-4">
          {nav.map((item) => (
            <Button
              key={item.to}
              component={NavLink}
              to={item.to}
              end={item.end}
              size="small"
              startIcon={item.icon}
              sx={{
                flexShrink: 0,
                px: 1.5,
                color: 'text.secondary',
                '&.active': {
                  color: 'primary.main',
                  bgcolor: 'rgba(2,132,199,0.1)',
                },
              }}
            >
              {item.label}
            </Button>
          ))}
        </Box>
      </AppBar>

      <Box component="main" className="mx-auto w-full max-w-6xl px-3 py-5 sm:px-4 sm:py-6">
        <Outlet />
      </Box>
    </Box>
  )
}
