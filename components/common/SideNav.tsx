import React from 'react';
import { useI18n } from '../../context/I18nContext';
import Button from './Button';

interface SideNavProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (page: 'transactions' | 'shifts' | 'dashboard' | 'safe' | 'expenses') => void;
}

const SideNav: React.FC<SideNavProps> = ({
    isOpen,
    onClose,
    onNavigate,
}) => {
    const { t } = useI18n();
    
    const handleNavigation = (page: 'transactions' | 'shifts' | 'dashboard' | 'safe' | 'expenses') => {
        onNavigate(page);
        onClose();
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black bg-opacity-50 z-20 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
                aria-hidden="true"
            ></div>

            {/* SideNav Panel */}
            <div
                className={`fixed top-0 left-0 h-full w-72 bg-primary-dark text-white shadow-xl z-30 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="sidenav-title"
            >
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-primary-light">
                        <div className="flex items-center space-x-3">
                             <svg className="w-8 h-8 text-secondary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                            <h2 id="sidenav-title" className="text-xl font-bold">Menu</h2>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-md hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-white">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            <span className="sr-only">Close menu</span>
                        </button>
                    </div>

                    {/* Navigation Links */}
                    <nav className="flex-grow p-4 space-y-2">
                        <button onClick={() => handleNavigation('dashboard')} className="w-full text-left flex items-center px-3 py-2 rounded-md text-base font-medium hover:bg-primary-light transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                            {t('dashboard.pageTitle')}
                        </button>
                         <button onClick={() => handleNavigation('shifts')} className="w-full text-left flex items-center px-3 py-2 rounded-md text-base font-medium hover:bg-primary-light transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            {t('shift.pageTitle')}
                        </button>
                        <button onClick={() => handleNavigation('transactions')} className="w-full text-left flex items-center px-3 py-2 rounded-md text-base font-medium hover:bg-primary-light transition-colors">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                            {t('modals.transactionHistoryTitle')}
                        </button>
                        <button onClick={() => handleNavigation('expenses')} className="w-full text-left flex items-center px-3 py-2 rounded-md text-base font-medium hover:bg-primary-light transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" /></svg>
                            {t('modals.expenseHistoryTitle')}
                        </button>
                        <button onClick={() => handleNavigation('safe')} className="w-full text-left flex items-center px-3 py-2 rounded-md text-base font-medium hover:bg-primary-light transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                            {t('safe.pageTitle')}
                        </button>
                    </nav>
                </div>
            </div>
        </>
    );
};

export default SideNav;