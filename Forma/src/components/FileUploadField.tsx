import { useId, useRef, useState } from 'react'
import {
  AudioFileRounded,
  CheckCircleRounded,
  CloudUploadRounded,
  DeleteOutlineRounded,
  DescriptionRounded,
  FolderZipRounded,
  ImageRounded,
  InsertDriveFileRounded,
  PictureAsPdfRounded,
  SlideshowRounded,
  TableChartRounded,
  VideocamRounded,
} from '@mui/icons-material'
import { CircularProgress, IconButton, LinearProgress } from '@mui/material'
import type { QuestionType } from '../types/survey'

function acceptFor(type: string, configAccept?: string) {
  if (configAccept) return configAccept
  switch (type) {
    case 'file_image':
      return 'image/*'
    case 'file_video':
      return 'video/*'
    case 'file_audio':
      return 'audio/*'
    case 'file_pdf':
      return 'application/pdf,.pdf'
    case 'file_document':
      return '.doc,.docx,.odt,.txt,.rtf'
    case 'file_spreadsheet':
      return '.xls,.xlsx,.csv,.ods'
    case 'file_presentation':
      return '.ppt,.pptx,.odp'
    case 'file_archive':
      return '.zip,.rar,.7z,.tar,.gz'
    default:
      return undefined
  }
}

function iconFor(type: QuestionType) {
  switch (type) {
    case 'file_image':
      return <ImageRounded />
    case 'file_video':
      return <VideocamRounded />
    case 'file_audio':
      return <AudioFileRounded />
    case 'file_pdf':
      return <PictureAsPdfRounded />
    case 'file_document':
      return <DescriptionRounded />
    case 'file_spreadsheet':
      return <TableChartRounded />
    case 'file_presentation':
      return <SlideshowRounded />
    case 'file_archive':
      return <FolderZipRounded />
    default:
      return <InsertDriveFileRounded />
  }
}

function hintFor(type: QuestionType) {
  switch (type) {
    case 'file_image':
      return 'JPG, PNG, WEBP…'
    case 'file_video':
      return 'MP4, MOV, WEBM…'
    case 'file_audio':
      return 'MP3, WAV, AAC…'
    case 'file_pdf':
      return 'Faqat PDF'
    case 'file_document':
      return 'DOC, DOCX, TXT…'
    case 'file_spreadsheet':
      return 'XLS, XLSX, CSV…'
    case 'file_presentation':
      return 'PPT, PPTX…'
    case 'file_archive':
      return 'ZIP, RAR, 7Z…'
    default:
      return 'Istalgan fayl'
  }
}

type Props = {
  type: QuestionType
  label: string
  description?: string
  accept?: string
  maxSizeMb?: number
  value?: string
  fileName?: string
  error?: string
  disabled?: boolean
  uploading?: boolean
  progress?: number
  onUpload: (file: File) => Promise<void>
  onClear: () => void
}

export function FileUploadField({
  type,
  label,
  description,
  accept,
  maxSizeMb,
  value,
  fileName,
  error,
  disabled,
  uploading,
  progress = 0,
  onUpload,
  onClear,
}: Props) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [localName, setLocalName] = useState('')
  const [dragOver, setDragOver] = useState(false)

  const done = Boolean(value) && !uploading
  const showName = fileName || localName

  const pick = async (file?: File | null) => {
    if (!file || disabled || uploading) return
    if (maxSizeMb && file.size > maxSizeMb * 1024 * 1024) {
      return
    }
    setLocalName(file.name)
    await onUpload(file)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-slate-700">
        {label}
      </label>
      {(description || hintFor(type)) && (
        <p className="text-xs text-slate-500">
          {description || hintFor(type)}
          {maxSizeMb ? ` · max ${maxSizeMb} MB` : ''}
        </p>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled && !uploading) setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          void pick(e.dataTransfer.files?.[0])
        }}
        className={`relative overflow-hidden rounded-2xl border-2 border-dashed transition-all ${
          error
            ? 'border-red-300 bg-red-50/60'
            : done
              ? 'border-teal-300 bg-teal-50/70'
              : dragOver
                ? 'border-teal-500 bg-teal-50'
                : 'border-slate-200 bg-slate-50/80 hover:border-teal-300 hover:bg-teal-50/40'
        }`}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={acceptFor(type, accept)}
          disabled={disabled || uploading}
          className="sr-only"
          onChange={(e) => void pick(e.target.files?.[0])}
        />

        {!done && !uploading && (
          <label
            htmlFor={inputId}
            className={`flex cursor-pointer flex-col items-center gap-2 px-4 py-6 text-center ${
              disabled ? 'pointer-events-none opacity-50' : ''
            }`}
          >
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-teal-600 shadow-sm ring-1 ring-slate-200">
              {iconFor(type)}
            </span>
            <span className="text-sm font-semibold text-slate-700">
              Faylni tanlang yoki shu yerga tashlang
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-600 px-3 py-1 text-xs font-semibold text-white">
              <CloudUploadRounded sx={{ fontSize: 16 }} />
              Yuklash
            </span>
          </label>
        )}

        {uploading && (
          <div className="space-y-3 px-4 py-5">
            <div className="flex items-center gap-3">
              <CircularProgress size={22} thickness={5} />
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm font-semibold text-slate-800">
                  {showName || 'Yuklanmoqda...'}
                </p>
                <p className="text-xs text-slate-500">
                  {Math.round(progress)}% · Iltimos kuting
                </p>
              </div>
            </div>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{ height: 8, borderRadius: 999 }}
            />
          </div>
        )}

        {done && (
          <div className="flex items-center gap-3 px-4 py-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-teal-100 text-teal-700">
              <CheckCircleRounded />
            </span>
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-semibold text-slate-800">
                {showName || 'Fayl yuklandi'}
              </p>
              <p className="truncate text-xs text-teal-700">Muvaffaqiyatli yuklandi</p>
            </div>
            <IconButton
              size="small"
              color="error"
              disabled={disabled}
              aria-label="O‘chirish"
              onClick={onClear}
            >
              <DeleteOutlineRounded fontSize="small" />
            </IconButton>
          </div>
        )}
      </div>

      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
    </div>
  )
}
