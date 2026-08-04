import { useMemo } from 'react'

const MARGIN_MM = 5
const GAP_MM = 2

type Props = {
  orientation: 'portrait' | 'landscape'
  cols: number
  rows: number
  /** Vizitka fon rasm URL (ixtiyoriy) */
  cardImageUrl?: string | null
  /** Shablon aspect ratio (width/height) */
  imageWidth?: number
  imageHeight?: number
}

function estimateLayout(
  orientation: 'portrait' | 'landscape',
  cols: number,
  rows: number,
  templateWidth: number,
  templateHeight: number,
) {
  const pageWidth = orientation === 'portrait' ? 210 : 297
  const pageHeight = orientation === 'portrait' ? 297 : 210
  const usableW = pageWidth - 2 * MARGIN_MM
  const usableH = pageHeight - 2 * MARGIN_MM
  const cellW = (usableW - (cols - 1) * GAP_MM) / cols
  const cellH = (usableH - (rows - 1) * GAP_MM) / rows
  const aspect =
    templateWidth > 0 && templateHeight > 0
      ? templateWidth / templateHeight
      : 1.6

  let cardWidth = cellW
  let cardHeight = cardWidth / aspect
  if (cardHeight > cellH) {
    cardHeight = cellH
    cardWidth = cardHeight * aspect
  }

  return {
    pageWidth,
    pageHeight,
    cardWidth,
    cardHeight,
    perPage: cols * rows,
  }
}

/**
 * A4 varaqqa vizitkalar qanday joylashishini ko‘rsatadi.
 */
export function A4LayoutPreview({
  orientation,
  cols,
  rows,
  cardImageUrl,
  imageWidth = 0,
  imageHeight = 0,
}: Props) {
  const layout = useMemo(
    () =>
      estimateLayout(
        orientation,
        Math.max(1, cols),
        Math.max(1, rows),
        imageWidth,
        imageHeight,
      ),
    [orientation, cols, rows, imageWidth, imageHeight],
  )

  // Display scale: longest side ~ 280px
  const maxSide = 280
  const scale =
    layout.pageWidth > layout.pageHeight
      ? maxSide / layout.pageWidth
      : maxSide / layout.pageHeight

  const pageW = layout.pageWidth * scale
  const pageH = layout.pageHeight * scale
  const margin = MARGIN_MM * scale
  const gap = GAP_MM * scale
  const cardW = layout.cardWidth * scale
  const cardH = layout.cardHeight * scale

  const slots = Array.from({ length: layout.perPage }, (_, i) => i)

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        A4 preview
      </p>
      <div className="flex justify-center overflow-auto rounded-xl border border-slate-200 bg-slate-100/80 p-4">
        <div
          className="relative bg-white shadow-md ring-1 ring-slate-300/80"
          style={{
            width: pageW,
            height: pageH,
            boxShadow: '0 8px 24px rgba(15,23,42,0.12)',
          }}
          aria-label={`A4 ${orientation}, ${cols}×${rows}`}
        >
          {/* subtle paper grain */}
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(248,250,252,0.5),transparent_40%)]" />

          {slots.map((i) => {
            const col = i % cols
            const row = Math.floor(i / cols)
            const left = margin + col * (cardW + gap)
            const top = margin + row * (cardH + gap)
            return (
              <div
                key={i}
                className="absolute overflow-hidden rounded-[2px] border border-slate-300/90 bg-slate-50"
                style={{
                  left,
                  top,
                  width: cardW,
                  height: cardH,
                }}
              >
                {cardImageUrl ? (
                  <img
                    src={cardImageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                    draggable={false}
                  />
                ) : (
                  <div className="grid h-full place-items-center text-[8px] font-medium text-slate-400">
                    {i + 1}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
      <p className="text-center text-xs text-slate-500">
        {orientation === 'portrait' ? 'Vertikal' : 'Gorizontal'} · {cols}×{rows} ={' '}
        <strong className="text-slate-700">{layout.perPage}</strong> ta / varaq
        {' · '}
        ~{layout.cardWidth.toFixed(1)}×{layout.cardHeight.toFixed(1)} mm
      </p>
    </div>
  )
}
