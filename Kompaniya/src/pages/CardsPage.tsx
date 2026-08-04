import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Slider,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  AddRounded,
  DeleteOutlineRounded,
  PictureAsPdfRounded,
  QrCode2Rounded,
  RefreshRounded,
  TextFieldsRounded,
  VisibilityRounded,
} from '@mui/icons-material'
import {
  createCustomCard,
  createFromTemplate,
  deleteCard,
  downloadCardPdf,
  fetchCardBlob,
  getCardLayout,
  listCardTemplates,
  listCards,
  updateCard,
  attachCardToSurvey,
} from '../api/cards'
import type {
  CardLayout,
  CardTemplate,
  CardTextField,
  CompanyCard,
  QrRegion,
} from '../api/cardTypes'
import { FONT_OPTIONS, hasLayoutConfig, newTextField } from '../api/cardTypes'
import { CardRegionPicker, type RegionMode } from '../components/cards/CardRegionPicker'
import { AuthImage } from '../components/cards/AuthImage'
import { A4LayoutPreview } from '../components/cards/A4LayoutPreview'
import { listSurveys } from '../api/surveys'
import type { Survey } from '../api/types'
import { ApiError } from '../api/client'
import { useSnack } from '../ui/SnackProvider'

const headingFont = { fontFamily: "'Outfit', sans-serif" }
const GRID = Array.from({ length: 12 }, (_, i) => i + 1)

