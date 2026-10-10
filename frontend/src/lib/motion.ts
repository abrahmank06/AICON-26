import type { Transition } from 'motion/react'

// Apple-style springs: critically damped by default, bounce only after momentum.
export const uiSpring: Transition = { type: 'spring', bounce: 0, duration: 0.4 }
export const quickSpring: Transition = { type: 'spring', bounce: 0, duration: 0.3 }
export const sheetSpring: Transition = { type: 'spring', bounce: 0.15, duration: 0.35 }
export const fade: Transition = { duration: 0.2, ease: [0.16, 1, 0.3, 1] }
