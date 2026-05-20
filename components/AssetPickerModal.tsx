

import React from 'react';
import { UploadedFile } from '../types';
import { FileUpload } from './FileUpload';
import { useLanguage } from '../context/LanguageContext';
import { TranslationKey } from '../localization';

interface AssetPickerModalProps {
  onClose: () => void;
  onSelect: (file: UploadedFile) => void;
  assets: UploadedFile[];
  assetTypeLabel: string;
}

export const AssetPickerModal: React.FC<AssetPickerModalProps> = ({ onClose, onSelect, assets, assetTypeLabel }) => {
  const { t } = useLanguage();
  const handleFileSelect = (file: UploadedFile | null) => {
    if (file) {
      onSelect(file);
    }
  };

  // FIX: Added missing translation keys and logic to construct a valid key.
  const assetTypeLabelKey = `add_new_${assetTypeLabel.toLowerCase()}` as TranslationKey;
  const readableLabel = t(assetTypeLabelKey, `Upload new ${assetTypeLabel}`);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-dark-card border border-dark-border rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-dark-border flex justify-between items-center sticky top-0 bg-dark-card">
          <h2 className="text-xl font-bold text-brand-cyan">{t('choose_asset_title')}</h2>
          <button onClick={onClose} className="text-dark-text-secondary text-2xl font-bold hover:text-white">&times;</button>
        </div>
        <div className="p-6 overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <div className="border-2 border-dashed border-dark-border rounded-md min-h-[150px] flex items-center justify-center p-2">
              <FileUpload label={readableLabel} onFileSelect={handleFileSelect} value={null} />
            </div>
            {assets.map(asset => (
              <div key={asset.name} className="cursor-pointer group relative aspect-square" onClick={() => onSelect(asset)}>
                <img src={asset.url} alt={asset.name} className="w-full h-full object-cover rounded-md border-2 border-transparent group-hover:border-brand-cyan transition-all"/>
                <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
                  <p className="text-white text-sm font-bold text-center p-2">{t('select')}</p>
                </div>
              </div>
            ))}
          </div>
          {/* FIX: Use translation key for 'no assets' prompt. */}
          {assets.length === 0 && <p className="text-center text-dark-text-secondary pt-8">{t('no_assets_of_type_prompt').replace('{type}', assetTypeLabel.toLowerCase() + 's')}</p>}
        </div>
      </div>
    </div>
  );
};