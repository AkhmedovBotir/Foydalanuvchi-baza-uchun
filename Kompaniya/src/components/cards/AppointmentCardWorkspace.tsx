import { useEffect, useState } from 'react'
import {
  Button,
  Chip,
  CircularProgress,
  Dialog,
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
  Typography,
} from '@mui/material'
import {
  AddRounded,
  ArrowBackRounded,
  CloseRounded,
  PictureAsPdfRounded,
  QrCode2Rounded,
  TextFieldsRounded,
  VisibilityRounded,
} from '@mui/icons-material'
import {
  createCustomCard,
  createFromTemplate,
  downloadCardPdf,
  fetchCardBlob,
  getCard,
  getCardLayout,
  listCardTemplates,
  listCards,
  updateCard,
} from '../../api/cards'
import type {
  CardLayout,
  CardTemplate,
  CardTextField,
  CompanyCard,
  QrRegion,
} from '../../api/cardTypes'
import { FONT_OPTIONS, hasLayoutConfig, newTextField } from '../../api/cardTypes'
import { CardRegionPicker, type RegionMode } from './CardRegionPicker'
import { A4LayoutPreview } from './A4LayoutPreview'
import { AuthImage } from './AuthImage'
import { attachCardToAppointment } from '../../api/appointments'
import type { AppointmentService } from '../../api/appointmentTypes'
import { ApiError } from '../../api/client'
import { useSnack } from '../../ui/SnackProvider'

const headingFont = { fontFamily: "'Outfit', sans-serif" }
const GRID = Array.from({ length: 12 }, (_, i) => i + 1)

type Mode = 'home' | 'pick-existing' | 'from-template' | 'custom' | 'edit'

