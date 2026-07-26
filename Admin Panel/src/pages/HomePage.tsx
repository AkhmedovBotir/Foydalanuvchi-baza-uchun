import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Chip, Typography } from '@mui/material'
import {
  ApartmentRounded,
  GroupRounded,
  PersonRounded,
} from '@mui/icons-material'
import { listAdmins } from '../api/admins'
import { listCompanies } from '../api/companies'
import { useAuth } from '../auth/AuthContext'

const headingFont = { fontFamily: "'Outfit', sans-serif" }

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0 },
}

export function HomePage() {
  const { admin } = useAuth()
  const [adminCount, setAdminCount] = useState(0)
  const [companyCount, setCompanyCount] = useState(0)

  useEffect(() => {
    void Promise.all([
      listAdmins().catch(() => []),
      listCompanies().catch(() => []),
    ]).then(([admins, companies]) => {
      setAdminCount(admins.length)
      setCompanyCount(companies.length)
    })
  }, [])

  return (
    <motion.div
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.08 } },
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
        <div className="relative">
          <Chip
            label="Xush kelibsiz"
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
            Bu yerda adminlar va kompaniyalarni boshqarishingiz, profilingizni yangilashingiz mumkin.
          </Typography>
        </div>
      </motion.section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            label: 'Jami adminlar',
            value: adminCount,
            icon: <GroupRounded />,
            tone: 'from-teal-500 to-cyan-500',
          },
          {
            label: 'Kompaniyalar',
            value: companyCount,
            icon: <ApartmentRounded />,
            tone: 'from-sky-500 to-blue-600',
          },
          {
            label: 'Login',
            value: admin?.username ?? '—',
            icon: <PersonRounded />,
            tone: 'from-emerald-500 to-teal-600',
          },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            variants={fadeUp}
            whileHover={{ y: -5, scale: 1.01 }}
            className="rounded-[1.35rem] bg-white p-4 shadow-sm ring-1 ring-slate-200/80 sm:p-5"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Typography variant="body2" color="text.secondary" className="!text-[0.8rem]">
                  {stat.label}
                </Typography>
                <Typography
                  variant="h5"
                  className="!truncate !text-[1.25rem]"
                  sx={{ ...headingFont, mt: 0.5, fontWeight: 700 }}
                >
                  {stat.value}
                </Typography>
              </div>
              <div
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${stat.tone} text-white shadow-md`}
              >
                {stat.icon}
              </div>
            </div>
          </motion.div>
        ))}
      </section>
    </motion.div>
  )
}
