export type CardTextField = {
  id: string
  label: string
  x: number
  y: number
  width: number
  height: number
  text: string
  fontSize: number
  fontFamily: string
  color: string
  bold: boolean
  align: 'left' | 'center' | 'right'
}

export type QrRegion = {
  qrX: number
  qrY: number
  qrWidth: number
  qrHeight: number
}

export type CardTemplate = {
  id: string
  name: string
  imageUrl: string
  imageWidth: number
  imageHeight: number
  imageContentType: string
  qrX: number
  qrY: number
  qrWidth: number
  qrHeight: number
  textFields: CardTextField[]
  createdAt: string
  updatedAt: string
}

export type CompanyCard = {
  id: string
  companyId: string
  templateId?: string | null
  source: 'template' | 'custom'
  name: string
  imageUrl: string
  imageWidth: number
  imageHeight: number
  imageContentType: string
  qrX: number
  qrY: number
  qrWidth: number
  qrHeight: number
  textFields: CardTextField[]
  orientation: '' | 'portrait' | 'landscape'
  cols: number
  rows: number
  marginMm: number
  gapMm: number
  surveyId?: string | null
  surveySlug?: string
  surveyTitle?: string
  responseUrl?: string
  createdAt: string
  updatedAt: string
}

export type CardBrief = {
  id: string
  name: string
  imageUrl: string
  previewUrl?: string
  qrUrl?: string
  responseUrl?: string
  source: string
}

export type CardLayout = {
  orientation: 'portrait' | 'landscape'
  cols: number
  rows: number
  perPage: number
  cardWidthMm: number
  cardHeightMm: number
  pageWidthMm: number
  pageHeightMm: number
  copies: number
  pagesNeeded: number
}

export const FONT_OPTIONS = [
  'Arial',
  'Times New Roman',
  'Georgia',
  'Verdana',
  'Courier New',
]

export function newTextField(partial?: Partial<CardTextField>): CardTextField {
  return {
    id: crypto.randomUUID(),
    label: 'Matn maydoni',
    x: 40,
    y: 40,
    width: 200,
    height: 40,
    text: '',
    fontSize: 18,
    fontFamily: 'Arial',
    color: '#111827',
    bold: false,
    align: 'left',
    ...partial,
  }
}

export function hasLayoutConfig(card: Pick<CompanyCard, 'orientation' | 'cols' | 'rows'>) {
  return Boolean(card.orientation) && card.cols > 0 && card.rows > 0
}
