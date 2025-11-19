
import { motion, Variants } from 'framer-motion'
import { PropsWithChildren } from 'react'

interface CardProps extends PropsWithChildren {
  variant?: 'default' | 'glass' | 'glow';
  hover?: boolean;
  className?: string;
  onClick?: () => void;
}

const cardVariants: Variants = {
  hidden: {
    scale: 0.95,
    opacity: 0,
  },
  show: {
    scale: 1,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 200,
      damping: 20,
    },
  },
  hover: {
    scale: 1.02,
    y: -4,
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

export default function Card({
  children,
  variant = 'default',
  hover = true,
  className = '',
  onClick
}: CardProps) {
  const baseClasses = "rounded-xl p-4 transition-all duration-300";

  const variantClasses = {
    default: "bg-cyber-black-400 border border-matrix-500/20 shadow-green-glow",
    glass: "bg-cyber-black-400/80 backdrop-blur-md border border-matrix-500/30 shadow-green-glow",
    glow: "bg-cyber-black-400 border-2 border-matrix-500 shadow-neon",
  };

  return (
    <motion.div
      initial="hidden"
      animate="show"
      whileHover={hover ? "hover" : undefined}
      whileTap={onClick ? "tap" : undefined}
      variants={cardVariants}
      className={`${baseClasses} ${variantClasses[variant]} ${className} ${
        onClick ? 'cursor-pointer' : ''
      }`}
      onClick={onClick}
    >
      {children}
    </motion.div>
  )
}