type Props = {
  open: boolean
  appointment: AppointmentService | null
  onClose: () => void
  /** Qabul ro‘yxatini yangilash (cardId o‘zgarganda) */
  onLinked: () => void | Promise<void>
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function AppointmentCardWorkspace({ open, appointment, onClose, onLinked }: Props) {
  const { showSnack } = useSnack()
  const [mode, setMode] = useState<Mode>('home')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)

  const [templates, setTemplates] = useState<CardTemplate[]>([])
  const [existingCards, setExistingCards] = useState<CompanyCard[]>([])
  const [pickedTemplate, setPickedTemplate] = useState<CardTemplate | null>(null)
  const [templateImageUrl, setTemplateImageUrl] = useState<string | null>(null)

  const [selected, setSelected] = useState<CompanyCard | null>(null)
  const [name, setName] = useState('')
  const [textFields, setTextFields] = useState<CardTextField[]>([])
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null)
  const [qr, setQr] = useState<QrRegion | null>(null)

  const [file, setFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [regionMode, setRegionMode] = useState<RegionMode>('qr')

  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape')
  const [cols, setCols] = useState(3)
  const [rows, setRows] = useState(3)
  const [layout, setLayout] = useState<CardLayout | null>(null)

  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [qrPreviewUrl, setQrPreviewUrl] = useState<string | null>(null)
  const [cardImageUrl, setCardImageUrl] = useState<string | null>(null)

  const selectedField = textFields.find((f) => f.id === selectedTextId) ?? null
  const perPage = cols * rows

  function resetTransient() {
    setPickedTemplate(null)
    setSelected(null)
    setName('')
    setTextFields([])
    setSelectedTextId(null)
    setQr(null)
    setFile(null)
    setRegionMode('qr')
    setOrientation('landscape')
    setCols(3)
    setRows(3)
    setLayout(null)
    if (templateImageUrl) URL.revokeObjectURL(templateImageUrl)
    if (filePreview) URL.revokeObjectURL(filePreview)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    if (qrPreviewUrl) URL.revokeObjectURL(qrPreviewUrl)
    if (cardImageUrl) URL.revokeObjectURL(cardImageUrl)
    setTemplateImageUrl(null)
    setFilePreview(null)
    setPreviewUrl(null)
    setQrPreviewUrl(null)
    setCardImageUrl(null)
  }

  useEffect(() => {
    if (!open || !appointment) return
    let cancelled = false
    setLoading(true)
    resetTransient()

    void (async () => {
      try {
        const [tpls, cards] = await Promise.all([
          listCardTemplates().catch(() => [] as CardTemplate[]),
          listCards().catch(() => [] as CompanyCard[]),
        ])
        if (cancelled) return
        setTemplates(tpls ?? [])
        setExistingCards(cards ?? [])

        if (appointment.cardId) {
          const card = await getCard(appointment.cardId)
          if (cancelled) return
          await openEdit(card, false)
        } else {
          setMode('home')
        }
      } catch (e) {
        if (!cancelled) {
          showSnack(e instanceof ApiError ? e.message : 'Vizitka yuklanmadi', 'error')
          setMode('home')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, appointment?.id, appointment?.cardId])

  useEffect(() => {
    return () => {
      if (templateImageUrl) URL.revokeObjectURL(templateImageUrl)
      if (filePreview) URL.revokeObjectURL(filePreview)
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      if (qrPreviewUrl) URL.revokeObjectURL(qrPreviewUrl)
      if (cardImageUrl) URL.revokeObjectURL(cardImageUrl)
    }
  }, [templateImageUrl, filePreview, previewUrl, qrPreviewUrl, cardImageUrl])

  function patchField(id: string, patch: Partial<CardTextField>) {
    setTextFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)))
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

  async function ensureLinked(cardId: string) {
    if (!appointment) return
    if (appointment.cardId === cardId) return
    await attachCardToAppointment(appointment.id, cardId)
    await onLinked()
  }

  async function openEdit(card: CompanyCard, link = true) {
    if (link) {
      try {
        await ensureLinked(card.id)
      } catch (e) {
        showSnack(e instanceof Error ? e.message : 'Biriktirish xatosi', 'error')
        return
      }
    }
    setSelected(card)
    setName(card.name)
    setTextFields(card.textFields ?? [])
    setSelectedTextId(card.textFields?.[0]?.id ?? null)
    setQr({
      qrX: card.qrX,
      qrY: card.qrY,
      qrWidth: card.qrWidth,
      qrHeight: card.qrHeight,
    })
    setOrientation((card.orientation as 'portrait' | 'landscape') || 'landscape')
    setCols(card.cols > 0 ? card.cols : 3)
    setRows(card.rows > 0 ? card.rows : 3)
    setLayout(null)
    setMode('edit')
    await refreshPreviews(card.id)
    if (hasLayoutConfig(card)) {
      try {
        setLayout(await getCardLayout(card.id))
      } catch {
        setLayout(null)
      }
    }
    // refresh card dto (bookingUrl)
    try {
      const fresh = await getCard(card.id)
      setSelected(fresh)
    } catch {
      /* keep */
    }
  }

  async function startFromTemplate(t: CardTemplate) {
    setPickedTemplate(t)
    setName(`${appointment?.title || t.name} vizitkasi`)
    setTextFields((t.textFields ?? []).map((f) => ({ ...f, text: f.text || '' })))
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
    if (!pickedTemplate || !appointment) return
    setSaving(true)
    try {
      const card = await createFromTemplate({
        templateId: pickedTemplate.id,
        name: name || pickedTemplate.name,
        textFields,
      })
      await ensureLinked(card.id)
      showSnack('Vizitka saqlandi va qabulga ulandi', 'success')
      setPickedTemplate(null)
      if (templateImageUrl) URL.revokeObjectURL(templateImageUrl)
      setTemplateImageUrl(null)
      setExistingCards(await listCards().catch(() => []))
      await openEdit(card, false)
    } catch (e) {
      showSnack(e instanceof Error ? e.message : 'Xato', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function saveCustom() {
    if (!file || !qr || !appointment) {
      showSnack('Rasm va QR joyini belgilang', 'error')
      return
    }
    setSaving(true)
    try {
      const form = new FormData()
      form.append('image', file)
      form.append('name', name || `${appointment.title} vizitkasi`)
      form.append('qrX', String(qr.qrX))
      form.append('qrY', String(qr.qrY))
      form.append('qrWidth', String(qr.qrWidth))
      form.append('qrHeight', String(qr.qrHeight))
      form.append('textFields', JSON.stringify(textFields))
      const card = await createCustomCard(form)
      await ensureLinked(card.id)
      showSnack('Vizitka saqlandi va qabulga ulandi', 'success')
      setFile(null)
      if (filePreview) URL.revokeObjectURL(filePreview)
      setFilePreview(null)
      setExistingCards(await listCards().catch(() => []))
      await openEdit(card, false)
    } catch (e) {
      showSnack(e instanceof Error ? e.message : 'Xato', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function saveEdit() {
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
      showSnack('Vizitka saqlandi', 'success')
      await ensureLinked(updated.id)
      await refreshPreviews(updated.id)
      try {
        setLayout(await getCardLayout(updated.id))
      } catch {
        setLayout(null)
      }
      await onLinked()
    } catch (e) {
      showSnack(e instanceof ApiError ? e.message : 'Xato', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handlePdf() {
    if (!selected || !appointment || !qr) return
    setPdfLoading(true)
    try {
      await updateCard(selected.id, {
        orientation,
        cols,
        rows,
        name,
        textFields,
        qrX: qr.qrX,
        qrY: qr.qrY,
        qrWidth: qr.qrWidth,
        qrHeight: qr.qrHeight,
      })
      await ensureLinked(selected.id)
      const copies = cols * rows
      const blob = await downloadCardPdf(selected.id, copies)
      downloadBlob(blob, `${selected.name || 'vizitka'}.pdf`)
      showSnack('PDF yuklab olindi', 'success')
      await refreshPreviews(selected.id)
    } catch (e) {
      showSnack(e instanceof Error ? e.message : 'PDF xatosi', 'error')
    } finally {
      setPdfLoading(false)
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

  const canGoBack = mode !== 'home' && mode !== 'edit' && !appointment?.cardId
  const editHasBack = mode === 'edit' && !appointment?.cardId

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg" scroll="paper">
      <DialogTitle
        sx={{
          ...headingFont,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          pr: 1,
        }}
      >
        <span className="min-w-0 truncate">
          Vizitka — {appointment?.title || ''}
        </span>
        <IconButton onClick={onClose} size="small" aria-label="Yopish">
          <CloseRounded />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers className="!px-4 !py-4 sm:!px-5">
        {loading ? (
          <div className="flex justify-center py-16">
            <CircularProgress />
          </div>
        ) : (
          <div className="space-y-4">
            {(canGoBack || editHasBack) && (
              <Button
                size="small"
                startIcon={<ArrowBackRounded />}
                onClick={() => {
                  if (mode === 'from-template' && pickedTemplate) {
                    setPickedTemplate(null)
                    setMode('from-template')
                    return
                  }
                  setMode('home')
                  setSelected(null)
                }}
              >
                Orqaga
              </Button>
            )}

            {appointment?.bookingUrl && (
              <p className="break-all rounded-xl bg-teal-50 px-3 py-2 text-xs text-teal-900">
                QR → {appointment.bookingUrl}
              </p>
            )}

            {/* HOME */}
            {mode === 'home' && (
              <div className="grid gap-3 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => {
                    setPickedTemplate(null)
                    setMode('from-template')
                  }}
                  className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-teal-400"
                >
                  <p className="font-semibold text-slate-900">Admin shablonidan</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Tayyor dizayn + matnlarni to‘ldirish
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setName(appointment ? `${appointment.title} vizitkasi` : '')
                    setTextFields([])
                    setQr(null)
                    setFile(null)
                    setRegionMode('qr')
                    setMode('custom')
                  }}
                  className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-teal-400"
                >
                  <p className="font-semibold text-slate-900">O‘z vizitkam</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Rasm yuklash, QR va matn joylash
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('pick-existing')}
                  className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-teal-400"
                >
                  <p className="font-semibold text-slate-900">Mavjud vizitka</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Saqlanganlardan tanlash va tahrirlash
                  </p>
                </button>
              </div>
            )}

            {/* PICK EXISTING */}
            {mode === 'pick-existing' && (
              <div className="grid gap-3 sm:grid-cols-2">
                {existingCards.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => void openEdit(c, true)}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:border-teal-300"
                  >
                    <div className="aspect-[1.6/1] bg-slate-50">
                      <AuthImage
                        path={`/api/v1/company/cards/${c.id}/preview`}
                        alt={c.name}
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <div className="p-3">
                      <p className="font-semibold">{c.name}</p>
                      <p className="text-xs text-slate-500">
                        {c.source === 'template' ? 'Shablon' : 'Shaxsiy'}
                      </p>
                    </div>
                  </button>
                ))}
                {existingCards.length === 0 && (
                  <p className="col-span-full text-slate-500">Hali saqlangan vizitka yo‘q</p>
                )}
              </div>
            )}

            {/* TEMPLATE LIST */}
            {mode === 'from-template' && !pickedTemplate && (
              <div className="grid gap-3 sm:grid-cols-2">
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
                  <p className="col-span-full text-slate-500">
                    Admin hali vizitka shabloni yaratmagan
                  </p>
                )}
              </div>
            )}

            {/* TEMPLATE EDIT */}
            {mode === 'from-template' && pickedTemplate && (
              <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-3">
                  <TextField
                    fullWidth
                    label="Vizitka nomi"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
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
                  <Button
                    variant="contained"
                    disabled={saving}
                    onClick={() => void saveFromTemplate()}
                  >
                    {saving ? 'Saqlanmoqda…' : 'Saqlash va ulash'}
                  </Button>
                </div>
                <div>
                  {textEditor || (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
                      Matn maydonini tanlab to‘ldiring
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* CUSTOM */}
            {mode === 'custom' && (
              <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-3">
                  <TextField
                    fullWidth
                    label="Nomi"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <Button variant="outlined" component="label" startIcon={<AddRounded />}>
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
                  <Button
                    variant="contained"
                    disabled={saving || !file || !qr}
                    onClick={() => void saveCustom()}
                  >
                    {saving ? 'Saqlanmoqda…' : 'Saqlash va ulash'}
                  </Button>
                </div>
                <div>{textEditor}</div>
              </div>
            )}

            {/* EDIT + A4 + PDF */}
            {mode === 'edit' && selected && (
              <div className="grid gap-4 xl:grid-cols-2">
                <div className="space-y-4">
                  <TextField
                    fullWidth
                    label="Nomi"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase text-slate-500">
                      Jonli preview
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
                        maxHeight={320}
                      />
                    ) : previewUrl ? (
                      <img
                        src={previewUrl}
                        alt="preview"
                        className="mx-auto max-h-64 object-contain"
                      />
                    ) : (
                      <div className="grid h-40 place-items-center text-slate-400">
                        <VisibilityRounded />
                      </div>
                    )}
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-2">
                    <p className="mb-2 text-xs font-semibold uppercase text-slate-500">QR kod</p>
                    {qrPreviewUrl ? (
                      <img
                        src={qrPreviewUrl}
                        alt="qr"
                        className="mx-auto max-h-40 object-contain"
                      />
                    ) : (
                      <p className="px-3 py-6 text-center text-xs text-slate-500">
                        Qabulga ulanganidan keyin QR paydo bo‘ladi
                      </p>
                    )}
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
                        <Select
                          label="Ustunlar"
                          value={cols}
                          onChange={(e) => setCols(Number(e.target.value))}
                        >
                          {GRID.map((n) => (
                            <MenuItem key={n} value={n}>
                              {n}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <FormControl size="small" fullWidth>
                        <InputLabel>Qatorlar</InputLabel>
                        <Select
                          label="Qatorlar"
                          value={rows}
                          onChange={(e) => setRows(Number(e.target.value))}
                        >
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
                      Bitta varaqqa <strong>{perPage}</strong> ta
                      {layout
                        ? ` · ~${layout.cardWidthMm.toFixed(1)}×${layout.cardHeightMm.toFixed(1)} mm`
                        : ''}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="contained" disabled={saving} onClick={() => void saveEdit()}>
                        {saving ? 'Saqlanmoqda…' : 'Saqlash'}
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={
                          pdfLoading ? <CircularProgress size={16} /> : <PictureAsPdfRounded />
                        }
                        disabled={pdfLoading || saving}
                        onClick={() => void handlePdf()}
                      >
                        PDF yuklash (A4)
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
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
                  <Button variant="outlined" disabled={saving} onClick={() => void saveEdit()}>
                    Matnlarni saqlash
                  </Button>
                  {(selected.bookingUrl || appointment?.bookingUrl) && (
                    <p className="break-all text-xs text-slate-500">
                      Havola: {selected.bookingUrl || appointment?.bookingUrl}
                    </p>
                  )}
                  <Button
                    size="small"
                    onClick={() => {
                      setMode('home')
                      setSelected(null)
                    }}
                  >
                    Boshqa vizitka tanlash / yaratish
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
