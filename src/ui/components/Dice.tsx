
import { motion } from 'framer-motion'

export default function Dice({value, rolling}:{value:number, rolling:boolean}){
  return (
    <motion.div
      animate={rolling?{rotate:360}:{rotate:0}}
      transition={{repeat: rolling?Infinity:0, duration: 0.8, ease:'linear'}}
      className="w-16 h-16 bg-white dark:bg-slate-800 rounded-xl grid place-items-center text-2xl font-extrabold shadow-pop border border-slate-300/60 dark:border-slate-700/60"
      aria-live="polite"
      aria-label={`D20 roll ${value}`}
    >
      {value}
    </motion.div>
  )
}
