import { useEffect, useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  ContentCopyRounded,
  LinkRounded,
  RefreshRounded,
  SaveRounded,
} from '@mui/icons-material'
import { getSurveyLinkBase, updateSurveyLinkBase } from '../api/settings'
import { ApiError } from '../api/client'
import type { SurveyLinkSetting } from '../api/types'
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

function isValidBaseUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function SettingsSection() {
  const { showSnack } = useSnack()
  const [setting, setSetting] = useState<SurveyLinkSetting | null>(null)
  const [baseUrl, setBaseUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const data = await getSurveyLinkBase()
      setSetting(data)
      setBaseUrl(data.base_url)
    } catch (err) {
      showSnack(
        err instanceof ApiError ? err.message : 'Sozlamani yuklab bo‘lmadi',
        'error',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const normalized = baseUrl.trim().replace(/\/+$/, '')
  const dirty = setting != null && normalized !== setting.base_url
  const valid = isValidBaseUrl(normalized)

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!valid) {
      showSnack('URL http:// yoki https:// bilan boshlanishi kerak', 'warning')
      return
    }
    setSaving(true)
    try {
      const data = await updateSurveyLinkBase({ base_url: normalized })
      setSetting(data)
      setBaseUrl(data.base_url)
      showSnack('So‘rovnoma link sozlamasi yangilandi', 'success')
    } catch (err) {
      showSnack(err instanceof ApiError ? err.message : 'Saqlashda xato', 'error')
    } finally {
      setSaving(false)
    }
  }

  const copyExample = async () => {
    const example = `${normalized || 'http://localhost:3000/s'}/example-slug`
    try {
      await navigator.clipboard.writeText(example)
      showSnack('Namuna link nusxalandi', 'success')
    } catch {
      showSnack('Nusxalab bo‘lmadi', 'error')
    }
  }

  return (
    <>
      <motion.section
        variants={fadeUp}
        className="relative overflow-hidden rounded-[1.5rem] bg-slate-950 px-5 py-6 text-white sm:px-7"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(45,212,191,0.35),transparent_40%),radial-gradient(circle_at_90%_10%,rgba(56,189,248,0.25),transparent_35%)]" />
        <div className="relative">
          <Chip
            label="Sozlamalar"
            size="small"
            sx={{ mb: 1.5, bgcolor: 'rgba(255,255,255,0.12)', color: 'white' }}
          />
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
          <Typography className="!mt-2 max-w-xl !text-[0.9rem] !text-slate-300">
            Public so‘rovnoma linklarining asosiy manzili. To‘liq link:{' '}
            <span className="font-semibold text-teal-200">{'{base_url}/{slug}'}</span>
          </Typography>
        </div>
      </motion.section>

      <motion.section
        variants={fadeUp}
        className="rounded-[1.35rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/80 sm:p-6"
      >
        {loading ? (
          <Box className="grid place-items-center py-14">
            <CircularProgress />
          </Box>
        ) : (
          <Box component="form" onSubmit={save} className="max-w-2xl">
            <Stack spacing={2.5}>
              <div>
                <Typography
                  variant="h6"
                  sx={{ ...headingFont, fontWeight: 700, fontSize: '1.15rem' }}
                >
                  Base URL
                </Typography>
                <Typography variant="body2" color="text.secondary" className="!mt-0.5">
                  Kalit: <code>{setting?.key ?? 'survey_link_base_url'}</code>
                </Typography>
              </div>

              <TextField
                label="Base URL"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                fullWidth
                placeholder="https://forms.example.com/survey"
                error={baseUrl.length > 0 && !valid}
                helperText={
                  baseUrl.length > 0 && !valid
                    ? 'URL http:// yoki https:// bilan boshlanishi kerak'
                    : 'Oxiridagi “/” avtomatik olib tashlanadi'
                }
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <LinkRounded fontSize="small" />
                      </InputAdornment>
                    ),
                  },
                }}
              />

              <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: '#64748b',
                    }}
                  >
                    Namuna link
                  </Typography>
                  <Tooltip title="Namunani nusxalash">
                    <IconButton size="small" onClick={() => void copyExample()}>
                      <ContentCopyRounded fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </div>
                <p className="mt-1 break-all font-mono text-sm text-slate-700">
                  {(normalized || 'http://localhost:3000/s') + '/'}
                  <span className="text-teal-600">example-slug</span>
                </p>
              </div>

              {setting && (
                <Typography variant="caption" color="text.secondary">
                  Oxirgi yangilanish: {formatDate(setting.updated_at)}
                </Typography>
              )}

              <Stack direction="row" spacing={1.5} className="pt-1">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={saving || !dirty || !valid}
                    startIcon={
                      saving ? (
                        <CircularProgress size={18} color="inherit" />
                      ) : (
                        <SaveRounded />
                      )
                    }
                  >
                    {saving ? 'Saqlanmoqda...' : 'Saqlash'}
                  </Button>
                </motion.div>
                <Button
                  type="button"
                  variant="outlined"
                  size="large"
                  disabled={saving || !dirty}
                  startIcon={<RefreshRounded />}
                  onClick={() => setting && setBaseUrl(setting.base_url)}
                >
                  Bekor qilish
                </Button>
              </Stack>
            </Stack>
          </Box>
        )}
      </motion.section>
    </>
  )
}
