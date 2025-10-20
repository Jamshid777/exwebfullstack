import React, { createContext, useState, useContext, ReactNode, useCallback, useMemo, useEffect } from 'react';

type Language = 'en' | 'uz';
type Locale = 'en-US' | 'uz-UZ';
type Translations = Record<string, any>;

interface I18nContextType {
    language: Language;
    locale: Locale;
    setLanguage: (lang: Language) => void;
    t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [language, setLanguageState] = useState<Language>('en');
    const [locale, setLocale] = useState<Locale>('en-US');
    const [translations, setTranslations] = useState<Record<Language, Translations> | null>(null);

    useEffect(() => {
        const fetchTranslations = async () => {
            try {
                // Fetch translation files relative to the root index.html
                const [enRes, uzRes] = await Promise.all([
                    fetch('./locales/en.json'),
                    fetch('./locales/uz.json')
                ]);

                if (!enRes.ok || !uzRes.ok) {
                    throw new Error(`Failed to fetch translation files: ${enRes.status}, ${uzRes.status}`);
                }

                const [en, uz] = await Promise.all([
                    enRes.json(),
                    uzRes.json()
                ]);
                setTranslations({ en, uz });
            } catch (error) {
                console.error("Failed to load translations:", error);
                // Set empty translations on error to prevent the app from crashing
                setTranslations({ en: {}, uz: {} });
            }
        };
        fetchTranslations();
    }, []);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        setLocale(lang === 'uz' ? 'uz-UZ' : 'en-US');
    };

    const t = useCallback((key: string, params?: Record<string, string | number>): string => {
        if (!translations) {
            // Return the key as a fallback while translations are loading
            return key;
        }
        
        const getNestedTranslation = (lang: Language, translationKey: string): string | undefined => {
            return translationKey.split('.').reduce((obj, k) => obj && obj[k], translations[lang]);
        };

        let translation = getNestedTranslation(language, key);

        if (!translation) {
            // Fallback to English if the key is not found in the current language
            translation = getNestedTranslation('en', key);
            if (!translation) {
                console.warn(`Translation key "${key}" not found in any language.`);
                return key; // Return the key itself if not found in English either
            }
        }

        if (params) {
            Object.keys(params).forEach(paramKey => {
                const regex = new RegExp(`{${paramKey}}`, 'g');
                translation = translation!.replace(regex, String(params[paramKey]));
            });
        }

        return translation;
    }, [language, translations]);

    const value = useMemo(() => ({
        language,
        locale,
        setLanguage,
        t
    }), [language, locale, t]);

    return (
        <I18nContext.Provider value={value}>
            {children}
        </I18nContext.Provider>
    );
};

export const useI18n = (): I18nContextType => {
    const context = useContext(I18nContext);
    if (!context) {
        throw new Error('useI18n must be used within an I18nProvider');
    }
    return context;
};
