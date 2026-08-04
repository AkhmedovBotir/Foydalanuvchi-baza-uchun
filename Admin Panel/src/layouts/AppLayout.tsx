import { useState, type ReactNode } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AppBar, Avatar, Box, IconButton, Toolbar, Typography } from '@mui/material'
import {
  ApartmentRounded,
  ContactMailRounded,
  DashboardRounded,
  ManageAccountsRounded,
  MenuRounded,
  PeopleAltRounded,
  TuneRounded,
} from '@mui/icons-material'
import { useAuth } from '../auth/AuthContext'
import { AppSidebar, type NavItem } from '../components/AppSidebar'
import { paths, routeTitles } from '../routes/paths'

type NavKey =
  | 'Bosh sahifa'
  | 'Adminlar'
  | 'Kompaniyalar'
  | 'Vizitka shablonlari'
  | 'Sozlamalar'
  | 'Profil'

const NAV: { label: NavKey; path: string; icon: ReactNode }[] = [
  { label: 'Bosh sahifa', path: paths.home, icon: <DashboardRounded fontSize="small" /> },
  { label: 'Adminlar', path: paths.admins, icon: <PeopleAltRounded fontSize="small" /> },
  { label: 'Kompaniyalar', path: paths.companies, icon: <ApartmentRounded fontSize="small" /> },
  {
    label: 'Vizitka shablonlari',
    path: paths.cards,
    icon: <ContactMailRounded fontSize="small" />,
  },
  { label: 'Sozlamalar', path: paths.settings, icon: <TuneRounded fontSize="small" /> },
  { label: 'Profil', path: paths.profile, icon: <ManageAccountsRounded fontSize="small" /> },
]

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
  const { admin, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const activeItem = NAV.find((item) =>
    item.path === paths.home
      ? location.pathname === paths.home
      : location.pathname.startsWith(item.path),
  )
  const pageTitle = routeTitles[location.pathname] ?? activeItem?.label ?? 'Admin panel'

  const sidebarItems: NavItem<NavKey>[] = NAV.map(({ label, icon }) => ({ label, icon }))

  const onNavigate = (label: NavKey) => {
    const item = NAV.find((n) => n.label === label)
    if (item) navigate(item.path)
  }

  return (
    <Box className="min-h-svh">
      <AppSidebar
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        items={sidebarItems}
        active={activeItem?.label ?? 'Bosh sahifa'}
        onNavigate={onNavigate}
        admin={admin}
        onLogout={() => {
          logout()
          navigate(paths.login, { replace: true })
        }}
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
                    key={pageTitle}
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
                      {pageTitle}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      className="!hidden !text-[0.8rem] sm:!block"
                    >
                      Adminlar va profilingizni boshqaring
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
                    cursor: 'pointer',
                  }}
                  onClick={() => navigate(paths.profile)}
                >
                  {admin ? initials(admin.name) : '?'}
                </Avatar>
              </motion.div>
            </Toolbar>
          </AppBar>
        </motion.div>

        <Box component="main" className="flex-1 p-4 sm:p-6 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="mx-auto flex w-full max-w-6xl flex-col gap-5"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </Box>
      </Box>
    </Box>
  )
}
