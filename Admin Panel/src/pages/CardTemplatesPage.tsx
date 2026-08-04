import { useEffect, useState } from 'react'
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
  QrCode2Rounded,
  RefreshRounded,
  TextFieldsRounded,
} from '@mui/icons-material'
import {
  createCardTemplate,
  deleteCardTemplate,
  fetchTemplateImageBlob,
  listCardTemplates,
  updateCardTemplate,
} from '../api/cards'
import type { CardTemplate, CardTextField, QrRegion } from '../api/cardTypes'
import { FONT_OPTIONS, newTextField } from '../api/cardTypes'
import { CardRegionPicker, type RegionMode } from '../components/cards/CardRegionPicker'
import { AuthImage } from '../components/cards/AuthImage'
import { ApiError } from '../api/client'
import { useSnack } from '../ui/SnackProvider'

const headingFont = { fontFamily: "'Outfit', sans-serif" }
const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }

type Mode = 'list' | 'create' | 'detail'

export function CardTemplatesPage() {
  const { showSnack } = useSnack()
  const [items, setItems] = useState<CardTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<Mode>('list')
  const [selected, setSelected] = useState<CardTemplate | null>(null)
  const [templateUrl, setTemplateUrl] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [qr, setQr] = useState<QrRegion | null>(null)
  const [textFields, setTextFields] = useState<CardTextField[]>([])
  const [regionMode, setRegionMode] = useState<RegionMode>('qr')
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [toDelete, setToDelete] = useState<CardTemplate | null>(null)

  const load = async () => {
    try {
      const data = await listCardTemplates()
      setItems(data ?? [])
    } catch (err) {
      showSnack(err instanceof ApiError ? err.message : 'Yuklash xatosi', 'error')
    }
  }

  useEffect(() => {
    setLoading(true)
    void load().finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      if (templateUrl) URL.revokeObjectURL(templateUrl)
    }
  }, [previewUrl, templateUrl])

  const selectedField = textFields.find((f) => f.id === selectedTextId) ?? null

  function patchField(id: string, patch: Partial<CardTextField>) {
    setTextFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)))
  }

  function resetCreate() {
    setName('')
    setFile(null)
    setQr(null)
    setTextFields([])
    setSelectedTextId(null)
    setRegionMode('qr')
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
  }

  async function openDetail(item: CardTemplate) {
    setMode('detail')
    setSelected(item)
    setName(item.name)
    setQr({
      qrX: item.qrX,
      qrY: item.qrY,
      qrWidth: item.qrWidth,
      qrHeight: item.qrHeight,
    })
    setTextFields(item.textFields ?? [])
    setSelectedTextId(null)
    setRegionMode('qr')
    if (templateUrl) URL.revokeObjectURL(templateUrl)
    try {
      const blob = await fetchTemplateImageBlob(item.id)
      setTemplateUrl(URL.createObjectURL(blob))
    } catch {
      showSnack('Rasmni ochib bo‘lmadi', 'error')
    }
  }

  async function handleCreate() {
    if (!file || !qr) {
      showSnack('Rasm va QR joyini belgilang', 'error')
      return
    }
    setSaving(true)
    try {
      const form = new FormData()
      form.append('image', file)
      form.append('name', name || 'Shablon')
      form.append('qrX', String(qr.qrX))
      form.append('qrY', String(qr.qrY))
      form.append('qrWidth', String(qr.qrWidth))
      form.append('qrHeight', String(qr.qrHeight))
      form.append('textFields', JSON.stringify(textFields))
      await createCardTemplate(form)
      showSnack('Shablon saqlandi', 'success')
      resetCreate()
      setMode('list')
      await load()
    } catch (err) {
      showSnack(err instanceof Error ? err.message : 'Saqlash xatosi', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate() {
    if (!selected || !qr) return
    setSaving(true)
    try {
      const updated = await updateCardTemplate(selected.id, {
        name,
        qrX: qr.qrX,
        qrY: qr.qrY,
        qrWidth: qr.qrWidth,
        qrHeight: qr.qrHeight,
        textFields,
      })
      setSelected(updated)
      showSnack('Yangilandi', 'success')
      await load()
    } catch (err) {
      showSnack(err instanceof ApiError ? err.message : 'Yangilash xatosi', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!toDelete) return
    setSaving(true)
    try {
      await deleteCardTemplate(toDelete.id)
      showSnack('O‘chirildi', 'success')
      setToDelete(null)
      if (selected?.id === toDelete.id) {
        setSelected(null)
        setMode('list')
      }
      await load()
    } catch (err) {
      showSnack(err instanceof ApiError ? err.message : 'O‘chirish xatosi', 'error')
    } finally {
      setSaving(false)
    }
  }

  const editorImage = mode === 'create' ? previewUrl : templateUrl

  const textEditor = selectedField && (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
      <Typography sx={{ fontWeight: 700 }}>Matn maydoni sozlamalari</Typography>
      <TextField
        fullWidth
        size="small"
        label="Yorliq"
        value={selectedField.label}
        onChange={(e) => patchField(selectedField.id, { label: e.target.value })}
      />
      <TextField
        fullWidth
        size="small"
        label="Namuna matn"
        value={selectedField.text}
        onChange={(e) => patchField(selectedField.id, { text: e.target.value })}
        helperText="Kompaniya bu maydonga o‘z matnini yozadi"
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
        <Typography variant="caption" color="text.secondary">
          O‘lcham: {selectedField.fontSize}px
        </Typography>
        <Slider
          min={10}
          max={72}
          value={selectedField.fontSize}
          onChange={(_, v) => patchField(selectedField.id, { fontSize: v as number })}
        />
      </div>
      <div className="flex items-center gap-3">
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
        <FormControl size="small" sx={{ minWidth: 120 }}>
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
      <Button
        color="error"
        size="small"
        onClick={() => {
          setTextFields((prev) => prev.filter((f) => f.id !== selectedField.id))
          setSelectedTextId(null)
        }}
      >
        Maydonni o‘chirish
      </Button>
    </div>
  )

  return (
    <div className="space-y-5">
      <motion.section
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className="flex flex-wrap items-center justify-between gap-3 rounded-[1.35rem] bg-gradient-to-br from-slate-900 to-teal-900 px-5 py-6 text-white shadow-lg"
      >
        <div>
          <Typography variant="h4" sx={{ ...headingFont, fontWeight: 800, fontSize: '1.6rem' }}>
            Vizitka shablonlari
          </Typography>
          <p className="mt-1 text-sm text-teal-100/90">
            Rasm yuklang, QR va yozuv joylarini belgilang — kompaniyalar undan foydalanadi
          </p>
        </div>
        <div className="flex gap-2">
          {mode !== 'list' && (
            <Button
              variant="outlined"
              onClick={() => {
                setMode('list')
                resetCreate()
                setSelected(null)
              }}
              sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.4)' }}
            >
              Ro‘yxat
            </Button>
          )}
          {mode === 'list' && (
            <>
              <IconButton onClick={() => void load()} sx={{ color: 'white' }}>
                <RefreshRounded />
              </IconButton>
              <Button
                variant="contained"
                startIcon={<AddRounded />}
                onClick={() => {
                  resetCreate()
                  setMode('create')
                }}
                sx={{ bgcolor: 'white', color: '#0f766e' }}
              >
                Yangi shablon
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
            {items.map((item) => (
              <article
                key={item.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-teal-200"
              >
                <button
                  type="button"
                  className="block w-full text-left"
                  onClick={() => void openDetail(item)}
                >
                  <div className="aspect-[1.6/1] bg-slate-100">
                    <AuthImage
                      path={`/api/v1/card-templates/${item.id}/image`}
                      alt={item.name}
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-slate-900">{item.name}</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.imageWidth}×{item.imageHeight} · {item.textFields?.length ?? 0} matn
                      maydoni
                    </p>
                  </div>
                </button>
                <div className="flex justify-end border-t border-slate-100 px-2 py-1">
                  <Tooltip title="O‘chirish">
                    <IconButton size="small" color="error" onClick={() => setToDelete(item)}>
                      <DeleteOutlineRounded fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </div>
              </article>
            ))}
            {items.length === 0 && (
              <div className="col-span-full rounded-2xl border border-dashed border-slate-200 py-16 text-center text-slate-500">
                Hali shablon yo‘q
              </div>
            )}
          </div>
        ))}

      {(mode === 'create' || mode === 'detail') && (
        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <TextField
              fullWidth
              label="Nomi"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {mode === 'create' && (
              <Button variant="outlined" component="label">
                Rasm yuklash (PNG/JPEG)
                <input
                  type="file"
                  hidden
                  accept="image/png,image/jpeg"
                  onChange={(e) => {
                    const next = e.target.files?.[0]
                    if (!next) return
                    if (previewUrl) URL.revokeObjectURL(previewUrl)
                    setFile(next)
                    setPreviewUrl(URL.createObjectURL(next))
                    setQr(null)
                    setTextFields([])
                  }}
                />
              </Button>
            )}

            <ToggleButtonGroup
              exclusive
              size="small"
              value={regionMode}
              onChange={(_, v) => v && setRegionMode(v)}
            >
              <ToggleButton value="qr">
                <QrCode2Rounded fontSize="small" className="mr-1" /> QR joyi
              </ToggleButton>
              <ToggleButton value="text">
                <TextFieldsRounded fontSize="small" className="mr-1" /> Matn maydoni
              </ToggleButton>
            </ToggleButtonGroup>

            {editorImage ? (
              <CardRegionPicker
                imageUrl={editorImage}
                qr={qr}
                textFields={textFields}
                mode={regionMode}
                selectedTextId={selectedTextId}
                onQrChange={setQr}
                onSelectText={setSelectedTextId}
                onTextAdd={(rect) => {
                  const field = newTextField({
                    x: rect.x,
                    y: rect.y,
                    width: rect.width,
                    height: rect.height,
                    label: `Matn ${textFields.length + 1}`,
                  })
                  setTextFields((prev) => [...prev, field])
                  setSelectedTextId(field.id)
                  setRegionMode('text')
                }}
              />
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center text-slate-500">
                Rasm yuklang
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {textFields.map((f) => (
                <Chip
                  key={f.id}
                  label={f.label}
                  color={selectedTextId === f.id ? 'primary' : 'default'}
                  onClick={() => setSelectedTextId(f.id)}
                  onDelete={() => {
                    setTextFields((prev) => prev.filter((x) => x.id !== f.id))
                    if (selectedTextId === f.id) setSelectedTextId(null)
                  }}
                />
              ))}
            </div>

            <div className="flex gap-2">
              {mode === 'create' ? (
                <Button
                  variant="contained"
                  disabled={saving || !file || !qr}
                  onClick={() => void handleCreate()}
                >
                  {saving ? 'Saqlanmoqda…' : 'Saqlash'}
                </Button>
              ) : (
                <Button
                  variant="contained"
                  disabled={saving || !qr}
                  onClick={() => void handleUpdate()}
                >
                  {saving ? 'Saqlanmoqda…' : 'Yangilash'}
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {textEditor || (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                Matn maydonini tanlang yoki rasmda chizing. Har bir zonada shrift, rang, o‘lcham va
                semizlik sozlanadi.
              </div>
            )}
            {qr && (
              <div className="rounded-2xl border border-teal-100 bg-teal-50/50 p-4 text-sm text-teal-900">
                <p className="font-semibold">QR zonasi</p>
                <p className="mt-1">
                  {qr.qrX}, {qr.qrY} · {qr.qrWidth}×{qr.qrHeight} px
                </p>
                <p className="mt-2 text-xs text-teal-800/80">
                  So‘rovnoma nashr qilinganda bu joyga forma havolasi QR kodi joylanadi.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <Dialog open={Boolean(toDelete)} onClose={() => !saving && setToDelete(null)}>
        <DialogTitle>Shablonni o‘chirish</DialogTitle>
        <DialogContent>
          «{toDelete?.name}» o‘chirilsinmi?
        </DialogContent>
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
