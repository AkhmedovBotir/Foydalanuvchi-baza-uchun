import { useEffect, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Button,
  Chip,
  CircularProgress,
  Typography,
} from '@mui/material'
import {
  ApartmentRounded,
  ArrowForwardRounded,
  ContactMailRounded,
  GroupRounded,
  LinkRounded,
  ManageAccountsRounded,
  PersonRounded,
  TuneRounded,
} from '@mui/icons-material'
import { listAdmins } from '../api/admins'
import { listCompanies } from '../api/companies'
import { listCardTemplates } from '../api/cards'
import { getSurveyLinkBase } from '../api/settings'
import type { Company } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { paths } from '../routes/paths'

const headingFont = { fontFamily: "'Outfit', sans-serif" }

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
}

function formatDate(value?: string) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('uz-UZ', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function HomePage() {
  const { admin } = useAuth()
  const [loading, setLoading] = useState(true)
  const [adminCount, setAdminCount] = useState(0)
  const [companies, setCompanies] = useState<Company[]>([])
  const [templateCount, setTemplateCount] = useState(0)
  const [formBase, setFormBase] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void Promise.all([
      listAdmins().catch(() => []),
      listCompanies().catch(() => [] as Company[]),
      listCardTemplates().catch(() => []),
      getSurveyLinkBase().catch(() => null),
    ]).then(([admins, companyList, templates, setting]) => {
      if (cancelled) return
      setAdminCount(admins?.length ?? 0)
      setCompanies(companyList ?? [])
      setTemplateCount(templates?.length ?? 0)
      setFormBase(setting?.base_url ?? '')
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const companyCount = companies.length
  const recentCompanies = [...companies]
    .sort((a, b) => {
      const ta = new Date(a.created_at || 0).getTime()
      const tb = new Date(b.created_at || 0).getTime()
      return tb - ta
    })
    .slice(0, 5)

  const stats = [
    {
      label: 'Kompaniyalar',
      value: companyCount,
      hint: 'Tizimga ulangan',
      icon: <ApartmentRounded />,
      tone: 'from-sky-500 to-blue-600',
      to: paths.companies,
    },
    {
      label: 'Adminlar',
      value: adminCount,
      hint: 'Boshqaruv hisoblari',
      icon: <GroupRounded />,
      tone: 'from-teal-500 to-cyan-500',
      to: paths.admins,
    },
    {
      label: 'Vizitka shablonlari',
      value: templateCount,
      hint: 'Kompaniyalar uchun',
      icon: <ContactMailRounded />,
      tone: 'from-violet-500 to-indigo-600',
      to: paths.cards,
    },
    {
      label: 'Sizning login',
      value: admin?.username ?? '—',
      hint: admin?.phone || 'Profil',
      icon: <PersonRounded />,
      tone: 'from-emerald-500 to-teal-600',
      to: paths.profile,
    },
  ]

  const quickLinks = [
    {
      title: 'Kompaniya qo‘shish',
      desc: 'Yangi kompaniya hisobi ochish',
      to: paths.companies,
      icon: <ApartmentRounded />,
      color: 'bg-sky-500/15 text-sky-700',
    },
    {
      title: 'Vizitka shabloni',
      desc: 'QR va matn joylari bilan dizayn',
      to: paths.cards,
      icon: <ContactMailRounded />,
      color: 'bg-violet-500/15 text-violet-700',
    },
    {
      title: 'Forma havolasi',
      desc: 'So‘rovnoma / bron base URL',
      to: paths.settings,
      icon: <TuneRounded />,
      color: 'bg-teal-500/15 text-teal-700',
    },
    {
      title: 'Adminlar',
      desc: 'Boshqaruvchilarni boshqarish',
      to: paths.admins,
      icon: <GroupRounded />,
      color: 'bg-slate-500/10 text-slate-700',
    },
  ]

  return (
    <motion.div
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.06 } },
      }}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-5"
    >
      <motion.section
        variants={fadeUp}
        className="relative overflow-hidden rounded-[1.5rem] bg-slate-950 px-5 py-7 text-white shadow-xl shadow-slate-900/10 sm:px-7"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(45,212,191,0.35),transparent_40%),radial-gradient(circle_at_90%_10%,rgba(56,189,248,0.25),transparent_35%)]" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <Chip
              label="Admin boshqaruv markazi"
              size="small"
              sx={{ mb: 1.5, bgcolor: 'rgba(255,255,255,0.12)', color: 'white' }}
            />
            <Typography
              variant="h3"
              sx={{
                ...headingFont,
                fontWeight: 800,
                letterSpacing: '-0.03em',
                fontSize: { xs: '1.65rem', sm: '2.1rem' },
              }}
            >
              Salom, {admin?.name}
            </Typography>
            <Typography className="!mt-2 max-w-xl !text-slate-300">
              Kompaniyalar, adminlar, vizitka shablonlari va public forma (so‘rovnoma /
              bron) base URL — barchasini bitta joydan nazorat qiling.
            </Typography>
          </div>
          <Button
            component={RouterLink}
            to={paths.companies}
            variant="contained"
            endIcon={<ArrowForwardRounded />}
            sx={{
              bgcolor: 'white',
              color: '#0f766e',
              fontWeight: 700,
              textTransform: 'none',
              borderRadius: '12px',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.92)' },
            }}
          >
            Kompaniyalar
          </Button>
        </div>
      </motion.section>

      {loading ? (
        <div className="flex justify-center py-16">
          <CircularProgress size={32} />
        </div>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <motion.div key={stat.label} variants={fadeUp}>
                <RouterLink
                  to={stat.to}
                  className="block h-full rounded-[1.25rem] bg-white p-4 shadow-sm ring-1 ring-slate-200/80 transition hover:-translate-y-0.5 hover:shadow-md sm:p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-500">{stat.label}</p>
                      <p
                        className="mt-1 truncate text-xl font-bold text-slate-900"
                        style={headingFont}
                      >
                        {stat.value}
                      </p>
                      <p className="mt-1 truncate text-[11px] text-slate-400">{stat.hint}</p>
                    </div>
                    <div
                      className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${stat.tone} text-white shadow-md`}
                    >
                      {stat.icon}
                    </div>
                  </div>
                </RouterLink>
              </motion.div>
            ))}
          </section>

          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <motion.section
              variants={fadeUp}
              className="rounded-[1.35rem] border border-slate-200/80 bg-white p-5 shadow-sm"
            >
              <div className="mb-4 flex items-center justify-between gap-2">
                <div>
                  <Typography sx={{ ...headingFont, fontWeight: 700, fontSize: '1.1rem' }}>
                    Tez harakatlar
                  </Typography>
                  <p className="text-sm text-slate-500">Asosiy bo‘limlarga o‘tish</p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {quickLinks.map((item) => (
                  <RouterLink
                    key={item.to + item.title}
                    to={item.to}
                    className="group flex gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5 transition hover:border-teal-200 hover:bg-teal-50/40"
                  >
                    <div
                      className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${item.color}`}
                    >
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 group-hover:text-teal-800">
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">{item.desc}</p>
                    </div>
                    <ArrowForwardRounded
                      className="ml-auto mt-1 !text-lg text-slate-300 group-hover:text-teal-600"
                    />
                  </RouterLink>
                ))}
              </div>
            </motion.section>

            <motion.section
              variants={fadeUp}
              className="rounded-[1.35rem] border border-slate-200/80 bg-white p-5 shadow-sm"
            >
              <div className="mb-3 flex items-start gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-teal-500/15 text-teal-700">
                  <LinkRounded />
                </div>
                <div className="min-w-0">
                  <Typography sx={{ ...headingFont, fontWeight: 700, fontSize: '1.1rem' }}>
                    Forma base URL
                  </Typography>
                  <p className="text-sm text-slate-500">
                    So‘rovnoma va qabul bron havolalari shu manzilga bog‘lanadi
                  </p>
                </div>
              </div>
              {formBase ? (
                <div className="rounded-xl border border-teal-100 bg-teal-50/60 px-3 py-3">
                  <p className="break-all text-sm font-medium text-teal-900">{formBase}</p>
                  <p className="mt-1 text-xs text-teal-700/80">
                    Masalan: {formBase.replace(/\/$/, '')}/surveys/slug yoki /book/slug
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-3 text-sm text-amber-900">
                  Base URL sozlanmagan — sozlash tavsiya etiladi.
                </div>
              )}
              <Button
                component={RouterLink}
                to={paths.settings}
                size="small"
                sx={{ mt: 2, textTransform: 'none', fontWeight: 700 }}
                endIcon={<ArrowForwardRounded />}
              >
                Sozlamalarga o‘tish
              </Button>
            </motion.section>
          </div>

          <motion.section
            variants={fadeUp}
            className="rounded-[1.35rem] border border-slate-200/80 bg-white p-5 shadow-sm"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <Typography sx={{ ...headingFont, fontWeight: 700, fontSize: '1.1rem' }}>
                  So‘nggi kompaniyalar
                </Typography>
                <p className="text-sm text-slate-500">Yaqinda qo‘shilgan tashkilotlar</p>
              </div>
              <Button
                component={RouterLink}
                to={paths.companies}
                size="small"
                sx={{ textTransform: 'none', fontWeight: 700 }}
                endIcon={<ArrowForwardRounded />}
              >
                Barchasi
              </Button>
            </div>

            {recentCompanies.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-500">
                Hali kompaniya yo‘q — birinchisini qo‘shing
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentCompanies.map((c) => (
                  <div
                    key={c.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-sm font-bold text-slate-600">
                        {c.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">{c.name}</p>
                        <p className="truncate text-xs text-slate-500">
                          @{c.username} · {c.phone || 'tel yo‘q'}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-slate-400">{formatDate(c.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.section>

          <motion.div
            variants={fadeUp}
            className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm text-slate-600"
          >
            <ManageAccountsRounded fontSize="small" className="!text-slate-400" />
            <span>
              Profil: <strong className="font-semibold text-slate-800">{admin?.name}</strong>
              {admin?.phone ? ` · ${admin.phone}` : ''}
            </span>
            <Button
              component={RouterLink}
              to={paths.profile}
              size="small"
              sx={{ ml: 'auto', textTransform: 'none', fontWeight: 700 }}
            >
              Profil
            </Button>
          </motion.div>
        </>
      )}
    </motion.div>
  )
}
