import React from 'react';

import { View } from '../App';
import { useLanguage } from '../context/LanguageContext';

interface BottomNavProps {
    activeView: View;
    setActiveView: (view: View) => void;
}

const NavItem: React.FC<{
    label: string;
    icon: React.ReactNode;
    isActive: boolean;
    onClick: () => void;
}> = ({ label, icon, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`flex flex-col items-center justify-center w-full pt-2 pb-1 text-xs font-medium transition-colors ${
            isActive ? 'text-brand-cyan' : 'text-dark-text-secondary hover:text-dark-text'
        }`}
        aria-label={label}
    >
        {icon}
        <span className="mt-1">{label}</span>
    </button>
);

const CreateIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>;
const HistoryIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const LibraryIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>;
const AssetsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>;


export const BottomNav: React.FC<BottomNavProps> = ({ activeView, setActiveView }) => {
    const { t } = useLanguage();
    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-dark-card border-t border-dark-border z-20 flex justify-around">
            <NavItem label={t('bottom_nav_create')} icon={<CreateIcon />} isActive={activeView === 'creatives'} onClick={() => setActiveView('creatives')} />
            <NavItem label={t('bottom_nav_history')} icon={<HistoryIcon />} isActive={activeView === 'history'} onClick={() => setActiveView('history')} />
            <NavItem label={t('bottom_nav_library')} icon={<LibraryIcon />} isActive={activeView === 'library'} onClick={() => setActiveView('library')} />
            <NavItem label={t('bottom_nav_assets')} icon={<AssetsIcon />} isActive={activeView === 'assets'} onClick={() => setActiveView('assets')} />
        </nav>
    );
};
