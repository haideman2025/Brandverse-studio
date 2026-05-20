import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StoryboardContent, UploadedFile } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { Spinner } from './Spinner';
import { useBrand } from '../context/BrandContext';
// FIX: Changed VIRAL_AD_FORMULAS to CONTEXTUAL_VIRAL_FORMULAS and updated logic to use it.
import { CONTEXTUAL_VIRAL_FORMULAS, TARGET_AUDIENCE_GENDERS } from '../constants';

interface SlideshowPreviewModalProps {
  storyboardContent: StoryboardContent;
  songFile: UploadedFile | null;
  onClose: () => void;
  isGeneratingVideo: boolean;
  progressMessage: string;
}

const DetailRow: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => {
    if (!value) return null;
    return (
        <div className="grid grid-cols-3 gap-2 text-sm">
            <strong className="text-dark-text-secondary col-span-1 truncate">{label}:</strong>
            <span className="text-dark-text col-span-2">{value}</span>
        </div>
    );
};


export const SlideshowPreviewModal: React.FC<SlideshowPreviewModalProps> = ({
  storyboardContent,
  songFile,
  onClose,
  isGeneratingVideo,
  progressMessage,
}) => {
  const { t } = useLanguage();
  const { profiles } = useBrand();
  const frames = storyboardContent.storyboard.storyboard;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const settings = storyboardContent.settings as any;
  const brand = profiles.find(p => p.id === settings.brandId);
  const product = brand?.products.find(pr => pr.id === settings.selectedProductId);
  // FIX: Updated logic to find formula from the contextual object.
  const formulasForGoal = (settings.videoUsageGoal && CONTEXTUAL_VIRAL_FORMULAS[settings.videoUsageGoal]) || [];
  const formula = formulasForGoal.find(f => f.id === settings.viralAdFormula);
  const gender = TARGET_AUDIENCE_GENDERS.find(g => g.id === settings.targetGender);


  const goToNext = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % frames.length);
  }, [frames.length]);

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + frames.length) % frames.length);
  };

  useEffect(() => {
    // Note: songFile.url might be a stale blob URL if loaded from a previous session.
    // Audio playback from history is not guaranteed until DB persistence for files in settings is improved.
    if (songFile?.url) {
      const audio = new Audio(songFile.url);
      audio.volume = 0.7;
      audioRef.current = audio;

      const handleAudioEnd = () => {
        setIsPlaying(false);
      };
      audio.addEventListener('ended', handleAudioEnd);

      return () => {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.removeEventListener('ended', handleAudioEnd);
          audioRef.current = null;
        }
      };
    }
  }, [songFile]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isPlaying) {
      interval = setInterval(goToNext, 3000); 
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isPlaying, goToNext]);
  
  const handlePlayPause = () => {
      const audio = audioRef.current;
      if (!isPlaying) { 
        if (currentIndex === frames.length - 1) {
          setCurrentIndex(0);
          if (audio) {
            audio.currentTime = 0;
          }
        }
        audio?.play().catch(e => console.error("Audio play failed (URL may have expired):", e));
      } else { 
        audio?.pause();
      }
      setIsPlaying(!isPlaying);
  };

  const currentFrame = frames[currentIndex];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-dark-card border border-dark-border rounded-2xl shadow-2xl w-full max-w-7xl h-[95vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-dark-border flex justify-between items-center flex-shrink-0">
          <h2 className="text-lg font-bold text-dark-text">{t('storyboard_results_title')}</h2>
          <button onClick={onClose} className="text-dark-text-secondary text-2xl font-bold hover:text-white">&times;</button>
        </div>
        
        {isGeneratingVideo ? (
            <div className="flex-grow flex items-center justify-center">
                <Spinner message={progressMessage} />
            </div>
        ) : (
            <>
                <div className="flex-grow flex flex-col md:flex-row gap-6 p-6 overflow-hidden min-h-0">
                    {/* Left Panel: Image Viewer */}
                    <div className="w-full md:w-3/5 flex items-center justify-center bg-black rounded-xl relative p-2">
                        {currentFrame.generated_image_url ? (
                            <img
                                src={currentFrame.generated_image_url}
                                alt={`${t('scene')} ${currentIndex + 1}`}
                                className="max-w-full max-h-full object-contain rounded-lg"
                            />
                        ) : (
                            <div className="text-center text-dark-text-secondary">
                                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                <p className="mt-2 font-semibold">{t('image_will_appear_here')}</p>
                            </div>
                        )}
                    </div>

                    {/* Right Panel: Details */}
                    <div className="w-full md:w-2/5 flex flex-col overflow-y-auto pr-2 space-y-4">
                        {/* Frame Details */}
                        <div className="p-4 bg-dark-bg rounded-lg border border-dark-border">
                            <h3 className="text-lg font-bold text-brand-cyan mb-3">
                               {t('scene', 'Scene')} {currentIndex + 1}: {currentFrame.scene}
                            </h3>
                            <div className="space-y-2 text-sm">
                                <p><strong className="text-dark-text-secondary">{t('action', 'Action')}:</strong> {currentFrame.action}</p>
                                <p><strong className="text-dark-text-secondary">{t('dialogue', 'Dialogue')}:</strong> {currentFrame.dialogue || `(${t('no_dialogue', 'No dialogue')})`}</p>
                                <p><strong className="text-dark-text-secondary">{t('transition', 'Transition')}:</strong> {currentFrame.transition}</p>
                            </div>
                        </div>

                        {/* Overall Storyboard Inputs */}
                        <details className="bg-dark-bg border border-dark-border rounded-lg" open>
                            <summary className="p-3 cursor-pointer font-semibold text-dark-text">Creation Insights &amp; Inputs</summary>
                            <div className="p-4 border-t border-dark-border space-y-3">
                               <DetailRow label="Product" value={product?.product_name} />
                               <DetailRow label="Target Audience" value={`${gender ? t(gender.nameKey) : settings.targetGender}, ${settings.targetAge}`} />
                               <DetailRow label="Viral Formula" value={formula ? t(formula.nameKey) : settings.viralAdFormula} />
                               <DetailRow label="Custom Context" value={settings.customContext} />
                               <DetailRow label="Music Vibe" value={settings.musicVibe} />
                               <DetailRow label="Song" value={songFile?.name} />
                               <div className="text-sm">
                                   <strong className="text-dark-text-secondary block mb-1">Customer Insights:</strong>
                                   <p className="text-dark-text bg-dark-card p-2 rounded text-xs">{settings.customerInsights}</p>
                               </div>
                               <div className="text-sm">
                                   <strong className="text-dark-text-secondary block mb-1">Lyrics:</strong>
                                   <pre className="text-dark-text bg-dark-card p-2 rounded text-xs whitespace-pre-wrap font-mono max-h-24 overflow-y-auto">{settings.lyrics || "No lyrics provided."}</pre>
                               </div>
                            </div>
                        </details>

                         <details className="bg-dark-bg border border-dark-border rounded-lg">
                            <summary className="p-3 cursor-pointer font-semibold text-dark-text">Image Prompt for This Frame</summary>
                            <div className="p-2 border-t border-dark-border">
                                <pre className="text-xs text-dark-text-secondary p-2 rounded-lg whitespace-pre-wrap font-mono max-h-48 overflow-y-auto">{currentFrame.image_prompt}</pre>
                            </div>
                        </details>
                    </div>
                </div>

                <div className="flex-shrink-0 px-6 py-3 border-t border-dark-border flex items-center justify-between">
                    <div className="w-1/4">
                         <span className="text-sm font-semibold text-dark-text-secondary">
                             {t('scene')} {currentIndex + 1} / {frames.length}
                        </span>
                    </div>
                    <div className="flex items-center gap-6">
                        <button onClick={goToPrevious} className="p-2 rounded-full text-dark-text-secondary hover:text-white transition-colors" aria-label="Previous scene">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <button onClick={handlePlayPause} className="w-14 h-14 rounded-full bg-brand-cyan flex items-center justify-center text-white hover:bg-brand-cyan/90 transition-transform transform hover:scale-105" aria-label={isPlaying ? 'Pause slideshow' : 'Play slideshow'}>
                            {isPlaying ? (
                               <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1zm4 0a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                            ) : (
                               <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8.002v3.996a1 1 0 001.555.832l3.196-1.998a1 1 0 000-1.664l-3.196-1.998z" clipRule="evenodd" /></svg>
                            )}
                        </button>
                        <button onClick={goToNext} className="p-2 rounded-full text-dark-text-secondary hover:text-white transition-colors" aria-label="Next scene">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </div>
                    <div className="w-1/4 flex items-center">
                         <div className="w-full bg-dark-border rounded-full h-1.5" aria-label="Slideshow progress">
                            <div className="bg-brand-cyan h-1.5 rounded-full" style={{ width: `${((currentIndex + 1) / frames.length) * 100}%` }} role="progressbar" aria-valuenow={currentIndex + 1} aria-valuemin={1} aria-valuemax={frames.length}></div>
                        </div>
                    </div>
                </div>
            </>
        )}
      </div>
    </div>
  );
};
