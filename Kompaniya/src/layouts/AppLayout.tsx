import { useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AppBar,
  Avatar,
  Box,
  IconButton,
  Toolbar,
  Typography,
} from '@mui/material'
import {
  AccountBalanceWalletRounded,
  AssignmentRounded,
  ContactMailRounded,
  DashboardRounded,
  EventAvailableRounded,
  FactCheckRounded,
  LinkRounded,
  LocalHospitalRounded,
  MenuRounded,
  PersonPinRounded,
  SettingsRounded,
  ShareRounded,
} from '@mui/icons-material'
import { useAuth } from '../auth/AuthContext'
import { AppSidebar, type NavItem } from '../components/AppSidebar'

type NavKey =
  | 'Bosh sahifa'
  | 'So‘rovnomalar'
  | 'Qabul'
  | 'Navbat'
  | 'Registratorlar'
  | 'Shifokorlar'
  | 'Referallar'
  | 'Moliya'
  | 'Vizitkalar'
  | 'Sozlamalar'
  | 'Profil'

type AppNavItem = NavItem<NavKey> & { path: string }

const NAV: AppNavItem[] = [
  { label: 'Bosh sahifa', path: '/', icon: <DashboardRounded fontSize="small" /> },
  {
    label: 'So‘rovnomalar',
    path: '/surveys',
    icon: <AssignmentRounded fontSize="small" />,
  },
  {
    label: 'Qabul',
    path: '/appointments',
    icon: <EventAvailableRounded fontSize="small" />,
  },
  {
    label: 'Navbat',
    path: '/workflow',
    icon: <FactCheckRounded fontSize="small" />,
  },
  {
    label: 'Registratorlar',
    path: '/registrators',
    icon: <PersonPinRounded fontSize="small" />,
  },
  {
    label: 'Shifokorlar',
    path: '/doctors',
    icon: <LocalHospitalRounded fontSize="small" />,
  },
  {
    label: 'Referallar',
    path: '/referrals',
    icon: <ShareRounded fontSize="small" />,
  },
  {
    label: 'Moliya',
    path: '/finance',
    icon: <AccountBalanceWalletRounded fontSize="small" />,
  },
  {
    label: 'Vizitkalar',
    path: '/cards',
    icon: <ContactMailRounded fontSize="small" />,
  },
  { label: 'Sozlamalar', path: '/settings', icon: <LinkRounded fontSize="small" /> },
  { label: 'Profil', path: '/profile', icon: <SettingsRounded fontSize="small" /> },
]

const TITLE_BY_PATH: Record<string, NavKey> = {
  '/': 'Bosh sahifa',
  '/surveys': 'So‘rovnomalar',
  '/appointments': 'Qabul',
  '/workflow': 'Navbat',
  '/registrators': 'Registratorlar',
  '/doctors': 'Shifokorlar',
  '/referrals': 'Referallar',
  '/finance': 'Moliya',
  '/cards': 'Vizitkalar',
  '/settings': 'Sozlamalar',
  '/profile': 'Profil',
}

function resolveTitle(pathname: string): NavKey {
  if (TITLE_BY_PATH[pathname]) return TITLE_BY_PATH[pathname]
  if (pathname.startsWith('/surveys')) return 'So‘rovnomalar'
  if (pathname.startsWith('/appointments')) return 'Qabul'
  if (pathname.startsWith('/workflow')) return 'Navbat'
  if (pathname.startsWith('/registrators')) return 'Registratorlar'
  if (pathname.startsWith('/doctors')) return 'Shifokorlar'
  if (pathname.startsWith('/referrals')) return 'Referallar'
  if (pathname.startsWith('/finance')) return 'Moliya'
  if (pathname.startsWith('/cards')) return 'Vizitkalar'
  if (pathname.startsWith('/settings')) return 'Sozlamalar'
  if (pathname.startsWith('/profile')) return 'Profil'
  return 'Bosh sahifa'
}

const headingFont = { fontFamily: "'Outfit', sans-serif" }

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function AppLayout() {
  const { company, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const activeNav = useMemo(() => resolveTitle(location.pathname), [location.pathname])

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <Box className="min-h-svh">
      <AppSidebar
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        items={NAV}
        active={activeNav}
        onNavigate={(label, path) => {
          if (path) {
            navigate(path)
            return
          }
          const item = NAV.find((n) => n.label === label)
          if (item) navigate(item.path)
        }}
        company={company}
        onLogout={handleLogout}
      />

      <Box className="flex min-w-0 flex-col">
        <motion.div
          initial={{ y: -12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <AppBar
            position="sticky"
            elevation={0}
            color="transparent"
            className="!border-b !border-slate-200/80 !bg-white/75 !backdrop-blur-xl"
          >
            <Toolbar className="gap-3 !min-h-[64px] sm:!min-h-[68px]">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <IconButton
                  edge="start"
                  onClick={() => setMenuOpen(true)}
                  aria-label="Menyuni ochish"
                  sx={{
                    bgcolor: 'rgba(15,23,42,0.04)',
                    borderRadius: '12px',
                    '&:hover': { bgcolor: 'rgba(13,148,136,0.12)' },
                  }}
                >
                  <MenuRounded />
                </IconButton>
              </motion.div>
              <Box className="min-w-0 flex-1">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeNav}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Typography
                      variant="h5"
                      className="!truncate !text-[1.35rem] sm:!text-[1.5rem]"
                      sx={{ ...headingFont, letterSpacing: '-0.03em', fontWeight: 700 }}
                    >
                      {activeNav}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      className="!hidden !text-[0.8rem] sm:!block"
                    >
                      So‘rovnomalar va profilingizni boshqaring
                    </Typography>
                  </motion.div>
                </AnimatePresence>
              </Box>
              <motion.div whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.96 }}>
                <Avatar
                  sx={{
                    bgcolor: 'primary.main',
                    fontWeight: 700,
                    width: 38,
                    height: 38,
                    fontSize: 13,
                  }}
                >
                  {company ? initials(company.name) : '?'}
                </Avatar>
              </motion.div>
            </Toolbar>
          </AppBar>
        </motion.div>

        <Box component="main" className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
            <Outlet />
          </div>
        </Box>
      </Box>
    </Box>
  )
}
