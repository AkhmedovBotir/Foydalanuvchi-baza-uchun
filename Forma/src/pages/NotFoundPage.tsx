import { motion } from 'framer-motion'

export function NotFoundPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-4 text-center">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <p className="text-6xl font-bold tracking-tight text-teal-700">404</p>
        <h1 className="mt-3 text-xl font-semibold text-slate-800">
          Sahifa topilmadi
        </h1>
        <p className="mt-2 max-w-sm text-sm text-slate-500">
          Bu manzil mavjud emas. So‘rovnoma faqat maxsus havola orqali ochiladi.
        </p>
      </motion.div>
    </div>
  )
}
