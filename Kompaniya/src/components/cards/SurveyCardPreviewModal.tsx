import { useEffect, useState } from 'react'
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material'
import { ContactMailRounded, QrCode2Rounded } from '@mui/icons-material'
import { getSurveyCard, fetchCardBlob } from '../../api/cards'
import type { CardBrief } from '../../api/cardTypes'
import { ApiError } from '../../api/client'

type Props = {
  surveyId: string
  surveyTitle: string
  open: boolean
  onClose: () => void
}

export function SurveyCardPreviewModal({ surveyId, surveyTitle, open, onClose }: Props) {
  const [brief, setBrief] = useState<CardBrief | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [qrUrl, setQrUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    let pRev: string | null = null
    let qRev: string | null = null
    setLoading(true)
    setError('')
    setBrief(null)
    setPreviewUrl(null)
    setQrUrl(null)

    void getSurveyCard(surveyId)
      .then(async (data) => {
        if (cancelled) return
        if (!data) {
          setError('Bu so‘rovnomaga vizitka biriktirilmagan')
          return
        }
        setBrief(data)
        if (data.previewUrl) {
          const blob = await fetchCardBlob(data.previewUrl)
          if (cancelled) return
          pRev = URL.createObjectURL(blob)
          setPreviewUrl(pRev)
        }
        if (data.qrUrl) {
          try {
            const blob = await fetchCardBlob(data.qrUrl)
            if (cancelled) return
            qRev = URL.createObjectURL(blob)
            setQrUrl(qRev)
          } catch {
            /* QR may fail if no url */
          }
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Yuklab bo‘lmadi')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
      if (pRev) URL.revokeObjectURL(pRev)
      if (qRev) URL.revokeObjectURL(qRev)
    }
  }, [open, surveyId])

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Vizitka va QR — {surveyTitle}</DialogTitle>
      <DialogContent>
        {loading && (
          <div className="grid place-items-center py-10">
            <CircularProgress />
          </div>
        )}
        {!loading && error && (
          <Typography color="text.secondary" className="!py-6 text-center">
            {error}
          </Typography>
        )}
        {!loading && brief && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase text-slate-500">
                <ContactMailRounded fontSize="inherit" /> Vizitka
              </p>
              {previewUrl ? (
                <img src={previewUrl} alt={brief.name} className="mx-auto max-h-72 object-contain" />
              ) : (
                <p className="text-center text-sm text-slate-400">Preview yo‘q</p>
              )}
              <p className="mt-2 text-center text-sm font-medium text-slate-800">{brief.name}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase text-slate-500">
                <QrCode2Rounded fontSize="inherit" /> QR kod
              </p>
              {qrUrl ? (
                <img src={qrUrl} alt="QR" className="mx-auto max-h-72 object-contain" />
              ) : (
                <p className="text-center text-sm text-slate-400">QR yo‘q</p>
              )}
              {brief.responseUrl && (
                <p className="mt-2 break-all text-center text-xs text-slate-500">
                  {brief.responseUrl}
                </p>
              )}
            </div>
          </div>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Yopish</Button>
      </DialogActions>
    </Dialog>
  )
}
