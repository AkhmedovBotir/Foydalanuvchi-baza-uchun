import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  AccountBalanceWalletRounded,
  AddRounded,
  DeleteOutlineRounded,
  EditRounded,
  PaymentsRounded,
  RefreshRounded,
  AccountTreeRounded,
  DragIndicatorRounded,
} from '@mui/icons-material'
import {
  CATEGORY_LABELS,
  ROLE_OPTIONS,
  createScheme,
  defaultSchemeLines,
  deleteScheme,
  getFinanceSummary,
  listAllocations,
  listIncomes,
  listSchemes,
  newLineId,
  payAllocation,
  payBatch,
  sumPct,
  updateScheme,
  type FinanceAllocation,
  type FinanceIncome,
  type FinanceScheme,
  type FinanceSummary,
  type SchemeLine,
  type UpsertSchemePayload,
} from '../api/finance'
import { listDoctors, type Doctor } from '../api/staff'
import { listReferrals, type Referral } from '../api/referrals'
import { ApiError } from '../api/client'
import { useSnack } from '../ui/SnackProvider'
import { useConfirm } from '../ui/ConfirmProvider'

const headingFont = { fontFamily: "'Outfit', sans-serif" }

const LINE_COLORS = [
  '#0f766e',
  '#0369a1',
  '#b45309',
  '#be123c',
  '#4d7c0f',
  '#7c3aed',
  '#0e7490',
  '#c2410c',
]

function money(n?: number) {
  if (n == null) return '—'
  return new Intl.NumberFormat('uz-UZ').format(Math.round(n * 100) / 100) + ' so‘m'
}

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function pctNear100(n: number) {
  return Math.abs(n - 100) <= 0.05
}

function emptyForm(): UpsertSchemePayload {
  return {
    name: '',
    description: '',
    isActive: true,
    lines: defaultSchemeLines(),
  }
}

function schemeToForm(s: FinanceScheme): UpsertSchemePayload {
  const lines =
    s.lines?.length > 0
      ? structuredClone(s.lines)
      : defaultSchemeLines()
  return {
    name: s.name,
    description: s.description,
    isActive: s.isActive,
    lines: lines.map(ensureChildren),
  }
}

function ensureChildren(line: SchemeLine): SchemeLine {
  return {
    ...line,
    children: (line.children || []).map(ensureChildren),
  }
}

function updateAtPath(
  lines: SchemeLine[],
  path: number[],
  updater: (line: SchemeLine) => SchemeLine,
): SchemeLine[] {
  if (path.length === 0) return lines
  const [head, ...rest] = path
  return lines.map((line, i) => {
    if (i !== head) return line
    if (rest.length === 0) return updater(line)
    return {
      ...line,
      children: updateAtPath(line.children || [], rest, updater),
    }
  })
}

function removeAtPath(lines: SchemeLine[], path: number[]): SchemeLine[] {
  if (path.length === 0) return lines
  if (path.length === 1) return lines.filter((_, i) => i !== path[0])
  const [head, ...rest] = path
  return lines.map((line, i) => {
    if (i !== head) return line
    return { ...line, children: removeAtPath(line.children || [], rest) }
  })
}

function insertAfterPath(lines: SchemeLine[], path: number[], item: SchemeLine): SchemeLine[] {
  if (path.length === 0) return [...lines, item]
  if (path.length === 1) {
    const idx = path[0]
    const next = [...lines]
    next.splice(idx + 1, 0, item)
    return next
  }
  const [head, ...rest] = path
  return lines.map((line, i) => {
    if (i !== head) return line
    return { ...line, children: insertAfterPath(line.children || [], rest, item) }
  })
}

function addChildAtPath(lines: SchemeLine[], path: number[], item: SchemeLine): SchemeLine[] {
  return updateAtPath(lines, path, (line) => ({
    ...line,
    children: [...(line.children || []), item],
  }))
}

function RoleBadge({ role }: { role: string }) {
  const label = ROLE_OPTIONS.find((r) => r.value === role)?.label || role
  return (
    <Chip
      size="small"
      label={label}
      sx={{
        height: 22,
        fontSize: '0.7rem',
        fontWeight: 600,
        bgcolor: 'rgba(15,118,110,0.08)',
        color: '#0f766e',
        border: 'none',
      }}
    />
  )
}

