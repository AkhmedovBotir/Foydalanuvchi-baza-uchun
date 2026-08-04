import { useEffect, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button, Chip, CircularProgress, Typography } from '@mui/material'
import {
  AddRounded,
  ArrowForwardRounded,
  AssignmentRounded,
  ContactMailRounded,
  EventAvailableRounded,
  ForumRounded,
  PersonRounded,
  PhoneRounded,
  PublishRounded,
  ScheduleRounded,
} from '@mui/icons-material'
import { listAppointments, getBookingSummary } from '../api/appointments'
import type { AppointmentService } from '../api/appointmentTypes'
import {
  APPOINTMENT_STATUS_META,
} from '../api/appointmentTypes'
import { listCards } from '../api/cards'
import { listAllResponses, listSurveys } from '../api/surveys'
import type { Survey } from '../api/types'
import { STATUS_META } from '../lib/survey'
import { useAuth } from '../auth/AuthContext'

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
}

const headingFont = { fontFamily: "'Outfit', sans-serif" }

export function HomePage() {
  const { company } = useAuth()
  const [loading, setLoading] = useState(true)
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [appointments, setAppointments] = useState<AppointmentService[]>([])
  const [cardCount, setCardCount] = useState(0)
  const [responseTotal, setResponseTotal] = useState(0)
  const [bookingSummary, setBookingSummary] = useState({
    total: 0,
    pending: 0,
    today: 0,
    thisWeek: 0,
  })

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void Promise.all([
      listSurveys().catch(() => [] as Survey[]),
      listAppointments().catch(() => [] as AppointmentService[]),
      listCards().catch(() => []),
      listAllResponses({ page: 1, limit: 1 }).catch(() => ({
        data: [],
        total: 0,
        page: 1,
        limit: 1,
      })),
      getBookingSummary().catch(() => null),
    ])
      .then(([surveyList, apptList, cards, responses, summary]) => {
        if (cancelled) return
        setSurveys(surveyList ?? [])
        setAppointments(apptList ?? [])
        setCardCount(cards?.length ?? 0)
        setResponseTotal(responses?.total ?? 0)
        if (summary) {
          setBookingSummary({
            total: summary.total,
            pending: summary.pending,
            today: summary.today,
            thisWeek: summary.thisWeek,
          })
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const surveyPublished = surveys.filter((s) => s.status === 'published').length
  const surveyDraft = surveys.filter((s) => s.status === 'draft').length
  const apptPublished = appointments.filter((a) => a.status === 'published').length

  const recentSurveys = [...surveys]
    .sort(
      (a, b) =>
        new Date(b.updatedAt || b.createdAt || 0).getTime() -
        new Date(a.updatedAt || a.createdAt || 0).getTime(),
    )
    .slice(0, 4)

  const recentAppts = [...appointments]
    .sort(
      (a, b) =>
        new Date(b.updatedAt || b.createdAt || 0).getTime() -
        new Date(a.updatedAt || a.createdAt || 0).getTime(),
    )
    .slice(0, 4)

  const stats = [
    {
      label: 'So‘rovnomalar',
      value: surveys.length,
      hint: `${surveyPublished} nashr · ${surveyDraft} loyiha`,
      icon: <AssignmentRounded />,
      tone: 'from-teal-500 to-cyan-500',
      to: '/surveys',
    },
    {
      label: 'Javoblar',
      value: responseTotal,
      hint: 'Barcha so‘rovnomalar',
      icon: <ForumRounded />,
      tone: 'from-sky-500 to-blue-600',
      to: '/surveys/responses',
    },
    {
      label: 'Qabul',
      value: appointments.length,
      hint: `${apptPublished} faol · bugun ${bookingSummary.today} bron`,
      icon: <EventAvailableRounded />,
      tone: 'from-emerald-500 to-teal-600',
      to: '/appointments',
    },
    {
      label: 'Vizitkalar',
      value: cardCount,
      hint: 'Saqlangan dizaynlar',
      icon: <ContactMailRounded />,
      tone: 'from-violet-500 to-indigo-600',
      to: '/cards',
    },
  ]

  const quickLinks = [
    {
      title: 'Yangi so‘rovnoma',
      desc: 'Savollar va public link',
      to: '/surveys/new',
      icon: <AddRounded />,
      color: 'bg-teal-500/15 text-teal-700',
    },
    {
      title: 'Qabul sozlash',
      desc: 'Kun, slot va bronlar',
      to: '/appointments',
      icon: <ScheduleRounded />,
      color: 'bg-emerald-500/15 text-emerald-700',
    },
    {
      title: 'Vizitka',
      desc: 'Shablon, QR, A4 PDF',
      to: '/cards',
      icon: <ContactMailRounded />,
      color: 'bg-violet-500/15 text-violet-700',
    },
    {
      title: 'Javoblarni ko‘rish',
      desc: 'Respondentlar bazasi',
      to: '/surveys/responses',
      icon: <ForumRounded />,
      color: 'bg-sky-500/15 text-sky-700',
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
              label="Kompaniya paneli"
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
              Salom, {company?.name}
            </Typography>
            <Typography className="!mt-2 max-w-xl !text-slate-300">
              So‘rovnomalar, qabul bronlari, vizitkalar va javoblarni bir joydan boshqaring.
            </Typography>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              component={RouterLink}
              to="/surveys/new"
              startIcon={<AddRounded />}
              variant="contained"
              sx={{
                bgcolor: 'white',
                color: '#0f766e',
                fontWeight: 700,
                textTransform: 'none',
                borderRadius: '12px',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.92)' },
              }}
            >
              So‘rovnoma
            </Button>
            <Button
              component={RouterLink}
              to="/appointments"
              variant="outlined"
              sx={{
                color: 'white',
                borderColor: 'rgba(255,255,255,0.35)',
                fontWeight: 700,
                textTransform: 'none',
                borderRadius: '12px',
                '&:hover': {
                  borderColor: 'rgba(255,255,255,0.55)',
                  bgcolor: 'rgba(255,255,255,0.06)',
                },
              }}
            >
              Qabul
            </Button>
          </div>
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

          {/* Bron diqqat */}
          <motion.section
            variants={fadeUp}
            className="grid gap-3 sm:grid-cols-3"
          >
            {[
              {
                label: 'Bugungi bronlar',
                value: bookingSummary.today,
                tone: 'text-teal-800 bg-teal-50 border-teal-100',
              },
              {
                label: 'Bu hafta',
                value: bookingSummary.thisWeek,
                tone: 'text-sky-800 bg-sky-50 border-sky-100',
              },
              {
                label: 'Kutilmoqda',
                value: bookingSummary.pending,
                tone: 'text-amber-900 bg-amber-50 border-amber-100',
              },
            ].map((item) => (
              <RouterLink
                key={item.label}
                to="/appointments"
                className={`rounded-2xl border px-4 py-3.5 transition hover:shadow-sm ${item.tone}`}
              >
                <p className="text-[11px] font-semibold uppercase tracking-wider opacity-80">
                  {item.label}
                </p>
                <p className="mt-1 text-2xl font-bold" style={headingFont}>
                  {item.value}
                </p>
              </RouterLink>
            ))}
          </motion.section>

          <motion.section
            variants={fadeUp}
            className="rounded-[1.35rem] border border-slate-200/80 bg-white p-5 shadow-sm"
          >
            <Typography sx={{ ...headingFont, fontWeight: 700, fontSize: '1.1rem' }}>
              Tez harakatlar
            </Typography>
            <p className="mb-4 text-sm text-slate-500">Asosiy jarayonlarga tezkor o‘tish</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {quickLinks.map((item) => (
                <RouterLink
                  key={item.to}
                  to={item.to}
                  className="group flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 transition hover:border-teal-200 hover:bg-teal-50/40"
                >
                  <div
                    className={`grid h-11 w-11 place-items-center rounded-xl ${item.color}`}
                  >
                    {item.icon}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 group-hover:text-teal-800">
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">{item.desc}</p>
                  </div>
                </RouterLink>
              ))}
            </div>
          </motion.section>

          <div className="grid gap-5 lg:grid-cols-2">
            <motion.section
              variants={fadeUp}
              className="rounded-[1.35rem] border border-slate-200/80 bg-white p-5 shadow-sm"
            >
              <div className="mb-4 flex items-center justify-between gap-2">
                <div>
                  <Typography sx={{ ...headingFont, fontWeight: 700, fontSize: '1.05rem' }}>
                    So‘rovnomalar
                  </Typography>
                  <p className="text-sm text-slate-500">Yaqinda yangilangan</p>
                </div>
                <Button
                  component={RouterLink}
                  to="/surveys"
                  size="small"
                  sx={{ textTransform: 'none', fontWeight: 700 }}
                  endIcon={<ArrowForwardRounded />}
                >
                  Barchasi
                </Button>
              </div>
              {recentSurveys.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center">
                  <p className="text-sm text-slate-500">Hali so‘rovnoma yo‘q</p>
                  <Button
                    component={RouterLink}
                    to="/surveys/new"
                    size="small"
                    startIcon={<AddRounded />}
                    sx={{ mt: 1.5, textTransform: 'none', fontWeight: 700 }}
                  >
                    Yaratish
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentSurveys.map((s) => {
                    const st = STATUS_META[s.status] || STATUS_META.draft
                    return (
                      <RouterLink
                        key={s.id}
                        to={`/surveys/${s.slug || s.id}/edit`}
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2.5 transition hover:border-teal-200 hover:bg-teal-50/30"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">{s.title}</p>
                          <p className="truncate text-xs text-slate-500">/{s.slug}</p>
                        </div>
                        <span
                          className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold"
                          style={{ background: st.bg, color: st.color }}
                        >
                          {st.label}
                        </span>
                      </RouterLink>
                    )
                  })}
                </div>
              )}
            </motion.section>

            <motion.section
              variants={fadeUp}
              className="rounded-[1.35rem] border border-slate-200/80 bg-white p-5 shadow-sm"
            >
              <div className="mb-4 flex items-center justify-between gap-2">
                <div>
                  <Typography sx={{ ...headingFont, fontWeight: 700, fontSize: '1.05rem' }}>
                    Qabul xizmatlari
                  </Typography>
                  <p className="text-sm text-slate-500">Bron uchun ochiq kanallar</p>
                </div>
                <Button
                  component={RouterLink}
                  to="/appointments"
                  size="small"
                  sx={{ textTransform: 'none', fontWeight: 700 }}
                  endIcon={<ArrowForwardRounded />}
                >
                  Barchasi
                </Button>
              </div>
              {recentAppts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center">
                  <p className="text-sm text-slate-500">Hali qabul sozlanmagan</p>
                  <Button
                    component={RouterLink}
                    to="/appointments"
                    size="small"
                    startIcon={<EventAvailableRounded />}
                    sx={{ mt: 1.5, textTransform: 'none', fontWeight: 700 }}
                  >
                    Sozlash
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentAppts.map((a) => {
                    const st = APPOINTMENT_STATUS_META[a.status]
                    return (
                      <RouterLink
                        key={a.id}
                        to="/appointments"
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2.5 transition hover:border-teal-200 hover:bg-teal-50/30"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">{a.title}</p>
                          <p className="truncate text-xs text-slate-500">
                            /{a.slug} · har {a.slotIntervalMinutes} daq.
                          </p>
                        </div>
                        <span
                          className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold"
                          style={{ background: st.bg, color: st.color }}
                        >
                          {st.label}
                        </span>
                      </RouterLink>
                    )
                  })}
                </div>
              )}
            </motion.section>
          </div>

          <motion.div
            variants={fadeUp}
            className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm text-slate-600"
          >
            <div className="flex items-center gap-2">
              <PhoneRounded fontSize="small" className="!text-slate-400" />
              <span>{company?.phone || '—'}</span>
            </div>
            <div className="flex items-center gap-2">
              <PersonRounded fontSize="small" className="!text-slate-400" />
              <span>@{company?.username}</span>
            </div>
            <div className="ml-auto flex flex-wrap gap-2">
              <Button
                component={RouterLink}
                to="/surveys"
                size="small"
                startIcon={<PublishRounded />}
                sx={{ textTransform: 'none', fontWeight: 700 }}
              >
                So‘rovnomalar
              </Button>
              <Button
                component={RouterLink}
                to="/profile"
                size="small"
                sx={{ textTransform: 'none', fontWeight: 700 }}
              >
                Profil
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </motion.div>
  )
}
