import { useCallback, useEffect, useRef, useState } from 'react'
import type { CardTextField, QrRegion } from '../../api/cardTypes'

export type RegionMode = 'qr' | 'text'

type Props = {
  imageUrl: string
  qr: QrRegion | null
  textFields: CardTextField[]
  mode: RegionMode
  selectedTextId: string | null
  onQrChange: (region: QrRegion) => void
  onTextAdd: (field: Omit<CardTextField, 'id' | 'label' | 'text' | 'fontSize' | 'fontFamily' | 'color' | 'bold' | 'align'> & Partial<CardTextField>) => void
  onSelectText: (id: string | null) => void
  disabled?: boolean
}

export function CardRegionPicker({
  imageUrl,
  qr,
  textFields,
  mode,
  selectedTextId,
  onQrChange,
  onTextAdd,
  onSelectText,
  disabled = false,
}: Props) {
  const imageRef = useRef<HTMLImageElement>(null)
  const dragStart = useRef<{ x: number; y: number } | null>(null)
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 })
  const [displaySize, setDisplaySize] = useState({ w: 0, h: 0 })
  const [draft, setDraft] = useState<{ x: number; y: number; w: number; h: number } | null>(null)

  const measure = useCallback(() => {
    const image = imageRef.current
    if (!image) return
    setNaturalSize({ w: image.naturalWidth, h: image.naturalHeight })
    setDisplaySize({ w: image.clientWidth, h: image.clientHeight })
  }, [])

  useEffect(() => {
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure, imageUrl])

  function toNatural(clientX: number, clientY: number) {
    const image = imageRef.current
    if (!image || !displaySize.w || !displaySize.h) return { x: 0, y: 0 }
    const rect = image.getBoundingClientRect()
    const scaleX = naturalSize.w / displaySize.w
    const scaleY = naturalSize.h / displaySize.h
    return {
      x: Math.round(Math.min(Math.max(clientX - rect.left, 0), displaySize.w) * scaleX),
      y: Math.round(Math.min(Math.max(clientY - rect.top, 0), displaySize.h) * scaleY),
    }
  }

  function handlePointerDown(event: React.PointerEvent) {
    if (disabled) return
    event.currentTarget.setPointerCapture(event.pointerId)
    const point = toNatural(event.clientX, event.clientY)
    dragStart.current = point
    setDraft({ x: point.x, y: point.y, w: 0, h: 0 })
  }

  function handlePointerMove(event: React.PointerEvent) {
    if (!dragStart.current || disabled) return
    const point = toNatural(event.clientX, event.clientY)
    const x = Math.min(dragStart.current.x, point.x)
    const y = Math.min(dragStart.current.y, point.y)
    const w = Math.abs(point.x - dragStart.current.x)
    const h = Math.abs(point.y - dragStart.current.y)
    setDraft({ x, y, w, h })
  }

  function handlePointerUp() {
    if (!dragStart.current || !draft) return
    dragStart.current = null
    if (draft.w >= 8 && draft.h >= 8) {
      if (mode === 'qr') {
        onQrChange({ qrX: draft.x, qrY: draft.y, qrWidth: draft.w, qrHeight: draft.h })
      } else {
        onTextAdd({
          x: draft.x,
          y: draft.y,
          width: draft.w,
          height: draft.h,
        })
      }
    }
    setDraft(null)
  }

  const scaleX = displaySize.w && naturalSize.w ? displaySize.w / naturalSize.w : 0
  const scaleY = displaySize.h && naturalSize.h ? displaySize.h / naturalSize.h : 0

  return (
    <div className="space-y-2">
      <div className="overflow-auto rounded-2xl border border-slate-200 bg-slate-100 p-3">
        <div className="relative inline-block max-w-full select-none">
          <img
            ref={imageRef}
            src={imageUrl}
            alt="Shablon"
            className={`block max-h-[480px] max-w-full ${disabled ? 'cursor-default' : 'cursor-crosshair'}`}
            draggable={false}
            onLoad={measure}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          />
          {qr && qr.qrWidth > 0 && qr.qrHeight > 0 && (
            <div
              className="pointer-events-none absolute border-2 border-teal-500 bg-teal-500/20"
              style={{
                left: qr.qrX * scaleX,
                top: qr.qrY * scaleY,
                width: qr.qrWidth * scaleX,
                height: qr.qrHeight * scaleY,
              }}
            >
              <span className="absolute -top-6 left-0 rounded bg-teal-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                QR
              </span>
            </div>
          )}
          {textFields.map((f) => (
            <div
              key={f.id}
              className={`absolute border-2 ${
                selectedTextId === f.id
                  ? 'border-amber-500 bg-amber-400/25'
                  : 'border-sky-500 bg-sky-400/20'
              }`}
              style={{
                left: f.x * scaleX,
                top: f.y * scaleY,
                width: f.width * scaleX,
                height: f.height * scaleY,
                pointerEvents: disabled ? 'none' : 'auto',
                cursor: 'pointer',
              }}
              onClick={(e) => {
                e.stopPropagation()
                onSelectText(f.id)
              }}
            >
              <span className="absolute -top-5 left-0 max-w-[120px] truncate rounded bg-sky-600 px-1 py-0.5 text-[10px] font-semibold text-white">
                {f.label || 'Matn'}
              </span>
            </div>
          ))}
          {draft && draft.w > 0 && draft.h > 0 && (
            <div
              className="pointer-events-none absolute border-2 border-violet-500 bg-violet-500/20"
              style={{
                left: draft.x * scaleX,
                top: draft.y * scaleY,
                width: draft.w * scaleX,
                height: draft.h * scaleY,
              }}
            />
          )}
        </div>
      </div>
      <p className="text-xs text-slate-500">
        Rejim: <strong>{mode === 'qr' ? 'QR joyi' : 'Matn maydoni'}</strong> — rasmda to‘rtburchak torting.
        {qr ? ` QR: ${qr.qrX},${qr.qrY} · ${qr.qrWidth}×${qr.qrHeight}px` : ''}
      </p>
    </div>
  )
}
