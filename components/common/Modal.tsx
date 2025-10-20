

import React, { Fragment } from 'react';
import { useI18n } from '../../context/I18nContext';


interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer }) => {
  const { t } = useI18n();
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center"
      onClick={onClose}
    >
      <div 
        className="bg-surface dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg m-4 transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
          <h3 className="text-xl font-semibold text-text-primary dark:text-slate-100">{title}</h3>
          <button onClick={onClose} className="text-text-secondary dark:text-slate-400 hover:text-text-primary dark:hover:text-slate-200" aria-label={t('buttons.cancel')}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
        {footer && (
          <div className="flex justify-end items-center p-4 bg-gray-50 dark:bg-slate-900/50 border-t border-gray-200 dark:border-slate-700 rounded-b-lg">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;