import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { InfoModal } from '../components/InfoModal';

interface LoginViewProps {
  onLogin: (username: string) => string;
  onRegister: (username: string) => string;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin, onRegister }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const { language, setLanguage, t } = useLanguage();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError(t('login_error_credentials'));
      return;
    }
    setError('');

    const errorMessage = isRegistering ? onRegister(username) : onLogin(username);
    
    if (errorMessage) {
        setError(errorMessage);
    }
  };

  return (
    <>
    {isInfoModalOpen && <InfoModal onClose={() => setIsInfoModalOpen(false)} />}
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4 font-sans bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-dark-bg to-dark-bg">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center justify-center space-y-4 mb-6">
            <svg width="80" height="80" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="logo-gradient-login" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#BF4BFF"/>
                        <stop offset="50%" stopColor="#4F46E5"/>
                        <stop offset="100%" stopColor="#EC4899"/>
                    </linearGradient>
                </defs>
                <path d="M32 12L12 52H18L22 42H42L46 52H52L32 12ZM25.5 36L32 20.8L38.5 36H25.5Z" fill="url(#logo-gradient-login)"/>
                <ellipse cx="32" cy="33" rx="28" ry="12" stroke="url(#logo-gradient-login)" strokeWidth="4"/>
            </svg>
            <h1 className="text-3xl font-bold text-dark-text tracking-wider text-center font-display leading-tight">
                BrandVerse<br/>Studio
            </h1>
        </div>
        <p className="text-center text-brand-cyan mb-8 font-semibold tracking-wider">{t('login_tagline')}</p>

        <div className="bg-dark-card border border-dark-border rounded-xl shadow-xl p-8 relative">
          <div className="absolute top-4 right-4 flex space-x-2">
            {/* FIX: Type '"vi"' is not assignable to type '"en"'. This is fixed by correcting the Language type definition which is derived from the translations object in localization.ts */}
            <button onClick={() => setLanguage('vi')} className={`px-2 py-0.5 text-xs font-bold rounded-full ${language === 'vi' ? 'bg-brand-cyan text-white' : 'text-dark-text-secondary hover:bg-dark-border'}`}>VI</button>
            <button onClick={() => setLanguage('en')} className={`px-2 py-0.5 text-xs font-bold rounded-full ${language === 'en' ? 'bg-brand-cyan text-white' : 'text-dark-text-secondary hover:bg-dark-border'}`}>EN</button>
          </div>

          <h2 className="text-2xl font-bold text-center text-dark-text mb-2">{isRegistering ? t('register_title') : t('login_title')}</h2>
          <p className="text-center text-dark-text-secondary mb-6">{isRegistering ? t('register_subtitle') : t('login_subtitle')}</p>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-dark-text-secondary mb-2">
                {t('login_username_label')}
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-dark-text placeholder-dark-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-brand-cyan"
                placeholder={t('login_username_placeholder')}
              />
            </div>
            <div>
              <label htmlFor="password"className="block text-sm font-medium text-dark-text-secondary mb-2">
                {t('login_password_label')}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-dark-text placeholder-dark-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-brand-cyan"
                placeholder={t('login_password_placeholder')}
              />
            </div>
            {error && <p className="text-brand-coral text-sm text-center">{error}</p>}
            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-md font-semibold text-white bg-brand-cyan hover:bg-brand-cyan/90 disabled:opacity-50 transition-all"
              >
                {isRegistering ? t('register_button') : t('login_button')}
              </button>
            </div>
          </form>
           <p className="text-center text-sm text-dark-text-secondary mt-6">
                {isRegistering ? t('login_toggle_login') : t('login_toggle_register')}
                <button 
                  onClick={() => { setIsRegistering(!isRegistering); setError(''); }} 
                  className="font-semibold text-brand-cyan hover:text-brand-cyan/80"
                >
                     {isRegistering ? t('login_button') : t('register_button')}
                </button>
           </p>
        </div>
        <div className="text-center mt-6">
             <button onClick={() => setIsInfoModalOpen(true)} className="text-xs text-dark-text-secondary hover:text-brand-cyan underline">
                {t('login_what_is_this')}
             </button>
            <p className="text-xs text-dark-text-secondary/70 mt-2">
                {t('login_note')}
            </p>
        </div>
      </div>
    </div>
    </>
  );
};