import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Avatar,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  Typography,
} from '@mui/material'
import { CloseRounded, LogoutRounded } from '@mui/icons-material'
import type { Company } from '../api/types'
import { useSnack } from '../ui/SnackProvider'

export type NavItem<T extends string = string> = {
  label: T
  icon: ReactNode
  /** To‘g‘ridan-to‘g‘ri marshrut (ixtiyoriy — berilsa shu bo‘yicha ochiladi) */
  path?: string
}

type AppSidebarProps<T extends string> = {
  open: boolean
  onClose: () => void
  items: NavItem<T>[]
  active: T
  onNavigate: (label: T, path?: string) => void
  company: Company | null
  onLogout: () => void
}

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function AppSidebar<T extends string>({
  open,
  onClose,
  items,
  active,
  onNavigate,
  company,
  onLogout,
}: AppSidebarProps<T>) {
  const { showSnack } = useSnack()

  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      ModalProps={{ keepMounted: true }}
      sx={{
        '& .MuiDrawer-paper': {
          width: 300,
          border: 0,
          background: 'transparent',
          boxShadow: 'none',
        },
      }}
    >
      <Box className="flex h-full flex-col overflow-hidden rounded-r-3xl bg-gradient-to-b from-slate-900 via-slate-900 to-teal-950 text-slate-100 shadow-2xl shadow-slate-900/40">
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.28 }}
          className="relative overflow-hidden px-5 pb-5 pt-4"
        >
          <div className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-teal-400/20 blur-2xl" />
          <div className="pointer-events-none absolute bottom-0 left-6 h-20 w-20 rounded-full bg-sky-400/10 blur-xl" />

          <div className="relative mb-5 flex items-start justify-between gap-3">
            <div>
              <p className="font-[Outfit] text-[1.35rem] font-bold tracking-tight text-white">
                Kompaniya paneli
              </p>
              <p className="mt-0.5 text-sm text-slate-400">Boshqaruv markazi</p>
            </div>
            <IconButton
              onClick={onClose}
              size="small"
              sx={{
                color: 'rgba(226,232,240,0.9)',
                bgcolor: 'rgba(255,255,255,0.06)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' },
              }}
            >
              <CloseRounded fontSize="small" />
            </IconButton>
          </div>

          <motion.div
            whileHover={{ scale: 1.01 }}
            className="relative flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm"
          >
            <Avatar
              sx={{
                width: 44,
                height: 44,
                bgcolor: '#0d9488',
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              {company ? initials(company.name) : '?'}
            </Avatar>
            <div className="min-w-0">
              <Typography className="!truncate !text-sm !font-semibold !text-white">
                {company?.name ?? 'Kompaniya'}
              </Typography>
              <Typography className="!truncate !text-xs !text-slate-400">
                {company?.username}
              </Typography>
            </div>
          </motion.div>
        </motion.div>

        <Divider sx={{ borderColor: 'rgba(148,163,184,0.15)' }} />

        <nav className="flex flex-1 flex-col gap-1.5 px-3 py-4">
          <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Menyular
          </p>
          {items.map((item, index) => {
            const selected = active === item.label
            return (
              <motion.button
                key={item.label}
                type="button"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * index }}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  onNavigate(item.label, item.path)
                  onClose()
                }}
                className={[
                  'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-200',
                  selected
                    ? 'bg-teal-500/20 text-white shadow-[inset_0_0_0_1px_rgba(45,212,191,0.35)]'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white',
                ].join(' ')}
              >
                <span
                  className={[
                    'grid h-9 w-9 place-items-center rounded-lg transition-colors',
                    selected
                      ? 'bg-teal-400/25 text-teal-200'
                      : 'bg-white/5 text-slate-400 group-hover:text-slate-200',
                  ].join(' ')}
                >
                  {item.icon}
                </span>
                <span className="text-[0.95rem] font-semibold tracking-tight">
                  {item.label}
                </span>
                <AnimatePresence>
                  {selected && (
                    <motion.span
                      layoutId="nav-dot"
                      className="ml-auto h-1.5 w-1.5 rounded-full bg-teal-300"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                    />
                  )}
                </AnimatePresence>
              </motion.button>
            )
          })}
        </nav>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-auto space-y-3 p-4"
        >
          <div className="rounded-2xl border border-teal-400/20 bg-gradient-to-br from-teal-500/15 to-sky-500/10 px-3.5 py-3">
            <p className="text-xs font-medium text-teal-100/90">
              So‘rovnomalar va profilingizni bir joydan boshqaring
            </p>
          </div>
          <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
            <Button
              fullWidth
              variant="outlined"
              color="inherit"
              startIcon={<LogoutRounded />}
              onClick={() => {
                onLogout()
                showSnack('Tizimdan chiqildi', 'info')
              }}
              sx={{
                borderColor: 'rgba(148,163,184,0.3)',
                borderRadius: '12px',
                py: 1,
                '&:hover': {
                  borderColor: 'rgba(248,113,113,0.55)',
                  bgcolor: 'rgba(239,68,68,0.12)',
                },
              }}
            >
              Chiqish
            </Button>
          </motion.div>
        </motion.div>
      </Box>
    </Drawer>
  )
}
