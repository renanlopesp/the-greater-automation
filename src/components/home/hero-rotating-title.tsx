'use client'

import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const HEADLINES = [
  'O que sua loja precisa hoje?',
  'Como posso ajudar a Milkes a vender mais?',
  'Sua loja. Suas vendas. Eu cuido do resto.',
  'O que fazemos juntos hoje?',
  'Pergunte qualquer coisa sobre sua loja.',
]

// Module-level random start (runs once on client)
const INITIAL_INDEX =
  typeof window !== 'undefined' ? Math.floor(Math.random() * HEADLINES.length) : 0

export default function HeroRotatingTitle() {
  const [index, setIndex] = useState(INITIAL_INDEX)

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % HEADLINES.length)
    }, 5000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex flex-col items-center" style={{ minHeight: 30 }}>
      <AnimatePresence mode="wait">
        <motion.p
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            fontSize: 20,
            fontWeight: 500,
            color: 'var(--foreground)',
            textAlign: 'center',
            lineHeight: '30px',
          }}
        >
          {HEADLINES[index]}
        </motion.p>
      </AnimatePresence>
    </div>
  )
}
