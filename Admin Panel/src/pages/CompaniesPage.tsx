import { motion } from 'framer-motion'
import { CompaniesSection } from './CompaniesSection'

export function CompaniesPage() {
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
      <CompaniesSection />
    </motion.div>
  )
}
