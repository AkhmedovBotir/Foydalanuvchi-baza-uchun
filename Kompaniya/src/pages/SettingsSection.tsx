import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Box,
  Chip,
  CircularProgress,
  IconButton,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { ContentCopyRounded, LinkRounded } from '@mui/icons-material'
import { getSurveyLinkBase } from '../api/settings'
import { ApiError } from '../api/client'
import type { SurveyLinkBaseSetting } from '../api/types'
import { useSnack } from '../ui/SnackProvider'

const headingFont = { fontFamily: "'Outfit', sans-serif" }

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0 },
}

function formatDate(value: string) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString('uz-UZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function SettingsSection() {
  const { showSnack } = useSnack()
  const [setting, setSetting] = useState<SurveyLinkBaseSetting | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getSurveyLinkBase()
      .then((data) => {
        if (!cancelled) setSetting(data)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        showSnack(
          err instanceof ApiError ? err.message : 'Sozlamani yuklab bo‘lmadi',
          'error',
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [showSnack])

  const copyBase = async () => {
    if (!setting?.base_url) return
    try {
      await navigator.clipboard.writeText(setting.base_url)
      showSnack('Base URL nusxalandi', 'success')
    } catch {
      showSnack('Nusxalab bo‘lmadi', 'error')
    }
  }

  return (
    <>
      <motion.section
        variants={fadeUp}
        className="flex flex-col gap-4 rounded-[1.5rem] bg-slate-950 px-5 py-6 text-white sm:px-7"
      >
        <div>
          <Typography
            variant="h4"
            sx={{
              ...headingFont,
              fontWeight: 800,
              fontSize: { xs: '1.45rem', sm: '1.75rem' },
            }}
          >
            So‘rovnoma link sozlamasi
          </Typography>
          <Typography className="!mt-2 !text-[0.9rem] !text-slate-300">
            Public havolalar shu base URL asosida hosil qilinadi
          </Typography>
        </div>
      </motion.section>

      <motion.section
        variants={fadeUp}
        className="rounded-[1.35rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/80 sm:p-6"
      >
        {loading ? (
          <Box className="grid place-items-center py-16">
            <CircularProgress />
          </Box>
        ) : (
          <div className="max-w-xl space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Chip
                size="small"
                icon={<LinkRounded sx={{ fontSize: '16px !important' }} />}
                label={setting?.key ?? 'survey_link_base_url'}
                sx={{
                  fontWeight: 600,
                  bgcolor: 'rgba(13,148,136,0.1)',
                  color: '#0f766e',
                  border: 'none',
                  '& .MuiChip-icon': { color: '#0f766e' },
                }}
              />
              {setting?.updated_at && (
                <Typography variant="body2" color="text.secondary">
                  Yangilangan: {formatDate(setting.updated_at)}
                </Typography>
              )}
            </div>

            <div>
              <Typography
                variant="body2"
                color="text.secondary"
                className="!mb-1.5 !font-medium"
              >
                Base URL
              </Typography>
              <Box className="flex items-start gap-1">
                <TextField
                  value={setting?.base_url ?? ''}
                  fullWidth
                  slotProps={{
                    input: { readOnly: true },
                  }}
                  helperText="To‘liq link: {base_url}/surveys/{slug}"
                />
                <Tooltip title="Nusxalash">
                  <IconButton
                    onClick={() => void copyBase()}
                    disabled={!setting?.base_url}
                    sx={{
                      mt: 0.5,
                      bgcolor: 'rgba(13,148,136,0.08)',
                      '&:hover': { bgcolor: 'rgba(13,148,136,0.16)' },
                    }}
                  >
                    <ContentCopyRounded fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-3">
              <Typography variant="body2" color="text.secondary">
                Misol:{' '}
                <span className="font-medium text-slate-700">
                  {(setting?.base_url ?? 'http://localhost:5174').replace(/\/$/, '')}
                  /surveys/customer-feedback
                </span>
              </Typography>
              <Typography variant="body2" color="text.secondary" className="!mt-2">
                Base URL ni o‘zgartirish faqat admin panel orqali amalga oshiriladi.
                O‘zgarganda mavjud so‘rovnomalar havolasi yangi base bilan qayta
                hisoblanadi.
              </Typography>
            </div>
          </div>
        )}
      </motion.section>
    </>
  )
}
