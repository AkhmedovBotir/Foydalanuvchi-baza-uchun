import { useState } from 'react'
import { Button, IconButton, TextField, Tooltip, Typography } from '@mui/material'
import {
  CheckRounded,
  ContentCopyRounded,
  LinkRounded,
  OpenInNewRounded,
} from '@mui/icons-material'
import type { SurveyStatus } from '../../api/types'

function statusHint(status?: SurveyStatus): string | null {
  switch (status) {
    case 'draft':
      return 'Forma faqat nashr qilingandan keyin ishlaydi.'
    case 'closed':
      return "So'rovnoma yopilgan — forma javob qabul qilmaydi."
    default:
      return null
  }
}

export function SurveyResponseUrl({
  url,
  status,
  variant = 'full',
}: {
  url: string
  status?: SurveyStatus
  variant?: 'inline' | 'card' | 'full'
}) {
  const [copied, setCopied] = useState(false)
  const hint = statusHint(status)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-0.5">
        <Tooltip title={copied ? 'Nusxalandi' : 'Nusxalash'}>
          <IconButton
            size="small"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              void handleCopy()
            }}
          >
            {copied ? (
              <CheckRounded sx={{ fontSize: 16, color: '#059669' }} />
            ) : (
              <ContentCopyRounded sx={{ fontSize: 16 }} />
            )}
          </IconButton>
        </Tooltip>
        <Tooltip title="Ochish">
          <IconButton
            size="small"
            component="a"
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            <OpenInNewRounded sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      </div>
    )
  }

  if (variant === 'card') {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
          <LinkRounded sx={{ fontSize: 14, color: '#94a3b8' }} />
          <span className="min-w-0 truncate font-mono text-xs text-slate-600" title={url}>
            {url}
          </span>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outlined"
            size="small"
            className="!flex-1"
            startIcon={
              copied ? (
                <CheckRounded sx={{ fontSize: 16, color: '#059669' }} />
              ) : (
                <ContentCopyRounded sx={{ fontSize: 16 }} />
              )
            }
            onClick={() => void handleCopy()}
          >
            {copied ? 'Nusxalandi' : 'Havolani nusxalash'}
          </Button>
          <Button
            type="button"
            variant="outlined"
            size="small"
            component="a"
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            startIcon={<OpenInNewRounded sx={{ fontSize: 16 }} />}
          >
            Ochish
          </Button>
        </div>
        {hint && (
          <Typography variant="caption" color="text.secondary">
            {hint}
          </Typography>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <TextField
          value={url}
          size="small"
          fullWidth
          slotProps={{
            input: {
              readOnly: true,
              sx: { fontFamily: 'monospace', fontSize: 12 },
            },
          }}
        />
        <Tooltip title={copied ? 'Nusxalandi' : 'Nusxalash'}>
          <IconButton onClick={() => void handleCopy()}>
            {copied ? (
              <CheckRounded sx={{ color: '#059669' }} />
            ) : (
              <ContentCopyRounded />
            )}
          </IconButton>
        </Tooltip>
        <Tooltip title="Ochish">
          <IconButton component="a" href={url} target="_blank" rel="noopener noreferrer">
            <OpenInNewRounded />
          </IconButton>
        </Tooltip>
      </div>
      {hint && (
        <Typography variant="caption" color="text.secondary">
          {hint}
        </Typography>
      )}
      {status === 'published' && (
        <Typography variant="caption" sx={{ color: '#047857', display: 'block' }}>
          Nashr qilingan — havolani ulashishingiz mumkin.
        </Typography>
      )}
    </div>
  )
}
