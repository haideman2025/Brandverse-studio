
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { translations, Language, TranslationKey } from '../localization';

const LANGUAGE_KEY = 'ecomgame_language';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // FIX: Corrected type inference for useState initial value.
  const [language, setLanguageState] = useState<Language>(() => {
    const storedLang = localStorage.getItem(LANGUAGE_KEY);
    if (storedLang === 'en' || storedLang === 'vi') {
        return storedLang;
    }
    return 'vi';
  });

  useEffect(() => {
    localStorage.setItem(LANGUAGE_KEY, language);
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = useCallback((key: TranslationKey, fallback?: string): string => {
    const translation = translations[language][key] || fallback || translations['en'][key] || key;
    return translation as string;
  }, [language]);


  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
