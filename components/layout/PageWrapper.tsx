'use client';

import { motion } from 'framer-motion';

interface PageWrapperProps {
  children: React.ReactNode;
}

export default function PageWrapper({ children }: PageWrapperProps) {
  return (
    <motion.main
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="pt-20 px-6 lg:pl-[246px] lg:pr-6 pb-6"
    >
      <div className="max-w-7xl mx-auto">{children}</div>
    </motion.main>
  );
}
