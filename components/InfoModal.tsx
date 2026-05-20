import React from 'react';
import { useLanguage } from '../context/LanguageContext';

interface InfoModalProps {
  onClose: () => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({ onClose }) => {
  const { t } = useLanguage();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-dark-card border border-dark-border rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-dark-border flex justify-between items-center sticky top-0 bg-dark-card">
          <h2 className="text-xl font-bold text-brand-cyan">BrandVerse Studio</h2>
          <button onClick={onClose} className="text-dark-text-secondary text-2xl font-bold hover:text-dark-text">&times;</button>
        </div>
        <div className="p-6 overflow-y-auto space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-dark-text mb-2">{t('info_modal_mission_title')}</h3>
            <p className="text-dark-text-secondary text-sm leading-relaxed">{t('info_modal_mission_text')}</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-dark-text mb-2">{t('info_modal_story_title')}</h3>
            <p className="text-dark-text-secondary text-sm leading-relaxed whitespace-pre-wrap">{t('info_modal_story_text')}</p>
          </div>
        </div>
        <div className="p-4 border-t border-dark-border text-right sticky bottom-0 bg-dark-card">
           <button onClick={onClose} className="px-6 py-2 bg-brand-cyan text-white font-semibold rounded-lg hover:bg-brand-cyan/90 transition-colors">
            {t('info_modal_close_button')}
          </button>
        </div>
      </div>
    </div>
  );
};