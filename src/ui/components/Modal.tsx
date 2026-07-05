import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useDialog } from '../hooks/useDialog';
import { CloseIcon } from '../icons';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export default function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  // Escape-to-dismiss, focus trap, and focus restore all live in useDialog now.
  const { dialogRef, dialogProps } = useDialog<HTMLDivElement>({ isOpen, onClose })

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
  }

  return createPortal(
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="fixed inset-0 bg-surface-deep/85 backdrop-blur-md z-[110]"
            aria-hidden="true"
          />
          <div className="fixed inset-0 z-[120] pointer-events-none overflow-y-auto">
            <div className="min-h-screen flex items-start justify-center p-4 pt-24">
              <motion.div
                ref={dialogRef}
                {...dialogProps}
                aria-label={title || 'Dialog'}
                initial={{ scale: 0.9, opacity: 0, y: -20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: -20 }}
                className={`w-full ${sizeClasses[size]} bg-surface border border-accent-400/30 rounded-2xl shadow-premium-lg shadow-2xl overflow-hidden pointer-events-auto flex flex-col max-h-[calc(100vh-8rem)] my-4`}
              >
              {/* Header */}
              <div className="px-6 py-4 border-b border-surface-border flex justify-between items-center bg-gradient-to-r from-surface to-surface-raised shrink-0">
                <h2 className="text-xl font-black text-white font-heading tracking-wide flex items-center gap-2">
                  {title}
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="text-ink-subtle hover:text-white transition-all p-2 hover:bg-surface-raised rounded-lg focus-visible:ring-2 focus-visible:ring-accent-400/50 focus-visible:outline-none"
                >
                  <CloseIcon size={16} />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto custom-scrollbar flex-1 min-h-0">
                {children}
              </div>
            </motion.div>
            </div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