function SplitBar({ lines }: { lines: SchemeLine[] }) {
  const total = sumPct(lines) || 1
  return (
    <Box
      sx={{
        display: 'flex',
        height: 10,
        borderRadius: 999,
        overflow: 'hidden',
        bgcolor: 'rgba(15,23,42,0.06)',
      }}
    >
      {lines.map((l, i) => (
        <Tooltip key={l.id || i} title={`${l.label}: ${l.pct}%`}>
          <Box
            sx={{
              width: `${Math.max(0, (l.pct / total) * 100)}%`,
              bgcolor: LINE_COLORS[i % LINE_COLORS.length],
              minWidth: l.pct > 0 ? 4 : 0,
              transition: 'width 0.25s ease',
            }}
          />
        </Tooltip>
      ))}
    </Box>
  )
}

export function FinancePage() {
  const { showSnack } = useSnack()
  const confirm = useConfirm()
  const [tab, setTab] = useState(0)
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<FinanceSummary | null>(null)
  const [schemes, setSchemes] = useState<FinanceScheme[]>([])
  const [incomes, setIncomes] = useState<FinanceIncome[]>([])
  const [allocs, setAllocs] = useState<FinanceAllocation[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [date, setDate] = useState(todayISO())
  const [statusFilter, setStatusFilter] = useState('pending')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<UpsertSchemePayload>(emptyForm())
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const [sum, sch, docs, refs, inc, al] = await Promise.all([
        getFinanceSummary(),
        listSchemes(),
        listDoctors().catch(() => [] as Doctor[]),
        listReferrals().catch(() => [] as Referral[]),
        listIncomes({ date, page: 1, limit: 100 }),
        listAllocations({
          date,
          status: statusFilter || undefined,
          category: categoryFilter || undefined,
          page: 1,
          limit: 200,
        }),
      ])
      setSummary(sum)
      setSchemes(sch ?? [])
      setDoctors(docs ?? [])
      setReferrals(refs ?? [])
      setIncomes(inc?.data ?? [])
      setAllocs(al?.data ?? [])
      setSelected([])
    } catch (e) {
      showSnack(e instanceof ApiError ? e.message : 'Yuklashda xato', 'error')
    }
  }, [categoryFilter, date, showSnack, statusFilter])

  useEffect(() => {
    setLoading(true)
    void load().finally(() => setLoading(false))
  }, [load])

  const topSum = useMemo(() => sumPct(form.lines), [form.lines])

  const validateNested = (lines: SchemeLine[]): string | null => {
    for (const line of lines) {
      const kids = line.children || []
      if (kids.length > 0) {
        const s = sumPct(kids)
        if (!pctNear100(s)) {
          return `"${line.label}" ichida foizlar ${s.toFixed(1)}% (100 bo‘lishi kerak)`
        }
        const nested = validateNested(kids)
        if (nested) return nested
      }
    }
    return null
  }

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm())
    setDialogOpen(true)
  }

  const openEdit = (s: FinanceScheme) => {
    setEditingId(s.id)
    setForm(schemeToForm(s))
    setDialogOpen(true)
  }

  const setLines = (lines: SchemeLine[]) => setForm((f) => ({ ...f, lines }))

  const saveScheme = async () => {
    if (!form.name.trim()) {
      showSnack('Nomi majburiy', 'warning')
      return
    }
    if (!pctNear100(topSum)) {
      showSnack(`Asosiy foizlar 100 bo‘lishi kerak (hozir ${topSum.toFixed(1)})`, 'warning')
      return
    }
    const nestedErr = validateNested(form.lines)
    if (nestedErr) {
      showSnack(nestedErr, 'warning')
      return
    }
    setSaving(true)
    try {
      const payload: UpsertSchemePayload = {
        name: form.name.trim(),
        description: form.description || '',
        isActive: Boolean(form.isActive),
        lines: form.lines,
      }
      if (editingId) {
        await updateScheme(editingId, payload)
        showSnack('Sxema yangilandi', 'success')
      } else {
        await createScheme(payload)
        showSnack('Sxema yaratildi', 'success')
      }
      setDialogOpen(false)
      await load()
    } catch (e) {
      showSnack(e instanceof ApiError ? e.message : 'Saqlashda xato', 'error')
    } finally {
      setSaving(false)
    }
  }

  const removeScheme = async (id: string) => {
    const ok = await confirm({
      title: 'Sxemani o‘chirish',
      message: 'Sxema o‘chirilsinmi? Bu amalni qaytarib bo‘lmaydi.',
      confirmLabel: 'O‘chirish',
      danger: true,
    })
    if (!ok) return
    try {
      await deleteScheme(id)
      showSnack('O‘chirildi', 'success')
      await load()
    } catch (e) {
      showSnack(e instanceof ApiError ? e.message : 'Xato', 'error')
    }
  }

  const toggleSelect = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const payoutOne = async (id: string) => {
    try {
      await payAllocation(id)
      showSnack('To‘lov belgilandi', 'success')
      await load()
    } catch (e) {
      showSnack(e instanceof ApiError ? e.message : 'Xato', 'error')
    }
  }

  const payoutSelected = async () => {
    if (selected.length === 0) return
    try {
      await payBatch(selected)
      showSnack(`${selected.length} ta to‘lov belgilandi`, 'success')
      await load()
    } catch (e) {
      showSnack(e instanceof ApiError ? e.message : 'Xato', 'error')
    }
  }

  const blankLine = (partial?: Partial<SchemeLine>): SchemeLine => ({
    id: newLineId(),
    label: 'Yangi taqsimot',
    pct: 0,
    role: 'custom',
    children: [],
    ...partial,
  })

  const addTopLine = () => {
    setLines([...form.lines, blankLine()])
  }

  const addDoctorShare = (path: number[]) => {
    const free = doctors.find((d) => {
      const line = getLineAt(form.lines, path)
      return !line?.children?.some((c) => c.doctorId === d.id)
    })
    if (!free) {
      showSnack('Barcha shifokorlar qo‘shilgan yoki ro‘yxat bo‘sh', 'info')
      return
    }
    setLines(
      addChildAtPath(form.lines, path, {
        id: newLineId(),
        label: free.name,
        pct: 0,
        role: 'doctor_share',
        doctorId: free.id,
        children: [],
      }),
    )
  }

  const getLineAt = (lines: SchemeLine[], path: number[]): SchemeLine | null => {
    let cur: SchemeLine[] = lines
    let node: SchemeLine | null = null
    for (const idx of path) {
      node = cur[idx] || null
      if (!node) return null
      cur = node.children || []
    }
    return node
  }

  const renderLineEditor = (line: SchemeLine, path: number[], depth: number) => {
    const kids = line.children || []
    const childSum = sumPct(kids)
    const isDoctor = line.role === 'doctor'
    const color = LINE_COLORS[path[0] % LINE_COLORS.length]

    return (
      <Box key={line.id || path.join('-')} sx={{ ml: depth * 1.5 }}>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'flex-start',
            gap: 1,
            p: 1.25,
            mb: 1,
            borderRadius: 2.5,
            border: '1px solid',
            borderColor: depth === 0 ? 'rgba(15,118,110,0.18)' : 'rgba(15,23,42,0.08)',
            bgcolor: depth === 0 ? 'rgba(255,255,255,0.9)' : 'rgba(248,250,252,0.95)',
            boxShadow: depth === 0 ? '0 8px 24px rgba(15,23,42,0.04)' : 'none',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {depth === 0 && (
            <Box
              sx={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: 4,
                bgcolor: color,
              }}
            />
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.disabled', pt: 1 }}>
            <DragIndicatorRounded fontSize="small" />
          </Box>
          <TextField
            size="small"
            label="Nomi"
            value={line.label}
            onChange={(e) =>
              setLines(
                updateAtPath(form.lines, path, (l) => ({ ...l, label: e.target.value })),
              )
            }
            sx={{ minWidth: 140, flex: 1.2 }}
          />
          <TextField
            size="small"
            type="number"
            label="%"
            value={line.pct}
            onChange={(e) =>
              setLines(
                updateAtPath(form.lines, path, (l) => ({
                  ...l,
                  pct: Number(e.target.value),
                })),
              )
            }
            sx={{ width: 96 }}
            slotProps={{ htmlInput: { min: 0, max: 100, step: 0.1 } }}
          />
          {line.role !== 'doctor_share' && line.role !== 'referral_share' && (
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Tur</InputLabel>
              <Select
                label="Tur"
                value={line.role || 'custom'}
                onChange={(e) => {
                  const role = e.target.value
                  setLines(
                    updateAtPath(form.lines, path, (l) => ({
                      ...l,
                      role,
                      onlyIfReferral: role === 'referral' ? true : l.onlyIfReferral,
                      children:
                        role === 'owner' && (!l.children || l.children.length === 0)
                          ? [
                              blankLine({
                                label: 'Savdo (bank)',
                                pct: 60,
                                role: 'owner_sales',
                              }),
                              blankLine({
                                label: 'Omonat',
                                pct: 40,
                                role: 'owner_deposit',
                              }),
                            ]
                          : l.children,
                    })),
                  )
                }}
              >
                {ROLE_OPTIONS.map((r) => (
                  <MenuItem key={r.value} value={r.value}>
                    {r.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          {line.role === 'doctor_share' && (
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Shifokor</InputLabel>
              <Select
                label="Shifokor"
                value={line.doctorId || ''}
                onChange={(e) => {
                  const id = e.target.value
                  const doc = doctors.find((d) => d.id === id)
                  setLines(
                    updateAtPath(form.lines, path, (l) => ({
                      ...l,
                      doctorId: id,
                      label: doc?.name || l.label,
                      role: 'doctor_share',
                    })),
                  )
                }}
              >
                {doctors.map((d) => (
                  <MenuItem key={d.id} value={d.id}>
                    {d.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          {(line.role === 'referral' || line.onlyIfReferral) && (
            <Chip size="small" label="Faqat referalli" color="info" variant="outlined" />
          )}
          <Tooltip title="Shu qatordan keyin yangi taqsimot">
            <IconButton
              size="small"
              onClick={() =>
                setLines(insertAfterPath(form.lines, path, blankLine({ pct: 0 })))
              }
            >
              <AddRounded fontSize="small" />
            </IconButton>
          </Tooltip>
          {line.role !== 'doctor_share' && line.role !== 'referral_share' && (
            <Tooltip title="Ichida bo‘linish qo‘shish">
              <IconButton
                size="small"
                color="primary"
                onClick={() => {
                  if (isDoctor) {
                    const free = doctors.find((d) => !kids.some((c) => c.doctorId === d.id))
                    if (!free) {
                      showSnack('Barcha shifokorlar qo‘shilgan yoki ro‘yxat bo‘sh', 'info')
                      return
                    }
                    setLines(
                      addChildAtPath(form.lines, path, {
                        id: newLineId(),
                        label: free.name,
                        pct: kids.length === 0 ? 100 : 0,
                        role: 'doctor_share',
                        doctorId: free.id,
                        children: [],
                      }),
                    )
                    return
                  }
                  setLines(
                    addChildAtPath(
                      form.lines,
                      path,
                      blankLine({
                        label: 'Ichki qism',
                        role: 'custom',
                        pct: kids.length === 0 ? 100 : 0,
                      }),
                    ),
                  )
                }}
              >
                <AccountTreeRounded fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {isDoctor && (
            <Button size="small" onClick={() => addDoctorShare(path)} sx={{ textTransform: 'none' }}>
              + Shifokor
            </Button>
          )}
          <IconButton size="small" color="error" onClick={() => setLines(removeAtPath(form.lines, path))}>
            <DeleteOutlineRounded fontSize="small" />
          </IconButton>
        </Box>

        {kids.length > 0 && (
          <Box
            sx={{
              ml: 1,
              pl: 1.5,
              borderLeft: '2px dashed',
              borderColor: 'rgba(15,118,110,0.25)',
              mb: 1.5,
            }}
          >
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                mb: 0.75,
                fontWeight: 700,
                color: pctNear100(childSum) ? 'success.main' : 'warning.main',
              }}
            >
              {line.label} ichida: {childSum.toFixed(1)}% / 100%
            </Typography>
            {isDoctor && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                To‘lovda biriktirilgan shifokor bo‘lsa — shifokor poolining 100% o‘shanga. Aks holda
                quyidagi ulushlar.
              </Typography>
            )}
            {kids.map((child, idx) => renderLineEditor(child, [...path, idx], depth + 1))}
            <Button
              size="small"
              startIcon={<AddRounded />}
              onClick={() => {
                if (isDoctor) {
                  const free = doctors.find((d) => !kids.some((c) => c.doctorId === d.id))
                  if (!free) {
                    showSnack('Barcha shifokorlar qo‘shilgan yoki ro‘yxat bo‘sh', 'info')
                    return
                  }
                  setLines(
                    addChildAtPath(form.lines, path, {
                      id: newLineId(),
                      label: free.name,
                      pct: 0,
                      role: 'doctor_share',
                      doctorId: free.id,
                      children: [],
                    }),
                  )
                  return
                }
                setLines(
                  addChildAtPath(
                    form.lines,
                    path,
                    blankLine({ role: 'custom', label: 'Ichki qism' }),
                  ),
                )
              }}
              sx={{ textTransform: 'none', mb: 1 }}
            >
              Ichki taqsimot
            </Button>
          </Box>
        )}
      </Box>
    )
  }

  if (loading && !summary) {
    return (
      <Box className="grid min-h-[40vh] place-items-center">
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Stack spacing={2.5}>
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[1.5rem] px-5 py-6 text-white sm:px-7"
        style={{
          background:
            'radial-gradient(1200px 400px at 10% -20%, rgba(45,212,191,0.35), transparent), linear-gradient(135deg, #0b1f1c 0%, #0f766e 55%, #115e59 100%)',
        }}
      >
        <div className="relative z-[1] flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Typography
              variant="h4"
              sx={{ ...headingFont, fontWeight: 800, fontSize: { xs: '1.4rem', sm: '1.75rem' } }}
            >
              Moliya
            </Typography>
            <Typography className="!mt-2 !max-w-xl !text-[0.9rem] !text-teal-50/85">
              Kunlik kirimni moslashuvchan taqsimot sxemalari bo‘yicha bo‘ling — foiz, ichki
              bo‘linish va to‘lovlar bitta joyda.
            </Typography>
          </div>
          <Button
            variant="outlined"
            startIcon={<RefreshRounded />}
            onClick={() => void load()}
            sx={{ borderColor: 'rgba(255,255,255,0.35)', color: 'white', textTransform: 'none' }}
          >
            Yangilash
          </Button>
        </div>
      </motion.section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: 'Bugungi kirim', value: summary?.todayIncome },
          { label: 'Bugun kutilmoqda', value: summary?.todayPending },
          { label: 'Bugun to‘langan', value: summary?.todayPaidOut },
          { label: 'Jami kutilmoqda', value: summary?.pendingTotal },
          { label: 'Jami to‘langan', value: summary?.paidOutTotal },
        ].map((c) => (
          <Box
            key={c.label}
            className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80"
          >
            <Box className="mb-2 inline-flex rounded-lg bg-teal-50 p-1.5 text-teal-700">
              <AccountBalanceWalletRounded fontSize="small" />
            </Box>
            <Typography variant="h6" sx={{ ...headingFont, fontWeight: 800, fontSize: '1.05rem' }}>
              {money(c.value)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {c.label}
            </Typography>
          </Box>
        ))}
      </div>

      <Box className="rounded-[1.25rem] bg-white shadow-sm ring-1 ring-slate-200/80">
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable">
          <Tab label="To‘lovlar" sx={{ textTransform: 'none', fontWeight: 700 }} />
          <Tab label="Kirimlar" sx={{ textTransform: 'none', fontWeight: 700 }} />
          <Tab label="Bo‘linish sxemalari" sx={{ textTransform: 'none', fontWeight: 700 }} />
        </Tabs>
      </Box>

      {tab === 0 && (
        <Stack spacing={2}>
          <Box className="flex flex-wrap items-end gap-2 rounded-2xl bg-white p-3 ring-1 ring-slate-200/80">
            <TextField
              type="date"
              size="small"
              label="Sana"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Holat</InputLabel>
              <Select
                label="Holat"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="">Barchasi</MenuItem>
                <MenuItem value="pending">Kutilmoqda</MenuItem>
                <MenuItem value="paid">To‘langan</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Tur</InputLabel>
              <Select
                label="Tur"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <MenuItem value="">Barchasi</MenuItem>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <MenuItem key={k} value={k}>
                    {v}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="contained"
              startIcon={<PaymentsRounded />}
              disabled={selected.length === 0}
              onClick={() => void payoutSelected()}
              sx={{ textTransform: 'none', fontWeight: 700 }}
            >
              Tanlanganlarni to‘lash ({selected.length})
            </Button>
          </Box>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { k: 'Ishchi', v: summary?.workerPending },
              { k: 'Reklama', v: summary?.adsPending },
              { k: 'Shifokor', v: summary?.doctorPending },
              { k: 'Egasi', v: summary?.ownerPending },
              { k: 'Referal', v: summary?.referralPending },
            ].map((x) => (
              <Box key={x.k} className="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200/70">
                <Typography variant="caption" color="text.secondary">
                  {x.k} (kutilmoqda)
                </Typography>
                <Typography sx={{ fontWeight: 700 }}>{money(x.v)}</Typography>
              </Box>
            ))}
          </div>

          {allocs.length === 0 ? (
            <Box className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center text-slate-500">
              Taqsimot yo‘q. Avval faol sxema yarating va registrator to‘lov qayd etsin.
            </Box>
          ) : (
            <Stack spacing={1.2}>
              {allocs.map((a) => (
                <Box
                  key={a.id}
                  className="flex flex-wrap items-center gap-2 rounded-2xl bg-white p-3 ring-1 ring-slate-200/70"
                >
                  {a.status === 'pending' && (
                    <Checkbox
                      size="small"
                      checked={selected.includes(a.id)}
                      onChange={() => toggleSelect(a.id)}
                    />
                  )}
                  <Box className="min-w-0 flex-1">
                    <Typography sx={{ fontWeight: 700 }}>
                      {a.beneficiaryName || CATEGORY_LABELS[a.category]}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {CATEGORY_LABELS[a.category] || a.category}
                      {a.patientName ? ` · ${a.patientName}` : ''}
                      {a.incomeAmount ? ` · kirim ${money(a.incomeAmount)}` : ''}
                    </Typography>
                  </Box>
                  <Typography sx={{ fontWeight: 800 }}>{money(a.amount)}</Typography>
                  <Chip
                    size="small"
                    label={a.status === 'paid' ? 'To‘langan' : 'Kutilmoqda'}
                    color={a.status === 'paid' ? 'success' : 'warning'}
                    variant="outlined"
                  />
                  {a.status === 'pending' && (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => void payoutOne(a.id)}
                      sx={{ textTransform: 'none' }}
                    >
                      To‘lash
                    </Button>
                  )}
                </Box>
              ))}
            </Stack>
          )}
        </Stack>
      )}

      {tab === 1 && (
        <Stack spacing={1.5}>
          <TextField
            type="date"
            size="small"
            label="Sana"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ maxWidth: 200, bgcolor: 'white', borderRadius: 2 }}
          />
          {incomes.length === 0 ? (
            <Box className="rounded-2xl border border-dashed bg-white py-12 text-center text-slate-500">
              Bu kunda kirim yo‘q
            </Box>
          ) : (
            incomes.map((inc) => (
              <Box key={inc.id} className="rounded-2xl bg-white p-4 ring-1 ring-slate-200/70">
                <Box className="flex flex-wrap justify-between gap-2">
                  <div>
                    <Typography sx={{ fontWeight: 700 }}>{inc.patientName || 'Bemor'}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {inc.patientPhone}
                      {inc.hasReferral
                        ? ` · Referal: ${inc.referralName || 'ha'}`
                        : ' · Referalsiz'}
                      {inc.doctorName ? ` · Dr. ${inc.doctorName}` : ''}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {inc.source} · {inc.schemeName || 'sxemasiz'} ·{' '}
                      {new Date(inc.paidAt).toLocaleString('uz-UZ')}
                    </Typography>
                  </div>
                  <Typography variant="h6" sx={{ ...headingFont, fontWeight: 800 }}>
                    {money(inc.amount)}
                  </Typography>
                </Box>
              </Box>
            ))
          )}
        </Stack>
      )}

      {tab === 2 && (
        <Stack spacing={2}>
          <Box className="flex flex-wrap items-center justify-between gap-2">
            <Typography variant="body2" color="text.secondary">
              Sxemada foizlarni qo‘shing, o‘chiring yoki ichida bo‘ling.
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddRounded />}
              onClick={openCreate}
              sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2.5, px: 2 }}
            >
              Yangi bo‘linish
            </Button>
          </Box>
          {schemes.length === 0 ? (
            <Box className="rounded-2xl border border-dashed bg-white py-12 text-center text-slate-500">
              Hali sxema yo‘q — masalan 100 minglik taqsimot yarating
            </Box>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {schemes.map((s, si) => {
                const lines = s.lines?.length ? s.lines : defaultSchemeLines()
                return (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: si * 0.04 }}
                  >
                    <Box
                      sx={{
                        position: 'relative',
                        overflow: 'hidden',
                        borderRadius: 3.5,
                        background:
                          'linear-gradient(165deg, #ffffff 0%, #f0fdfa 48%, #ecfeff 100%)',
                        border: '1px solid rgba(15,118,110,0.14)',
                        boxShadow: '0 18px 40px rgba(15, 23, 42, 0.06)',
                        p: 2.5,
                      }}
                    >
                      <Box
                        sx={{
                          position: 'absolute',
                          right: -30,
                          top: -30,
                          width: 120,
                          height: 120,
                          borderRadius: '50%',
                          background:
                            'radial-gradient(circle, rgba(15,118,110,0.12), transparent 70%)',
                        }}
                      />
                      <Box className="relative flex items-start justify-between gap-2">
                        <div>
                          <Typography
                            sx={{ ...headingFont, fontWeight: 800, fontSize: '1.15rem' }}
                          >
                            {s.name}
                          </Typography>
                          {s.description && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                              {s.description}
                            </Typography>
                          )}
                          <Box className="mt-1.5 flex flex-wrap gap-1">
                            {s.isActive ? (
                              <Chip
                                size="small"
                                label="Faol"
                                sx={{
                                  bgcolor: '#d1fae5',
                                  color: '#065f46',
                                  fontWeight: 700,
                                  height: 24,
                                }}
                              />
                            ) : (
                              <Chip size="small" label="Nofaol" variant="outlined" />
                            )}
                            <Chip
                              size="small"
                              variant="outlined"
                              label={`${lines.length} taqsimot`}
                              sx={{ height: 24 }}
                            />
                          </Box>
                        </div>
                        <Box>
                          <IconButton
                            size="small"
                            onClick={() => openEdit(s)}
                            sx={{
                              bgcolor: 'white',
                              border: '1px solid rgba(15,23,42,0.08)',
                              mr: 0.5,
                            }}
                          >
                            <EditRounded fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => void removeScheme(s.id)}
                            sx={{
                              bgcolor: 'white',
                              border: '1px solid rgba(15,23,42,0.08)',
                            }}
                          >
                            <DeleteOutlineRounded fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>

                      <Box className="relative mt-3">
                        <SplitBar lines={lines} />
                      </Box>

                      <Stack spacing={1} className="relative mt-3">
                        {lines.map((line, i) => (
                          <Box
                            key={line.id || i}
                            sx={{
                              display: 'grid',
                              gridTemplateColumns: 'auto 1fr auto',
                              gap: 1,
                              alignItems: 'start',
                              p: 1.25,
                              borderRadius: 2,
                              bgcolor: 'rgba(255,255,255,0.75)',
                              border: '1px solid rgba(15,23,42,0.05)',
                            }}
                          >
                            <Box
                              sx={{
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                bgcolor: LINE_COLORS[i % LINE_COLORS.length],
                                mt: 0.6,
                              }}
                            />
                            <Box>
                              <Typography sx={{ fontWeight: 700, fontSize: '0.92rem' }}>
                                {line.label}
                              </Typography>
                              <Box className="mt-0.5 flex flex-wrap gap-0.5">
                                <RoleBadge role={line.role} />
                                {(line.role === 'referral' || line.onlyIfReferral) && (
                                  <Chip
                                    size="small"
                                    label="referalli"
                                    sx={{ height: 22, fontSize: '0.68rem' }}
                                  />
                                )}
                              </Box>
                              {(line.children || []).length > 0 && (
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{ display: 'block', mt: 0.5 }}
                                >
                                  Ichida:{' '}
                                  {(line.children || [])
                                    .map((c) => `${c.label} ${c.pct}%`)
                                    .join(' · ')}
                                </Typography>
                              )}
                            </Box>
                            <Typography
                              sx={{
                                ...headingFont,
                                fontWeight: 800,
                                color: LINE_COLORS[i % LINE_COLORS.length],
                                fontSize: '1.05rem',
                              }}
                            >
                              {line.pct}%
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                    </Box>
                  </motion.div>
                )
              })}
            </div>
          )}
        </Stack>
      )}

      <Dialog
        open={dialogOpen}
        onClose={() => !saving && setDialogOpen(false)}
        fullWidth
        maxWidth="md"
        slotProps={{
          paper: {
            sx: {
              borderRadius: 4,
              overflow: 'hidden',
              background:
                'linear-gradient(180deg, #f8fffe 0%, #ffffff 120px, #ffffff 100%)',
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            ...headingFont,
            fontWeight: 800,
            pb: 1,
            background: 'linear-gradient(90deg, rgba(15,118,110,0.08), transparent)',
          }}
        >
          {editingId ? 'Sxemani tahrirlash' : 'Yangi bo‘linish sxemasi'}
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 400, mt: 0.5 }}>
            Foizlar orasiga yangi taqsimot qo‘shing yoki ichida bo‘ling. Jami 100% bo‘lsin.
          </Typography>
        </DialogTitle>
        <DialogContent className="!flex !flex-col !gap-2.5 !pt-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <TextField
              label="Nomi"
              fullWidth
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Masalan: Standart"
            />
            <TextField
              label="Izoh"
              fullWidth
              value={form.description || ''}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
              mt: 0.5,
            }}
          >
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 800,
                color: pctNear100(topSum) ? 'success.dark' : 'warning.dark',
              }}
            >
              Asosiy taqsimot — {topSum.toFixed(1)}% / 100%
            </Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddRounded />}
              onClick={addTopLine}
              sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 700 }}
            >
              Taqsimot qo‘shish
            </Button>
          </Box>

          <SplitBar lines={form.lines} />

          <Box sx={{ maxHeight: '52vh', overflowY: 'auto', pr: 0.5, pt: 0.5 }}>
            {form.lines.map((line, idx) => renderLineEditor(line, [idx], 0))}
          </Box>

          <FormControlLabel
            control={
              <Switch
                checked={Boolean(form.isActive)}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                color="success"
              />
            }
            label="Faol sxema (yangi to‘lovlar shu bo‘yicha taqsimlanadi)"
          />
          <Typography variant="caption" color="text.secondary">
            Referal turidagi qatorlar faqat referalli to‘lovda ishlaydi; referalsiz summa
            «qoldiq»ga o‘tadi. Shifokor: ishlagan vrach bo‘lsa pool 100% ungа. Mavjud
            referallar: {referrals.length} ta.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={saving} sx={{ textTransform: 'none' }}>
            Bekor
          </Button>
          <Button
            variant="contained"
            onClick={() => void saveScheme()}
            disabled={saving}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: 2.5,
              px: 2.5,
              boxShadow: '0 10px 24px rgba(15,118,110,0.25)',
            }}
          >
            {saving ? '…' : 'Saqlash'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
