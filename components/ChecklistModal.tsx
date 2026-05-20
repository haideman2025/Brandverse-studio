
import React from 'react';
import { QC_CHECKLIST_VN } from '../constants';
import { useLanguage } from '../context/LanguageContext';

interface ChecklistModalProps {
  onClose: () => void;
}

const QC_CHECKLIST_EN: string[] = [
    "Labels & text on packaging are clear, not distorted, not broken.",
    "Natural lighting, not too flat, no harsh HDR.",
    "Product scale is correct for the scene; not 'giant' or too small.",
    "Human skin (if present) is not plastic-like, no extra fingers; natural skin tone.",
    "Brand colors/tone are consistent; no overuse of filters.",
    "Clean background, no image noise, no watermarks/artifacts.",
    "Infographics: each benefit point ≤ 8 words; font size is readable on mobile.",
    "Before–After: same angle/lighting; add a disclaimer.",
    "Export fully in 1:1, 4:5, 9:16 as needed; optimized file size.",
    "Save metadata (prompt + seed + settings) to reproduce when needed."
];


export const ChecklistModal: React.FC<ChecklistModalProps> = ({ onClose }) => {
  const { language, t } = useLanguage();
  // FIX: This comparison appears to be unintentional because the types '"en"' and '"vi"' have no overlap. This is fixed by correcting the Language type in localization.ts.
  const checklist = language === 'vi' ? QC_CHECKLIST_VN : QC_CHECKLIST_EN;
  // FIX: Argument of type '"checklist_title"' is not assignable to parameter of type 'TranslationKey'.
  // Added key to localization files.
  const title = t('checklist_title');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-card border border-dark-border rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-dark-border flex justify-between items-center sticky top-0 bg-dark-card">
          <h2 className="text-xl font-bold text-brand-cyan">{title}</h2>
          <button onClick={onClose} className="text-dark-text-secondary text-2xl font-bold hover:text-dark-text">&times;</button>
        </div>
        <div className="p-6 overflow-y-auto">
          <ul className="space-y-4">
            {checklist.map((item, index) => (
              <li key={index} className="flex items-start space-x-3">
                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-brand-cyan flex items-center justify-center text-sm font-bold text-white">
                  {index + 1}
                </div>
                <p className="text-dark-text">{item}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="p-4 border-t border-dark-border text-right sticky bottom-0 bg-dark-card">
           <button onClick={onClose} className="px-6 py-2 bg-brand-cyan text-white font-semibold rounded-lg hover:bg-brand-cyan/90 transition-colors">
            {t('info_modal_close_button', 'Got it')}
          </button>
        </div>
      </div>
    </div>
  );
};
