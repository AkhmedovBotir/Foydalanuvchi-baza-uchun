import { motion } from 'framer-motion'
import { SettingsSection } from './SettingsSection'

export function SettingsPage() {
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
      <SettingsSection />
    </motion.div>
  )
}
