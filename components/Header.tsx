import React from 'react';
import { View } from '../App';
import { useLanguage } from '../context/LanguageContext';

interface HeaderProps {
  activeView: View;
  setActiveView: (view: View) => void;
  currentUser: string | null;
  onLogout: () => void;
}

const NavButton: React.FC<{
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
      isActive
        ? 'bg-brand-cyan text-white'
        : 'text-dark-text-secondary hover:bg-dark-border hover:text-dark-text'
    }`}
  >
    {label}
  </button>
);

export const Header: React.FC<HeaderProps> = ({ activeView, setActiveView, currentUser, onLogout }) => {
  const { t } = useLanguage();

  return (
    <header className="bg-dark-card/80 backdrop-blur-sm border-b border-dark-border sticky top-0 z-10">
      <div className="container mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
           <svg width="40" height="40" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                  <linearGradient id="logo-gradient-header" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#BF4BFF"/>
                      <stop offset="50%" stopColor="#4F46E5"/>
                      <stop offset="100%" stopColor="#EC4899"/>
                  </linearGradient>
              </defs>
              <path d="M32 12L12 52H18L22 42H42L46 52H52L32 12ZM25.5 36L32 20.8L38.5 36H25.5Z" fill="url(#logo-gradient-header)"/>
              <ellipse cx="32" cy="33" rx="28" ry="12" stroke="url(#logo-gradient-header)" strokeWidth="4"/>
          </svg>
          <div className="flex flex-col">
            <span className="text-sm md:text-base font-bold font-sans text-dark-text leading-none tracking-wider">BrandVerse</span>
            <span className="text-xs font-semibold font-sans text-dark-text-secondary leading-none tracking-wider">Studio</span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
            <nav className="hidden md:flex items-center space-x-2 bg-dark-bg p-1 rounded-xl border border-dark-border">
              <NavButton label={t('header_nav_creatives')} isActive={activeView === 'creatives'} onClick={() => setActiveView('creatives')} />
              <NavButton label={t('header_nav_history')} isActive={activeView === 'history'} onClick={() => setActiveView('history')} />
              <NavButton label={t('header_nav_library')} isActive={activeView === 'library'} onClick={() => setActiveView('library')} />
              <NavButton label={t('header_nav_assets')} isActive={activeView === 'assets'} onClick={() => setActiveView('assets')} />
            </nav>
            {currentUser && (
                <div className="flex items-center space-x-3">
                    <span className="hidden sm:inline text-sm text-dark-text-secondary">
                        {t('header_welcome')}{' '}
                        <span className="font-bold text-dark-text">{currentUser}</span>
                    </span>
                    <button onClick={onLogout} className="px-3 py-2 text-sm font-semibold rounded-lg bg-dark-card hover:bg-brand-coral/20 hover:text-brand-coral border border-dark-border transition-colors">
                        {t('header_logout')}
                    </button>
                </div>
            )}
        </div>
      </div>
    </header>
  );
};