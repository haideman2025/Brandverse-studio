
import React, { useMemo } from 'react';
import { useLibrary } from '../context/LibraryContext';
import { ContentItem, ContentType } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface LibraryPickerModalProps {
  onClose: () => void;
  onSelect: (item: ContentItem) => void;
  filterTypes: ContentType[];
}

export const LibraryPickerModal: React.FC<LibraryPickerModalProps> = ({ onClose, onSelect, filterTypes }) => {
  const { contentLibrary } = useLibrary();
  const { t } = useLanguage();

  const mediaItems = useMemo(() => {
    return contentLibrary.filter(item => filterTypes.includes(item.type));
  }, [contentLibrary, filterTypes]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-dark-card border border-dark-border rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-dark-border flex justify-between items-center sticky top-0 bg-dark-card">
          <h2 className="text-xl font-bold text-brand-cyan">{t('choose_asset_title')}</h2>
          <button onClick={onClose} className="text-dark-text-secondary text-2xl font-bold hover:text-dark-text">&times;</button>
        </div>
        <div className="p-6 overflow-y-auto">
          {mediaItems.length === 0 ? (
            <p className="text-center text-dark-text-secondary py-8">{t('no_assets_in_library')}</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {mediaItems.map(item => (
                <div key={item.id} className="cursor-pointer group relative" onClick={() => onSelect(item)}>
                  {item.type === 'image' ? (
                     <img src={item.url} alt={item.name} className="w-full h-full object-cover aspect-square rounded-md border-2 border-transparent group-hover:border-brand-cyan transition-all"/>
                  ) : item.type === 'blog' ? (
                     <div className="w-full h-full object-cover aspect-square rounded-md border-2 border-transparent group-hover:border-brand-cyan transition-all flex items-center justify-center bg-dark-bg">
                        <div className="text-center p-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            <p className="text-xs text-white mt-2 line-clamp-2">{item.name}</p>
                        </div>
                    </div>
                  ) : item.type === 'ad' ? (
                     <img src={item.baseImageUrl} alt={item.name} className="w-full h-full object-cover aspect-square rounded-md border-2 border-transparent group-hover:border-brand-cyan transition-all"/>
                  ) : null }
                  
                  <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
                    <p className="text-white text-sm font-bold text-center p-2">{t('select')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="p-4 border-t border-dark-border text-right sticky bottom-0 bg-dark-card">
           <button onClick={onClose} className="px-6 py-2 bg-dark-bg text-dark-text border border-dark-border font-semibold rounded-md hover:bg-dark-border transition-colors">
            {t('cancel')}
          </button>
        </div>
      </div>
    </div>
  );
};
