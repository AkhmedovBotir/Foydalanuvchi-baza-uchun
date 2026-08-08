import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Box, Button, CircularProgress, Stack, Typography } from '@mui/material'
import {
  EventAvailableRounded,
  FactCheckRounded,
  PersonOffRounded,
  QueueRounded,
  QuizRounded,
} from '@mui/icons-material'
import { ApiError } from '../api/client'
import { getDashboard } from '../api/workflow'
import type { DashboardStats } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { useSnack } from '../ui/SnackProvider'

const cards: {
  key: keyof DashboardStats
  label: string
  hint: string
  icon: ReactNode
}[] = [
  {
    key: 'myQueue',
    label: 'Mening navbatim',
    hint: 'Yuborilgan / to‘langan',
    icon: <QueueRounded />,
  },
  {
    key: 'concluded',
    label: 'Xulosa yozilgan',
    hint: 'Yakunlangan',
    icon: <FactCheckRounded />,
  },
  {
    key: 'noShow',
    label: 'Kirmagan',
    hint: 'Kelmagan bemorlar',
    icon: <PersonOffRounded />,
  },
]

export function HomePage() {
  const { user } = useAuth()
  const { showSnack } = useSnack()
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDashboard()
      .then(setStats)
      .catch((err: unknown) => {
        showSnack(err instanceof ApiError ? err.message : 'Dashboard yuklanmadi', 'error')
      })
      .finally(() => setLoading(false))
  }, [showSnack])

  if (loading) {
    return (
      <Box className="grid min-h-[40vh] place-items-center">
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Stack spacing={3}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Typography
          variant="h4"
          sx={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, letterSpacing: '-0.03em' }}
        >
          Salom, dr. {user?.name?.split(' ')[0] || 'Shifokor'}
        </Typography>
        <Typography color="text.secondary" className="!mt-1">
          Registrator yuborgan bemorlarni ko‘ring va xulosa yozing
        </Typography>
      </motion.div>

      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map((c, i) => (
          <motion.div
            key={c.key}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i }}
          >
            <Box className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
              <Box className="mb-3 inline-flex rounded-xl bg-sky-50 p-2 text-sky-700">
                {c.icon}
              </Box>
              <Typography variant="h4" sx={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800 }}>
                {stats?.[c.key] ?? 0}
              </Typography>
              <Typography sx={{ fontWeight: 700 }}>{c.label}</Typography>
              <Typography variant="body2" color="text.secondary">
                {c.hint}
              </Typography>
            </Box>
          </motion.div>
        ))}
      </div>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <Button
          variant="contained"
          startIcon={<QuizRounded />}
          onClick={() => navigate('/responses')}
        >
          So‘rovnoma navbati
        </Button>
        <Button
          variant="outlined"
          startIcon={<EventAvailableRounded />}
          onClick={() => navigate('/bookings')}
        >
          Qabul navbati
        </Button>
      </Stack>
    </Stack>
  )
}