type Mode = 'list' | 'from-template' | 'custom' | 'detail'

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function CardsPage() {
  const { showSnack } = useSnack()
  const [mode, setMode] = useState<Mode>('list')
  const [cards, setCards] = useState<CompanyCard[]>([])
  const [templates, setTemplates] = useState<CardTemplate[]>([])
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<CompanyCard | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [qrPreviewUrl, setQrPreviewUrl] = useState<string | null>(null)
  const [cardImageUrl, setCardImageUrl] = useState<string | null>(null)
  const [layout, setLayout] = useState<CardLayout | null>(null)

  // template flow
  const [pickedTemplate, setPickedTemplate] = useState<CardTemplate | null>(null)
  const [templateImageUrl, setTemplateImageUrl] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [textFields, setTextFields] = useState<CardTextField[]>([])
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null)

  // custom flow
  const [file, setFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [qr, setQr] = useState<QrRegion | null>(null)
  const [regionMode, setRegionMode] = useState<RegionMode>('qr')

  // layout draft
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape')
  const [cols, setCols] = useState(3)
  const [rows, setRows] = useState(3)
  const [saving, setSaving] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [toDelete, setToDelete] = useState<CompanyCard | null>(null)
  const [attachSurveyId, setAttachSurveyId] = useState('')

  const selectedField = textFields.find((f) => f.id === selectedTextId) ?? null

  const loadAll = async () => {
    const results = await Promise.allSettled([
      listCards(),
      listCardTemplates(),
      listSurveys(),
    ])
    const cardsRes = results[0]
    const templatesRes = results[1]
    const surveysRes = results[2]

    if (cardsRes.status === 'fulfilled') {
      setCards(cardsRes.value ?? [])
    } else {
      setCards([])
      console.error('listCards', cardsRes.reason)
    }
    if (templatesRes.status === 'fulfilled') {
      setTemplates(templatesRes.value ?? [])
    } else {
      setTemplates([])
    }
    if (surveysRes.status === 'fulfilled') {
      setSurveys(surveysRes.value ?? [])
    } else {
      setSurveys([])
    }

    const firstErr = results.find((r) => r.status === 'rejected') as
      | PromiseRejectedResult
      | undefined
    if (firstErr) {
      const reason = firstErr.reason
      throw reason instanceof Error ? reason : new Error(String(reason))
    }
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void loadAll()
      .catch((err) => {
        if (!cancelled) {
          showSnack(
            err instanceof ApiError ? err.message : 'Vizitkalarni yuklab bo‘lmadi',
            'error',
          )
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      if (qrPreviewUrl) URL.revokeObjectURL(qrPreviewUrl)
      if (templateImageUrl) URL.revokeObjectURL(templateImageUrl)
      if (filePreview) URL.revokeObjectURL(filePreview)
      if (cardImageUrl) URL.revokeObjectURL(cardImageUrl)
    }
  }, [previewUrl, qrPreviewUrl, templateImageUrl, filePreview, cardImageUrl])

  function patchField(id: string, patch: Partial<CardTextField>) {
    setTextFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)))
  }

  async function openDetail(card: CompanyCard) {
    setMode('detail')
    setSelected(card)
    setName(card.name)
    setTextFields(card.textFields ?? [])
    setQr({
      qrX: card.qrX,
      qrY: card.qrY,
      qrWidth: card.qrWidth,
      qrHeight: card.qrHeight,
    })
    setOrientation((card.orientation as 'portrait' | 'landscape') || 'landscape')
    setCols(card.cols > 0 ? card.cols : 3)
    setRows(card.rows > 0 ? card.rows : 3)
    setAttachSurveyId(card.surveyId || '')
    setLayout(null)
    await refreshPreviews(card.id)
    if (hasLayoutConfig(card)) {
      try {
        setLayout(await getCardLayout(card.id))
      } catch {
        setLayout(null)
      }
    }
  }

  async function refreshPreviews(id: string) {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    if (qrPreviewUrl) URL.revokeObjectURL(qrPreviewUrl)
    if (cardImageUrl) URL.revokeObjectURL(cardImageUrl)
    setPreviewUrl(null)
    setQrPreviewUrl(null)
    setCardImageUrl(null)
    try {
      const [p, q, img] = await Promise.all([
        fetchCardBlob(`/api/v1/company/cards/${id}/preview`).catch(() => null),
        fetchCardBlob(`/api/v1/company/cards/${id}/qr`).catch(() => null),
        fetchCardBlob(`/api/v1/company/cards/${id}/image`),
      ])
      if (p) setPreviewUrl(URL.createObjectURL(p))
      if (q) setQrPreviewUrl(URL.createObjectURL(q))
      setCardImageUrl(URL.createObjectURL(img))
    } catch {
      try {
        const img = await fetchCardBlob(`/api/v1/company/cards/${id}/image`)
        setCardImageUrl(URL.createObjectURL(img))
      } catch {
        /* empty */
      }
    }
  }

  async function startFromTemplate(t: CardTemplate) {
    setPickedTemplate(t)
    setName(t.name)
    setTextFields(
      (t.textFields ?? []).map((f) => ({
        ...f,
        text: f.text || '',
      })),
    )
    setSelectedTextId(t.textFields?.[0]?.id ?? null)
    setMode('from-template')
    if (templateImageUrl) URL.revokeObjectURL(templateImageUrl)
    try {
      const blob = await fetchCardBlob(`/api/v1/company/card-templates/${t.id}/image`)
      setTemplateImageUrl(URL.createObjectURL(blob))
    } catch {
      showSnack('Shablon rasmi yuklanmadi', 'error')
    }
  }

  async function saveFromTemplate() {
    if (!pickedTemplate) return
    setSaving(true)
    try {
      const card = await createFromTemplate({
        templateId: pickedTemplate.id,
        name: name || pickedTemplate.name,
        textFields,
      })
      showSnack('Vizitka saqlandi', 'success')
      setPickedTemplate(null)
      await loadAll()
      await openDetail(card)
    } catch (err) {
      showSnack(err instanceof Error ? err.message : 'Xato', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function saveCustom() {
    if (!file || !qr) {
      showSnack('Rasm va QR joyini belgilang', 'error')
      return
    }
    setSaving(true)
    try {
      const form = new FormData()
      form.append('image', file)
      form.append('name', name || 'Mening vizitkam')
      form.append('qrX', String(qr.qrX))
      form.append('qrY', String(qr.qrY))
      form.append('qrWidth', String(qr.qrWidth))
      form.append('qrHeight', String(qr.qrHeight))
      form.append('textFields', JSON.stringify(textFields))
      const card = await createCustomCard(form)
      showSnack('Vizitka saqlandi', 'success')
      setFile(null)
      if (filePreview) URL.revokeObjectURL(filePreview)
      setFilePreview(null)
      await loadAll()
      await openDetail(card)
    } catch (err) {
      showSnack(err instanceof Error ? err.message : 'Xato', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function saveDetail() {
    if (!selected || !qr) return
    setSaving(true)
    try {
      const updated = await updateCard(selected.id, {
        name,
        qrX: qr.qrX,
        qrY: qr.qrY,
        qrWidth: qr.qrWidth,
        qrHeight: qr.qrHeight,
        textFields,
        orientation,
        cols,
        rows,
      })
      setSelected(updated)
      showSnack('Saqlandi', 'success')
      await loadAll()
      await refreshPreviews(updated.id)
      try {
        setLayout(await getCardLayout(updated.id))
      } catch {
        setLayout(null)
      }
    } catch (err) {
      showSnack(err instanceof ApiError ? err.message : 'Xato', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleAttach() {
    if (!selected || !attachSurveyId) {
      showSnack('So‘rovnoma tanlang', 'error')
      return
    }
    setSaving(true)
    try {
      const survey = surveys.find((s) => s.id === attachSurveyId || s.slug === attachSurveyId)
      const ref = survey?.slug || survey?.id || attachSurveyId
      const updated = await attachCardToSurvey(ref, selected.id)
      setSelected(updated)
      showSnack('So‘rovnomaga biriktirildi', 'success')
      await loadAll()
      await refreshPreviews(selected.id)
    } catch (err) {
      showSnack(err instanceof Error ? err.message : 'Biriktirish xatosi', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handlePdf() {
    if (!selected) return
    setPdfLoading(true)
    try {
      // ensure layout saved
      await updateCard(selected.id, { orientation, cols, rows })
      const copies = cols * rows
      const blob = await downloadCardPdf(selected.id, copies)
      downloadBlob(blob, `${selected.name || 'vizitka'}.pdf`)
      showSnack('PDF yuklab olindi', 'success')
    } catch (err) {
      showSnack(err instanceof Error ? err.message : 'PDF xatosi', 'error')
    } finally {
      setPdfLoading(false)
    }
  }

  async function handleDelete() {
    if (!toDelete) return
    setSaving(true)
    try {
      await deleteCard(toDelete.id)
      showSnack('O‘chirildi', 'success')
      setToDelete(null)
      if (selected?.id === toDelete.id) {
        setSelected(null)
        setMode('list')
      }
      await loadAll()
    } catch (err) {
      showSnack(err instanceof ApiError ? err.message : 'Xato', 'error')
    } finally {
      setSaving(false)
    }
  }

  const textEditor = selectedField && (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
      <Typography sx={{ fontWeight: 700 }}>{selectedField.label || 'Matn'}</Typography>
      <TextField
        fullWidth
        size="small"
        label="Matn"
        value={selectedField.text}
        onChange={(e) => patchField(selectedField.id, { text: e.target.value })}
        multiline
        minRows={2}
      />
      <FormControl fullWidth size="small">
        <InputLabel>Shrift</InputLabel>
        <Select
          label="Shrift"
          value={selectedField.fontFamily}
          onChange={(e) => patchField(selectedField.id, { fontFamily: e.target.value })}
        >
          {FONT_OPTIONS.map((f) => (
            <MenuItem key={f} value={f}>
              {f}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <div>
        <Typography variant="caption">O‘lcham: {selectedField.fontSize}px</Typography>
        <Slider
          min={10}
          max={72}
          value={selectedField.fontSize}
          onChange={(_, v) => patchField(selectedField.id, { fontSize: v as number })}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <TextField
          type="color"
          size="small"
          label="Rang"
          value={selectedField.color}
          onChange={(e) => patchField(selectedField.id, { color: e.target.value })}
          sx={{ width: 100 }}
        />
        <div className="flex items-center gap-1">
          <Typography variant="body2">Semiz</Typography>
          <Switch
            checked={selectedField.bold}
            onChange={(e) => patchField(selectedField.id, { bold: e.target.checked })}
          />
        </div>
        <FormControl size="small" sx={{ minWidth: 110 }}>
          <InputLabel>Hizalash</InputLabel>
          <Select
            label="Hizalash"
            value={selectedField.align}
            onChange={(e) =>
              patchField(selectedField.id, {
                align: e.target.value as CardTextField['align'],
              })
            }
          >
            <MenuItem value="left">Chap</MenuItem>
            <MenuItem value="center">Markaz</MenuItem>
            <MenuItem value="right">O‘ng</MenuItem>
          </Select>
        </FormControl>
      </div>
    </div>
  )

  const perPage = cols * rows
  const unboundSurveys = useMemo(
    () =>
      surveys.filter((s) => {
        const bound = cards.find((c) => c.surveyId === s.id && c.id !== selected?.id)
        return !bound
      }),
    [surveys, cards, selected?.id],
  )

  return (
    <div className="space-y-5">
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center justify-between gap-3 rounded-[1.35rem] bg-gradient-to-br from-slate-900 via-slate-900 to-teal-900 px-5 py-6 text-white shadow-lg"
      >
        <div>
          <Typography variant="h4" sx={{ ...headingFont, fontWeight: 800, fontSize: '1.55rem' }}>
            Vizitkalar
          </Typography>
          <p className="mt-1 max-w-xl text-sm text-teal-100/90">
            Shablondan tanlang yoki o‘zingiz yarating, matnlarni to‘ldiring, so‘rovnomaga
            biriktiring va A4 da chop eting
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {mode !== 'list' && (
            <Button
              variant="outlined"
              onClick={() => {
                setMode('list')
                setSelected(null)
              }}
              sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.35)' }}
            >
              Ro‘yxat
            </Button>
          )}
          {mode === 'list' && (
            <>
              <IconButton onClick={() => void loadAll()} sx={{ color: 'white' }}>
                <RefreshRounded />
              </IconButton>
              <Button
                variant="outlined"
                onClick={() => {
                  setMode('from-template')
                  setPickedTemplate(null)
                }}
                sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.35)' }}
              >
                Shablondan
              </Button>
              <Button
                variant="contained"
                startIcon={<AddRounded />}
                onClick={() => {
                  setMode('custom')
                  setName('')
                  setTextFields([])
                  setQr(null)
                  setFile(null)
                  setRegionMode('qr')
                }}
                sx={{ bgcolor: 'white', color: '#0f766e' }}
              >
                O‘z vizitkam
              </Button>
            </>
          )}
        </div>
      </motion.section>

      {mode === 'list' &&
        (loading ? (
          <Box className="grid place-items-center py-16">
            <CircularProgress />
          </Box>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map((card) => (
              <article
                key={card.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <button type="button" className="block w-full text-left" onClick={() => void openDetail(card)}>
                  <div className="aspect-[1.6/1] bg-slate-50">
                    <AuthImage
                      path={`/api/v1/company/cards/${card.id}/preview`}
                      alt={card.name}
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-slate-900">{card.name}</h3>
                      <Chip
                        size="small"
                        label={card.source === 'template' ? 'Shablon' : 'Shaxsiy'}
                      />
                    </div>
                    {card.surveyTitle ? (
                      <p className="mt-1 text-xs text-teal-700">
                        Biriktirilgan: {card.surveyTitle}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-slate-400">So‘rovnoma biriktirilmagan</p>
                    )}
                  </div>
                </button>
                <div className="flex justify-end border-t border-slate-100 px-2 py-1">
                  <Tooltip title="O‘chirish">
                    <IconButton size="small" color="error" onClick={() => setToDelete(card)}>
                      <DeleteOutlineRounded fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </div>
              </article>
            ))}
            {cards.length === 0 && (
              <div className="col-span-full rounded-2xl border border-dashed border-slate-200 py-16 text-center text-slate-500">
                Hali vizitka yo‘q — shablondan yoki o‘zingiz yarating
              </div>
            )}
          </div>
        ))}

      {mode === 'from-template' && !pickedTemplate && (
        <div className="space-y-3">
          <Typography sx={{ fontWeight: 700 }}>Admin shablonlaridan tanlang</Typography>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {templates.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => void startFromTemplate(t)}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:border-teal-300"
              >
                <div className="aspect-[1.6/1] bg-slate-50">
                  <AuthImage
                    path={`/api/v1/company/card-templates/${t.id}/image`}
                    alt={t.name}
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="p-3">
                  <p className="font-semibold">{t.name}</p>
                  <p className="text-xs text-slate-500">
                    {(t.textFields ?? []).length} yozuv maydoni
                  </p>
                </div>
              </button>
            ))}
            {templates.length === 0 && (
              <p className="col-span-full text-slate-500">Hali admin shablon yaratmagan</p>
            )}
          </div>
        </div>
      )}

      {mode === 'from-template' && pickedTemplate && (
        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
            <TextField fullWidth label="Vizitka nomi" value={name} onChange={(e) => setName(e.target.value)} />
            {templateImageUrl && (
              <CardRegionPicker
                imageUrl={templateImageUrl}
                qr={{
                  qrX: pickedTemplate.qrX,
                  qrY: pickedTemplate.qrY,
                  qrWidth: pickedTemplate.qrWidth,
                  qrHeight: pickedTemplate.qrHeight,
                }}
                textFields={textFields}
                mode="text"
                selectedTextId={selectedTextId}
                onQrChange={() => undefined}
                onTextAdd={() => undefined}
                onSelectText={setSelectedTextId}
                allowDraw={false}
                showLiveText
              />
            )}
            <div className="flex flex-wrap gap-2">
              {textFields.map((f) => (
                <Chip
                  key={f.id}
                  label={f.label}
                  color={selectedTextId === f.id ? 'primary' : 'default'}
                  onClick={() => setSelectedTextId(f.id)}
                />
              ))}
            </div>
            <Button variant="contained" disabled={saving} onClick={() => void saveFromTemplate()}>
              {saving ? 'Saqlanmoqda…' : 'Vizitkani saqlash'}
            </Button>
          </div>
          <div>
            {textEditor || (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
                Matn maydonini tanlab to‘ldiring — shrift, rang, o‘lcham, semizlik.
              </div>
            )}
          </div>
        </div>
      )}

      {mode === 'custom' && (
        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
            <TextField fullWidth label="Nomi" value={name} onChange={(e) => setName(e.target.value)} />
            <Button variant="outlined" component="label">
              Fon rasm (PNG/JPEG)
              <input
                hidden
                type="file"
                accept="image/png,image/jpeg"
                onChange={(e) => {
                  const next = e.target.files?.[0]
                  if (!next) return
                  if (filePreview) URL.revokeObjectURL(filePreview)
                  setFile(next)
                  setFilePreview(URL.createObjectURL(next))
                  setQr(null)
                  setTextFields([])
                }}
              />
            </Button>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={regionMode}
              onChange={(_, v) => v && setRegionMode(v)}
            >
              <ToggleButton value="qr">
                <QrCode2Rounded fontSize="small" className="mr-1" /> QR
              </ToggleButton>
              <ToggleButton value="text">
                <TextFieldsRounded fontSize="small" className="mr-1" /> Matn
              </ToggleButton>
            </ToggleButtonGroup>
            {filePreview ? (
              <CardRegionPicker
                imageUrl={filePreview}
                qr={qr}
                textFields={textFields}
                mode={regionMode}
                selectedTextId={selectedTextId}
                onQrChange={setQr}
                onSelectText={setSelectedTextId}
                allowDraw
                showLiveText
                onTextAdd={(rect) => {
                  const f = newTextField({
                    x: rect.x,
                    y: rect.y,
                    width: rect.width,
                    height: rect.height,
                    label: `Matn ${textFields.length + 1}`,
                  })
                  setTextFields((prev) => [...prev, f])
                  setSelectedTextId(f.id)
                }}
              />
            ) : (
              <div className="rounded-xl border border-dashed py-12 text-center text-slate-500">
                Rasm yuklang
              </div>
            )}
            <Button variant="contained" disabled={saving || !file || !qr} onClick={() => void saveCustom()}>
              {saving ? 'Saqlanmoqda…' : 'Saqlash'}
            </Button>
          </div>
          <div>{textEditor}</div>
        </div>
      )}

      {mode === 'detail' && selected && (
        <div className="grid gap-5 xl:grid-cols-2">
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
            <TextField fullWidth label="Nomi" value={name} onChange={(e) => setName(e.target.value)} />
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p className="mb-2 text-xs font-semibold uppercase text-slate-500">
                Jonli preview (matn darhol chiqadi)
              </p>
              {cardImageUrl && qr ? (
                <CardRegionPicker
                  imageUrl={cardImageUrl}
                  qr={qr}
                  textFields={textFields}
                  mode="text"
                  selectedTextId={selectedTextId}
                  onQrChange={() => undefined}
                  onTextAdd={() => undefined}
                  onSelectText={setSelectedTextId}
                  allowDraw={false}
                  showLiveText
                  maxHeight={360}
                />
              ) : previewUrl ? (
                <img src={previewUrl} alt="preview" className="mx-auto max-h-64 object-contain" />
              ) : (
                <div className="grid h-40 place-items-center text-slate-400">
                  <VisibilityRounded />
                </div>
              )}
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-2">
              <p className="mb-2 text-xs font-semibold uppercase text-slate-500">QR kod</p>
              {qrPreviewUrl ? (
                <img src={qrPreviewUrl} alt="qr" className="mx-auto max-h-48 object-contain" />
              ) : (
                <div className="grid h-28 place-items-center px-4 text-center text-xs text-slate-500">
                  So‘rovnomaga biriktirilgach QR paydo bo‘ladi
                </div>
              )}
            </div>

            <div className="space-y-2 rounded-xl border border-teal-100 bg-teal-50/40 p-3">
              <Typography sx={{ fontWeight: 700 }}>So‘rovnomaga biriktirish</Typography>
              <FormControl fullWidth size="small">
                <InputLabel>So‘rovnoma</InputLabel>
                <Select
                  label="So‘rovnoma"
                  value={attachSurveyId}
                  onChange={(e) => setAttachSurveyId(e.target.value)}
                >
                  {unboundSurveys.map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      {s.title} ({s.slug})
                    </MenuItem>
                  ))}
                  {selected.surveyId && (
                    <MenuItem value={selected.surveyId}>
                      {selected.surveyTitle || selected.surveySlug}
                    </MenuItem>
                  )}
                </Select>
              </FormControl>
              {selected.responseUrl && (
                <p className="break-all text-xs text-slate-600">{selected.responseUrl}</p>
              )}
              <Button size="small" variant="outlined" disabled={saving} onClick={() => void handleAttach()}>
                Biriktirish
              </Button>
            </div>

            <div className="space-y-3 rounded-xl border border-slate-200 p-3">
              <Typography sx={{ fontWeight: 700 }}>A4 joylashuvi</Typography>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={orientation}
                onChange={(_, v) => v && setOrientation(v)}
              >
                <ToggleButton value="portrait">Vertikal</ToggleButton>
                <ToggleButton value="landscape">Gorizontal</ToggleButton>
              </ToggleButtonGroup>
              <div className="grid grid-cols-2 gap-3">
                <FormControl size="small" fullWidth>
                  <InputLabel>Ustunlar</InputLabel>
                  <Select label="Ustunlar" value={cols} onChange={(e) => setCols(Number(e.target.value))}>
                    {GRID.map((n) => (
                      <MenuItem key={n} value={n}>
                        {n}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" fullWidth>
                  <InputLabel>Qatorlar</InputLabel>
                  <Select label="Qatorlar" value={rows} onChange={(e) => setRows(Number(e.target.value))}>
                    {GRID.map((n) => (
                      <MenuItem key={n} value={n}>
                        {n}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </div>

              <A4LayoutPreview
                orientation={orientation}
                cols={cols}
                rows={rows}
                cardImageUrl={previewUrl || cardImageUrl}
                imageWidth={selected.imageWidth}
                imageHeight={selected.imageHeight}
              />

              <p className="text-sm text-slate-600">
                Bitta varaqqa <strong>{perPage}</strong> ta vizitka sig‘adi
                {layout ? ` · ~${layout.cardWidthMm.toFixed(1)}×${layout.cardHeightMm.toFixed(1)} mm` : ''}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="contained" disabled={saving} onClick={() => void saveDetail()}>
                  {saving ? 'Saqlanmoqda…' : 'Sozlamalarni saqlash'}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={pdfLoading ? <CircularProgress size={16} /> : <PictureAsPdfRounded />}
                  disabled={
                    pdfLoading ||
                    !(selected.surveyId || selected.appointmentId || selected.responseUrl || selected.bookingUrl)
                  }
                  onClick={() => void handlePdf()}
                >
                  PDF yuklash
                </Button>
              </div>
              {!(selected.surveyId || selected.appointmentId) && (
                <p className="text-xs text-amber-700">
                  PDF uchun avval so‘rovnoma yoki qabulga biriktiring
                </p>
              )}
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
            <Typography sx={{ fontWeight: 700 }}>Matnlarni tahrirlash</Typography>
            <div className="flex flex-wrap gap-2">
              {textFields.map((f) => (
                <Chip
                  key={f.id}
                  label={f.label}
                  color={selectedTextId === f.id ? 'primary' : 'default'}
                  onClick={() => setSelectedTextId(f.id)}
                />
              ))}
            </div>
            {textEditor || (
              <p className="text-sm text-slate-500">Matn maydonini tanlang</p>
            )}
            <Button variant="outlined" disabled={saving} onClick={() => void saveDetail()}>
              Matnlarni saqlash
            </Button>
          </div>
        </div>
      )}

      <Dialog open={Boolean(toDelete)} onClose={() => !saving && setToDelete(null)}>
        <DialogTitle>Vizitkani o‘chirish</DialogTitle>
        <DialogContent>«{toDelete?.name}» o‘chirilsinmi?</DialogContent>
        <DialogActions>
          <Button onClick={() => setToDelete(null)}>Bekor</Button>
          <Button color="error" disabled={saving} onClick={() => void handleDelete()}>
            O‘chirish
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}
