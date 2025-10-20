import React, { createContext, useState, useContext, ReactNode, useEffect, useMemo } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [theme, setTheme] = useState<Theme>(() => {
        try {
            const storedTheme = localStorage.getItem('app-theme');
            return (storedTheme as Theme) || 'light';
        } catch {
            return 'light';
        }
    });

    useEffect(() => {
        const root = window.document.documentElement;
        
        root.classList.remove(theme === 'light' ? 'dark' : 'light');
        root.classList.add(theme);

        try {
            localStorage.setItem('app-theme', theme);
        } catch (e) {
            console.error('Failed to save theme to localStorage', e);
        }
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    };

    const value = useMemo(() => ({ theme, toggleTheme }), [theme]);

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
