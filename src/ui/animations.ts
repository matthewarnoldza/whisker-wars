import { Variants } from 'framer-motion';

// Page transition animations
export const pageVariants: Variants = {
  initial: {
    opacity: 0,
    x: -20,
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
  exit: {
    opacity: 0,
    x: 20,
    transition: {
      duration: 0.2,
    },
  },
};

// Card entrance animations with stagger
export const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export const cardVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.8,
    y: 20,
  },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 200,
      damping: 20,
    },
  },
  hover: {
    scale: 1.05,
    y: -5,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 10,
    },
  },
  tap: {
    scale: 0.98,
  },
};

// Glassmorphic card with glow
export const glassCardVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.9,
  },
  show: {
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 200,
      damping: 25,
    },
  },
  hover: {
    scale: 1.02,
    boxShadow: '0 0 20px rgba(0, 255, 65, 0.5)',
    transition: {
      duration: 0.2,
    },
  },
};

// Battle animations
export const attackVariants: Variants = {
  idle: {
    x: 0,
    rotate: 0,
  },
  attack: {
    x: [0, 30, 0],
    rotate: [0, 10, 0],
    transition: {
      duration: 0.5,
      times: [0, 0.5, 1],
      ease: 'easeInOut',
    },
  },
};

export const damageVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 0,
    scale: 0.5,
  },
  show: {
    opacity: [0, 1, 1, 0],
    y: -50,
    scale: [0.5, 1.2, 1, 1],
    transition: {
      duration: 1,
      times: [0, 0.2, 0.8, 1],
    },
  },
};

export const shakeVariants: Variants = {
  idle: { x: 0 },
  shake: {
    x: [-5, 5, -5, 5, 0],
    transition: {
      duration: 0.4,
    },
  },
};

// HP bar animation
export const hpBarVariants: Variants = {
  initial: { scaleX: 0, transformOrigin: 'left' },
  animate: {
    scaleX: 1,
    transition: {
      duration: 0.5,
      ease: 'easeOut',
    },
  },
  decrease: {
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
};

// Button animations
export const buttonVariants: Variants = {
  idle: {
    scale: 1,
    boxShadow: '0 4px 20px rgba(0, 255, 65, 0.3)',
  },
  hover: {
    scale: 1.05,
    boxShadow: '0 8px 32px rgba(0, 255, 65, 0.5)',
    transition: {
      duration: 0.2,
    },
  },
  tap: {
    scale: 0.95,
    boxShadow: '0 2px 10px rgba(0, 255, 65, 0.2)',
  },
  disabled: {
    scale: 1,
    opacity: 0.5,
    boxShadow: '0 0 0 rgba(0, 255, 65, 0)',
  },
};

// Coin gain animation
export const coinVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.5,
  },
  show: {
    opacity: [0, 1, 1, 0],
    y: [20, -30, -50],
    scale: [0.5, 1.2, 1],
    transition: {
      duration: 1.5,
      times: [0, 0.3, 1],
      ease: 'easeOut',
    },
  },
};

// Particle animations
export const particleVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0,
  },
  show: {
    opacity: [0, 1, 0],
    scale: [0, 1, 0.5],
    transition: {
      duration: 2,
      ease: 'easeOut',
    },
  },
};

// Modal animations
export const modalVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.8,
  },
  show: {
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    transition: {
      duration: 0.2,
    },
  },
};

export const overlayVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { duration: 0.2 },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2 },
  },
};

// Victory/Defeat animations
export const victoryVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0,
    rotate: -180,
  },
  show: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: {
      type: 'spring',
      stiffness: 200,
      damping: 15,
      delay: 0.2,
    },
  },
};

// Ability activation
export const abilityVariants: Variants = {
  idle: {
    scale: 1,
    opacity: 1,
  },
  activate: {
    scale: [1, 1.3, 1],
    opacity: [1, 0.7, 1],
    filter: [
      'brightness(1) drop-shadow(0 0 0px rgba(0, 255, 65, 0))',
      'brightness(1.5) drop-shadow(0 0 20px rgba(0, 255, 65, 1))',
      'brightness(1) drop-shadow(0 0 5px rgba(0, 255, 65, 0.5))',
    ],
    transition: {
      duration: 0.6,
      times: [0, 0.5, 1],
    },
  },
};

// Floating animation for ambient elements
export const floatVariants: Variants = {
  animate: {
    y: [-10, 10, -10],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// Pulse glow animation
export const pulseGlowVariants: Variants = {
  animate: {
    boxShadow: [
      '0 0 5px rgba(0, 255, 65, 0.3)',
      '0 0 20px rgba(0, 255, 65, 0.6)',
      '0 0 5px rgba(0, 255, 65, 0.3)',
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};
