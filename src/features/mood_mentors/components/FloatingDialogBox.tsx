import React, { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FloatingDialogBoxProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  position?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left' | 'center';
  width?: 'sm' | 'md' | 'lg' | 'xl' | 'auto';
  showCloseButton?: boolean;
  variant?: 'default' | 'blue' | 'dark' | 'subtle';
}

export function FloatingDialogBox({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  position = 'bottom-right',
  width = 'md',
  showCloseButton = true,
  variant = 'default',
}: FloatingDialogBoxProps) {
  if (!isOpen) return null;

  // Position classes
  const positionClasses = {
    'top-right': 'top-6 right-6',
    'bottom-right': 'bottom-6 right-6',
    'top-left': 'top-6 left-6',
    'bottom-left': 'bottom-6 left-6',
    'center': 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
  };

  // Width classes
  const widthClasses = {
    'sm': 'w-80',
    'md': 'w-96',
    'lg': 'w-[32rem]',
    'xl': 'w-[40rem]',
    'auto': 'w-auto',
  };

  // Variant classes for styling
  const variantClasses = {
    'default': 'bg-white border border-gray-200',
    'blue': 'bg-blue-50 border border-blue-200',
    'dark': 'bg-gray-900 text-white border border-gray-800',
    'subtle': 'bg-gray-50 border border-gray-100',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={`fixed z-50 ${positionClasses[position]} ${widthClasses[width]} shadow-xl rounded-xl overflow-hidden ${variantClasses[variant]}`}
          initial={{ opacity: 0, scale: 0.9, y: position.includes('bottom') ? 20 : -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <div className="flex justify-between items-start p-4 border-b border-gray-100">
              {title && (
                <div>
                  <h3 className={`font-semibold text-lg ${variant === 'dark' ? 'text-white' : 'text-gray-800'}`}>{title}</h3>
                  {subtitle && <p className={`text-sm mt-1 ${variant === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>{subtitle}</p>}
                </div>
              )}
              
              {showCloseButton && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={`-mt-1 -mr-1 rounded-full h-8 w-8 ${variant === 'dark' ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-500 hover:bg-gray-100'}`}
                  onClick={onClose}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
          
          {/* Content */}
          <div className={`p-4 ${!title && !showCloseButton ? 'pt-4' : 'pt-2'}`}>
            {children}
          </div>
          
          {/* Footer */}
          {footer && (
            <div className="p-4 border-t border-gray-100 flex justify-end space-x-3">
              {footer}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
} 