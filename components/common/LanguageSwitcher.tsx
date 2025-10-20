import React from 'react';
import { useI18n } from '../../context/I18nContext';

const LanguageSwitcher: React.FC = () => {
    const { language, setLanguage } = useI18n();

    const languages = [
        { code: 'en', name: 'EN' },
        { code: 'uz', name: 'UZ' },
    ];

    return (
        <div className="flex items-center bg-primary rounded-md p-1 mr-2">
            {languages.map((lang) => (
                <button
                    key={lang.code}
                    onClick={() => setLanguage(lang.code as 'en' | 'uz')}
                    className={`px-2 py-1 text-sm font-bold rounded-md transition-colors ${
                        language === lang.code
                            ? 'bg-secondary text-primary-dark'
                            : 'text-white hover:bg-primary-light'
                    }`}
                    aria-pressed={language === lang.code}
                >
                    {lang.name}
                </button>
            ))}
        </div>
    );
};

export default LanguageSwitcher;
