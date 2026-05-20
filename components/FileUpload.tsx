
import React, { useState, useCallback, useEffect } from 'react';
import { UploadedFile } from '../types';
import { useLanguage } from '../context/LanguageContext';
import heic2any from 'heic2any';

interface FileUploadProps {
  onFileSelect: (file: UploadedFile | null) => void;
  label: string;
  acceptedTypes?: string;
  value?: UploadedFile | null;
  isLoading?: boolean;
}

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
    });
}

const fileToUrl = (file: File): string => {
    return URL.createObjectURL(file);
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, label, value, acceptedTypes = "image/*,video/*,.heic,.heif", isLoading = false }) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isConverting, setIsConverting] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    if (value) {
      setFileName(value.name);
      // Create a URL if one doesn't exist (e.g., from brand assets)
      if (value.url) {
        setPreview(value.url);
      } else if (value.base64) {
        setPreview(`data:${value.type};base64,${value.base64}`);
      } else {
        setPreview(null);
      }
    } else {
      setFileName('');
      setPreview(null);
    }
  }, [value]);


  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    let file = event.target.files?.[0];
    if (file) {
      setIsConverting(true);
      try {
        const fileNameLower = file.name.toLowerCase();
        if (fileNameLower.endsWith('.heic') || fileNameLower.endsWith('.heif')) {
            const conversionResult = await heic2any({
                blob: file,
                toType: "image/jpeg",
                quality: 0.9,
            });
            const convertedBlob = Array.isArray(conversionResult) ? conversionResult[0] : conversionResult;
            const newFileName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
            file = new File([convertedBlob as Blob], newFileName, { type: 'image/jpeg' });
        }

        const base64String = await fileToBase64(file);
        const url = fileToUrl(file);
        onFileSelect({
          file,
          name: file.name,
          base64: base64String,
          type: file.type,
          url: url,
        });
      } catch (error) {
        console.error("Error processing file:", error);
        onFileSelect(null);
      } finally {
          setIsConverting(false);
      }
    }
  }, [onFileSelect]);

  const removeFile = () => {
    if (preview && preview.startsWith('blob:')) {
        URL.revokeObjectURL(preview);
    }
    onFileSelect(null);
  };
  
  const uniqueId = `file-upload-${label.replace(/\s+/g, '-')}`;
  const showLoading = isLoading || isConverting;

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-dark-text-secondary mb-2">{label}</label>
      <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dark-border border-dashed rounded-lg bg-dark-bg hover:border-brand-cyan transition-colors min-h-[160px]">
        <div className="space-y-1 text-center w-full flex flex-col justify-center">
          {showLoading ? (
             <div className="flex flex-col items-center justify-center text-center p-2">
                <svg className="animate-spin h-8 w-8 text-brand-cyan" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="mt-2 text-xs text-dark-text-secondary">{isConverting ? t('file_upload_converting') : t('file_upload_ai_analyzing')}</p>
            </div>
          ) : value ? (
            <div className="relative group">
              <div className="mx-auto flex items-center justify-center flex-col h-24">
                  {preview && value.type.startsWith('image/') ? (
                    <img src={preview} alt="Preview" className="mx-auto h-full max-h-24 w-auto object-contain rounded-lg" />
                  ) : preview && value.type.startsWith('video/') ? (
                    <video src={preview} muted loop autoPlay playsInline className="mx-auto h-full max-h-24 w-auto object-contain rounded-lg" />
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-dark-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="mt-1 text-sm text-brand-cyan font-semibold">{t('preview')}</p>
                    </>
                  )}
              </div>
              <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                <button onClick={removeFile} type="button" className="text-white bg-brand-coral hover:bg-brand-coral/90 rounded-full p-2 focus:outline-none focus:ring-2 focus:ring-brand-coral">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                </button>
              </div>
               <p className="text-xs text-dark-text-secondary mt-1 truncate">{fileName}</p>
            </div>
          ) : (
            <>
              <svg className="mx-auto h-12 w-12 text-dark-text-secondary/70" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="flex text-sm text-dark-text-secondary justify-center">
                <label htmlFor={uniqueId} className="relative cursor-pointer bg-dark-card rounded-lg font-medium text-brand-cyan hover:text-brand-cyan/90 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-dark-bg focus-within:ring-brand-cyan px-1">
                  <span>{t('file_upload_action')}</span>
                  <input id={uniqueId} name={uniqueId} type="file" className="sr-only" onChange={handleFileChange} accept={acceptedTypes} />
                </label>
                <p className="pl-1">{t('file_upload_drag_drop')}</p>
              </div>
              <p className="text-xs text-dark-text-secondary">{t('file_upload_types')}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
