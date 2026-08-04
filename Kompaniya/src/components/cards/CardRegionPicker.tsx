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
  onTextAdd: (rect: { x: number; y: number; width: number; height: number }) => void
  onSelectText: (id: string | null) => void
  /** Yangi zona chizish mumkin emas (faqat tanlash + matn preview) */
  allowDraw?: boolean
  /** Matn qiymatlari previewda ko‘rinsin */
  showLiveText?: boolean
  maxHeight?: number
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
  allowDraw = true,
  showLiveText = true,
  maxHeight = 460,
}: Props) {
  const imageRef = useRef<HTMLImageElement>(null)
  const dragStart = useRef<{ x: number; y: number } | null>(null)
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 })
  const [displaySize, setDisplaySize] = useState({ w: 0, h: 0 })
  const [draft, setDraft] = useState<{ x: number; y: number; w: number; h: number } | null>(
    null,
  )

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
    if (!allowDraw) return
    event.currentTarget.setPointerCapture(event.pointerId)
    const point = toNatural(event.clientX, event.clientY)
    dragStart.current = point
    setDraft({ x: point.x, y: point.y, w: 0, h: 0 })
  }

  function handlePointerMove(event: React.PointerEvent) {
    if (!dragStart.current || !allowDraw) return
    const point = toNatural(event.clientX, event.clientY)
    setDraft({
      x: Math.min(dragStart.current.x, point.x),
      y: Math.min(dragStart.current.y, point.y),
      w: Math.abs(point.x - dragStart.current.x),
      h: Math.abs(point.y - dragStart.current.y),
    })
  }

  function handlePointerUp() {
    if (!dragStart.current || !draft) return
    dragStart.current = null
    if (draft.w >= 8 && draft.h >= 8) {
      if (mode === 'qr') {
        onQrChange({ qrX: draft.x, qrY: draft.y, qrWidth: draft.w, qrHeight: draft.h })
      } else {
        onTextAdd({ x: draft.x, y: draft.y, width: draft.w, height: draft.h })
      }
    }
    setDraft(null)
  }

  const scaleX = displaySize.w && naturalSize.w ? displaySize.w / naturalSize.w : 0
  const scaleY = displaySize.h && naturalSize.h ? displaySize.h / naturalSize.h : 0
  const fontScale = Math.min(scaleX || 1, scaleY || 1)

  return (
    <div className="space-y-2">
      <div className="overflow-auto rounded-2xl border border-slate-200 bg-slate-100 p-3">
        <div className="relative inline-block max-w-full select-none">
          <img
            ref={imageRef}
            src={imageUrl}
            alt="Vizitka"
            className="block max-w-full"
            style={{
              maxHeight,
              cursor: allowDraw ? 'crosshair' : 'default',
            }}
            draggable={false}
            onLoad={measure}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          />

          {qr && qr.qrWidth > 0 && (
            <div
              className="pointer-events-none absolute flex items-center justify-center border-2 border-teal-500 bg-white/70"
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
              <span
                className="text-teal-700/80"
                style={{
                  fontSize: Math.max(10, Math.min(qr.qrWidth, qr.qrHeight) * fontScale * 0.18),
                }}
              >
                QR
              </span>
            </div>
          )}

          {textFields.map((f) => {
            const selected = selectedTextId === f.id
            const fontSizePx = Math.max(8, (f.fontSize || 16) * fontScale)
            const hasText = Boolean(f.text?.trim())
            return (
              <div
                key={f.id}
                className={`absolute overflow-hidden border-2 ${
                  selected
                    ? 'border-amber-500 bg-amber-400/10 ring-2 ring-amber-400/30'
                    : 'border-sky-500/80 bg-white/10'
                }`}
                style={{
                  left: f.x * scaleX,
                  top: f.y * scaleY,
                  width: Math.max(8, f.width * scaleX),
                  height: Math.max(8, f.height * scaleY),
                  cursor: 'pointer',
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  onSelectText(f.id)
                }}
              >
                <span
                  className={`absolute -top-5 left-0 max-w-[140px] truncate rounded px-1 py-0.5 text-[10px] font-semibold text-white ${
                    selected ? 'bg-amber-600' : 'bg-sky-600'
                  }`}
                >
                  {f.label || 'Matn'}
                </span>
                {showLiveText && (
                  <div
                    className="box-border h-full w-full overflow-hidden px-0.5 py-0.5 leading-tight whitespace-pre-wrap break-words"
                    style={{
                      fontFamily: f.fontFamily || 'Arial, sans-serif',
                      fontSize: fontSizePx,
                      fontWeight: f.bold ? 700 : 400,
                      color: f.color || '#111827',
                      textAlign: (f.align as 'left' | 'center' | 'right') || 'left',
                      opacity: hasText ? 1 : 0.45,
                    }}
                  >
                    {hasText ? f.text : f.label || 'Matn…'}
                  </div>
                )}
              </div>
            )
          })}

          {draft && draft.w > 0 && (
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
      {showLiveText && (
        <p className="text-xs text-slate-500">
          Matn o‘ngdagi maydonda yozilganda previewda darhol chiqadi. Maydonni bosib tanlang.
        </p>
      )}
    </div>
  )
}
