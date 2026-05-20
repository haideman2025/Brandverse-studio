
import React from 'react';
import { StoryboardFrame } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { Spinner } from './Spinner';

interface StoryboardFrameCardProps {
  frame: StoryboardFrame;
  frameIndex: number;
  startTime: number;
  onGenerateSingleImage: (frame: StoryboardFrame, index: number) => void;
  isGeneratingAll: boolean;
  isGeneratingImage: boolean;
}

const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

const DetailItem: React.FC<{ label: string; value: string | null | undefined }> = ({ label, value }) => {
    if (!value) return null;
    return (
        <div className="text-sm">
            <span className="font-bold text-dark-text">{label}: </span>
            <span className="text-dark-text-secondary">{value}</span>
        </div>
    );
};

export const StoryboardFrameCard: React.FC<StoryboardFrameCardProps> = ({
  frame,
  frameIndex,
  startTime,
  onGenerateSingleImage,
  isGeneratingAll,
  isGeneratingImage,
}) => {
  const { t } = useLanguage();
  
  const formattedTime = formatTime(startTime);
  const hasImage = !!frame.generated_image_url;
  const buttonTextKey = hasImage ? 'regenerate_image' : 'generate_image';
  const buttonText = t(buttonTextKey, hasImage ? 'Regenerate Image' : 'Generate Image');


  return (
    <div className="bg-dark-card border border-dark-border rounded-xl p-4 flex flex-col space-y-3">
        <div className="flex items-start gap-3">
            <span className="text-brand-cyan font-bold text-sm leading-tight pt-0.5">{formattedTime}</span>
            <p className="text-sm text-dark-text-secondary flex-1">{frame.image_prompt}</p>
        </div>

        <div className="w-full aspect-video bg-dark-bg rounded-lg flex items-center justify-center p-2 border border-dark-border">
            {frame.generated_image_url ? (
                <img
                    src={frame.generated_image_url}
                    alt={`${t('scene')} ${frameIndex + 1}`}
                    className="w-full h-full object-contain rounded"
                />
            ) : isGeneratingImage ? (
                <Spinner message={t('generating', 'Generating...')}/>
            ) : (
                <div className="text-center text-dark-text-secondary">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    <p className="mt-1 text-xs">{t('image_will_appear_here')}</p>
                </div>
            )}
        </div>
        
        <div className="space-y-1">
            <DetailItem label={t('scene')} value={frame.scene} />
            <DetailItem label={t('action')} value={frame.action} />
            <DetailItem label={t('dialogue')} value={frame.dialogue} />
            <DetailItem label={t('transition', 'Transition')} value={frame.transition} />
        </div>

        <button 
            onClick={() => onGenerateSingleImage(frame, frameIndex)}
            disabled={isGeneratingImage || isGeneratingAll}
            className="w-full py-2 mt-auto text-sm font-semibold bg-brand-cyan text-white rounded-lg hover:bg-brand-cyan/90 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
        >
            {isGeneratingImage ? t('generating') : buttonText}
        </button>
    </div>
  );
};
