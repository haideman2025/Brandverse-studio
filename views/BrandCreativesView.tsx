
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useBrand } from '../context/BrandContext';
import { useLibrary } from '../context/LibraryContext';
import { SCENES, BRAND_STYLE_OPTIONS, CAMERA_SHOTS, ASPECT_RATIOS, IMAGE_FORMATS, TARGET_AUDIENCE_AGES, TARGET_AUDIENCE_GENDERS, VIDEO_USAGE_GOALS, CONTEXTUAL_VIRAL_FORMULAS, BRAND_FONTS, AD_GOALS, BLOG_LENGTHS, BLOG_GOALS, HUMANIZE_TONE_OPTIONS } from '../constants';
// FIX: Update Storyboard type import to StoryboardContent which includes an ID.
import { ImageType, UploadedFile, ImageContent, BrandStyle, CameraShot, AspectRatio, AdTextStyle, VideoDuration, ImageFormat, Storyboard, TargetAudienceAge, TargetAudienceGender, VideoUsageGoal, ViralAdFormula, StoryboardContent, AdGoal, AdContent, StoryboardFrame, BlogContent, BlogSection, BlogLength, BlogGoal, CharacterAnalysis, VideoContent, PlatformName, PointOfView, HumanizeTone, AIDetectionResult, ContentItem, Product, MusicVibe, VirtualIdol } from '../types';
import { buildPrompt } from '../services/promptService';
// FIX: Corrected the import for `generateVideoFromStoryboard` to point to the existing `geminiService.ts`
// instead of the non-existent `videoGeneratorService.ts`, and merged the imports.
import { generateEcomImage, generateStoryboard, extractImagePart, generateAdCopy, AdCopy, generateBlogPost, BlogPost, generateBlogIdeas, BlogIdea, analyzeCharacterImage, generateCharacterInsights, generateContextSuggestions, generateVideo, generateVideoClipFromFrames, generateVideoFromStoryboard, detectAIContent, humanizeContent, regenerateStoryboardFrames, getHumanizeSuggestions, HumanizeSuggestion, generateStoryboardFromInspiration } from '../services/geminiService';
import { Spinner } from '../components/Spinner';
import { FileUpload } from '../components/FileUpload';
import { View, EditingHistoryState, CreationMode, ContentSubMode } from '../App';
import { parseGeminiError } from '../services/errorService';
import { StoryboardFrameCard } from '../components/StoryboardFrameCard';
import { AssetPickerModal } from '../components/AssetPickerModal';
import { LibraryPickerModal } from '../components/LibraryPickerModal';
import { SlideshowPreviewModal } from '../components/SlideshowPreviewModal';
import { PLATFORM_PLACEMENTS } from '../components/AdPreviews';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../localization';
import { TranslationKey } from '../localization';

// Helper function to convert File/Blob to Base64 string
const fileToBase64 = (file: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
    });
};

// Helper function to ensure an UploadedFile object has its base64 property populated.
const ensureBase64 = async (file: UploadedFile): Promise<UploadedFile> => {
    if (file.base64) {
        return file;
    }
    
    let blobSource: Blob | undefined = file.file;
    
    // If there's no file object, try fetching from the URL
    if (!blobSource && file.url) {
        try {
            const response = await fetch(file.url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            blobSource = await response.blob();
        } catch (error) {
            console.error(`Failed to fetch blob from URL: ${file.url}`, error);
            // Can't generate base64, return original object
            return file;
        }
    }

    if (blobSource) {
        try {
            const base64 = await fileToBase64(blobSource);
            return { ...file, base64, file: blobSource as File };
        } catch (error) {
            console.error('Error converting blob to base64', error);
        }
    }

    console.warn('Could not generate base64 for file:', file.name);
    return file;
};

const AD_TEXT_STYLES: AdTextStyle[] = ['Minimalist', 'Bold & Punchy', 'Elegant Script', 'Modern Sans-serif'];

const POV_OPTIONS: { id: PointOfView, name: string }[] = [
    { id: 'FIRST_PERSON_I', name: "Ngôi thứ nhất (Tôi)" },
    { id: 'SECOND_PERSON_YOU', name: "Ngôi thứ hai (Bạn)" },
    { id: 'THIRD_PERSON_HE_SHE', name: "Ngôi thứ ba (Anh ấy/Cô ấy)" },
    { id: 'BRAND_WE', name: "Thương hiệu (Chúng tôi)" },
];

const MUSIC_VIBE_OPTIONS: { id: MusicVibe, nameKey: TranslationKey }[] = [
    { id: 'Romantic', nameKey: 'music_vibe_romantic' },
    { id: 'Powerful', nameKey: 'music_vibe_powerful' },
    { id: 'Fun', nameKey: 'music_vibe_fun' },
    { id: 'Cinematic', nameKey: 'music_vibe_cinematic' },
];

const Gauge: React.FC<{ value: number }> = ({ value }) => {
  const percentage = Math.max(0, Math.min(100, value));
  const rotation = (percentage / 100) * 180;
  const color = percentage > 75 ? '#FF3D57' : percentage > 50 ? '#FBBF24' : '#22C55E';

  return (
    <div className="w-32 h-16 relative">
      <div className="w-32 h-16 overflow-hidden">
        <div 
          className="w-32 h-32 rounded-full border-[16px] border-dark-border" 
          style={{ clipPath: 'inset(50% 0 0 0)' }}
        />
      </div>
      <div 
        className="w-32 h-16 overflow-hidden absolute top-0"
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        <div 
          className="w-32 h-32 rounded-full border-[16px]"
          style={{ borderColor: color, clipPath: 'inset(50% 0 0 0)', transform: 'rotate(-180deg)' }}
        />
      </div>
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
        <span className="text-xl font-bold" style={{ color }}>{percentage}%</span>
        <span className="text-xs block text-dark-text-secondary">AI Score</span>
      </div>
    </div>
  );
};


interface ContentRefinementPanelProps {
  originalText: string;
  onApplyChanges: (newText: string) => void;
  contentId: string; // Used to reset state when content changes
  contentType: 'storyboard' | 'ad' | 'blog';
  product: Product | undefined;
  characterAnalysis: CharacterAnalysis | null;
  customerInsights: string;
  context: string;
}

const ContentRefinementPanel: React.FC<ContentRefinementPanelProps> = ({ originalText, onApplyChanges, contentId, contentType, product, characterAnalysis, customerInsights, context }) => {
    const [aiDetectionResult, setAiDetectionResult] = useState<AIDetectionResult | null>(null);
    const [isDetecting, setIsDetecting] = useState(false);
    const [humanizedText, setHumanizedText] = useState<string | null>(null);
    const [isHumanizing, setIsHumanizing] = useState(false);
    const [selectedTone, setSelectedTone] = useState<HumanizeTone>('EVERYDAY_USER');
    const [selectedPov, setSelectedPov] = useState<PointOfView>('SECOND_PERSON_YOU');
    const [customPersona, setCustomPersona] = useState('');
    const [error, setError] = useState<string | null>(null);
    const { t } = useLanguage();
    const [suggestions, setSuggestions] = useState<HumanizeSuggestion[]>([]);
    const [suggestionScores, setSuggestionScores] = useState<Record<number, AIDetectionResult | null>>({});
    const [isScoringSuggestion, setIsScoringSuggestion] = useState<number | null>(null);

    useEffect(() => {
        // Reset state when the content being refined changes
        setAiDetectionResult(null);
        setHumanizedText(null);
        setIsDetecting(false);
        setIsHumanizing(false);
        setError(null);
        setSuggestions([]);
        setSuggestionScores({});
        setIsScoringSuggestion(null);
    }, [contentId]);
    

    const handleDetectAI = async () => {
        setIsDetecting(true);
        setError(null);
        setSuggestions([]);
        setHumanizedText(null);
        setAiDetectionResult(null);
        try {
            const detectionResult = await detectAIContent(originalText);
            setAiDetectionResult(detectionResult);
            if (detectionResult.percentage >= 40 && product) {
                const suggestionResult = await getHumanizeSuggestions(
                    originalText,
                    detectionResult,
                    product,
                    characterAnalysis,
                    customerInsights,
                    context
                );
                setSuggestions(suggestionResult);
                if (suggestionResult.length > 0) {
                  setHumanizedText(suggestionResult[0].content);
                }
            }
        } catch (err) {
            setError(parseGeminiError(err));
        } finally {
            setIsDetecting(false);
        }
    };
    
    const handleScoreSuggestion = async (text: string, index: number) => {
        setIsScoringSuggestion(index);
        setError(null);
        try {
            const result = await detectAIContent(text);
            setSuggestionScores(prev => ({...prev, [index]: result}));
        } catch (err) {
            setError(parseGeminiError(err));
            setSuggestionScores(prev => ({...prev, [index]: { percentage: -1, reasoning: 'Error scoring' }}));
        } finally {
            setIsScoringSuggestion(null);
        }
    };

    const handleHumanize = async () => {
        setIsHumanizing(true);
        setError(null);
        try {
            const result = await humanizeContent(originalText, selectedTone, selectedPov, customPersona, contentType);
            setHumanizedText(result);
        } catch (err) {
            setError(parseGeminiError(err));
        } finally {
            setIsHumanizing(false);
        }
    };

    const SuggestionScoreDisplay: React.FC<{ score: number | undefined }> = ({ score }) => {
        if (score === undefined || score < 0) return null;
        const color = score > 75 ? 'text-brand-coral' : score > 50 ? 'text-yellow-400' : 'text-brand-green';
        return <span className={`font-bold text-lg ${color}`}>{score}%</span>;
    };

    return (
        <div className="p-4 bg-dark-bg rounded-xl border border-dark-border animate-fade-in space-y-4">
            <h4 className="text-md font-semibold text-center text-brand-cyan">Tinh chỉnh & Nhân hóa Nội dung</h4>
            
            <div className="p-3 bg-dark-card rounded-lg border border-dark-border">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex-1">
                        <h5 className="font-semibold">Phân tích mức độ AI</h5>
                        <p className="text-xs text-dark-text-secondary mt-1">Để AI tự đánh giá xem văn bản có giống máy viết không. Điểm càng cao, văn bản càng cần được "nhân hóa".</p>
                    </div>
                    <button onClick={handleDetectAI} disabled={isDetecting} className="w-full md:w-auto px-4 py-2 text-sm font-semibold bg-brand-purple text-white rounded-lg hover:bg-brand-purple/90 disabled:opacity-50">
                        {isDetecting ? 'Đang phân tích...' : 'Chấm điểm AI'}
                    </button>
                </div>
                {isDetecting && <div className="text-center p-4"><Spinner message="Đang phân tích..."/></div>}
                {aiDetectionResult && !isDetecting && (
                    <div className="mt-4 pt-4 border-t border-dark-border flex flex-col md:flex-row items-center gap-4 animate-fade-in">
                        <Gauge value={aiDetectionResult.percentage} />
                        <div className="flex-1 text-center md:text-left">
                            <p className="font-semibold">Lý do:</p>
                            <p className="text-sm text-dark-text-secondary">{aiDetectionResult.reasoning}</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-3 bg-dark-card rounded-lg border border-dark-border space-y-3">
                 <h5 className="font-semibold">Viết lại cho "Người" hơn</h5>
                 <p className="text-xs text-dark-text-secondary">Chọn một phong cách viết để AI học theo và tạo ra phiên bản nội dung tự nhiên, có cá tính hơn.</p>

                 <details className="bg-dark-bg border border-dark-border rounded-lg pt-2">
                    <summary className="px-3 pb-2 cursor-pointer text-sm font-semibold text-dark-text-secondary">Tùy chỉnh Nâng cao</summary>
                    <div className="p-3 border-t border-dark-border space-y-3">
                       <div className="flex flex-wrap gap-2">
                          {HUMANIZE_TONE_OPTIONS.map(option => (
                              <button key={option.id} onClick={() => setSelectedTone(option.id)} className={`px-3 py-1.5 text-xs rounded-lg ${selectedTone === option.id ? 'bg-brand-cyan text-white' : 'bg-dark-bg border border-dark-border hover:bg-dark-border'}`}>
                                  {t(option.nameKey)}
                              </button>
                          ))}
                       </div>
                        <div>
                            <label className="text-xs font-semibold text-dark-text-secondary mb-2 block">Ngôi xưng (Point of View)</label>
                            <div className="flex flex-wrap gap-2">
                                {POV_OPTIONS.map(option => (
                                    <button key={option.id} onClick={() => setSelectedPov(option.id)} className={`px-3 py-1.5 text-xs rounded-lg ${selectedPov === option.id ? 'bg-brand-purple text-white' : 'bg-dark-card hover:bg-dark-border'}`}>
                                        {option.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-dark-text-secondary mb-1 block">Chân dung tùy chỉnh (Tùy chọn)</label>
                            <textarea
                                value={customPersona}
                                onChange={(e) => setCustomPersona(e.target.value)}
                                rows={2}
                                className="w-full p-2 bg-dark-bg border border-dark-border rounded-lg text-sm text-dark-text-secondary focus:ring-1 focus:ring-brand-purple"
                                placeholder="VD: Một chuyên gia công nghệ U40, hoài nghi nhưng công bằng, thích các chi tiết kỹ thuật."
                            />
                        </div>
                         <button onClick={handleHumanize} disabled={isHumanizing} className="w-full py-2 px-4 bg-brand-green text-white font-semibold rounded-lg hover:bg-brand-green/90 disabled:opacity-50">
                           {isHumanizing ? 'Đang viết lại...' : 'Thực hiện Nhân hóa thủ công'}
                         </button>
                    </div>
                 </details>

                 {suggestions.length > 0 && !isDetecting && (
                    <div className="space-y-2 pt-3 mt-3 border-t border-dark-border">
                        <h6 className="text-xs font-semibold text-dark-text-secondary uppercase">Gợi ý viết lại (Chọn để xem trước & chấm điểm):</h6>
                        {suggestions.map((s, i) => (
                            <div key={i} className={`flex items-stretch justify-between gap-3 p-2 rounded-lg border transition-colors ${humanizedText === s.content ? 'bg-brand-cyan/20 border-brand-cyan' : 'bg-dark-bg border-dark-border'}`}>
                                <button onClick={() => setHumanizedText(s.content)} className="flex-grow text-left p-1 hover:bg-dark-card/50 rounded-md">
                                    <strong className="text-sm text-brand-cyan">{s.title}</strong>
                                    <p className="text-xs text-dark-text-secondary line-clamp-2 mt-1">{s.content}</p>
                                </button>
                                <div className="flex flex-col items-center justify-center w-24 flex-shrink-0 text-center border-l border-dark-border pl-3">
                                    {isScoringSuggestion === i ? (
                                        <svg className="animate-spin h-6 w-6 text-brand-cyan" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    ) : suggestionScores[i] ? (
                                        <>
                                            <SuggestionScoreDisplay score={suggestionScores[i]?.percentage} />
                                            <span className="text-xs text-dark-text-secondary">AI Score</span>
                                        </>
                                    ) : (
                                        <button onClick={() => handleScoreSuggestion(s.content, i)} disabled={isScoringSuggestion !== null} className="px-2 py-1 text-xs font-semibold bg-brand-purple text-white rounded-lg hover:bg-brand-purple/90 disabled:opacity-50">
                                            Chấm điểm
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                 )}
            </div>
            
            {isHumanizing && <div className="text-center p-4"><Spinner message="AI đang viết lại..."/></div>}
            
            {humanizedText && !isHumanizing && (
                <div className="animate-fade-in">
                    <h5 className="text-lg font-bold text-center mb-2">So sánh phiên bản</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-3 bg-dark-card rounded-lg">
                            <h6 className="font-semibold text-center text-dark-text-secondary mb-2">AI Gốc</h6>
                            <pre className="text-sm whitespace-pre-wrap font-sans bg-dark-bg p-2 rounded-md h-64 overflow-y-auto">{originalText}</pre>
                        </div>
                        <div className="p-3 bg-dark-card rounded-lg border-2 border-brand-green">
                            <h6 className="font-semibold text-center text-brand-green mb-2">Đã Nhân hóa</h6>
                            <pre className="text-sm whitespace-pre-wrap font-sans bg-dark-bg p-2 rounded-md h-64 overflow-y-auto">{humanizedText}</pre>
                        </div>
                    </div>
                    <button onClick={() => onApplyChanges(humanizedText)} className="w-full mt-4 py-2 px-4 bg-brand-cyan text-white font-bold rounded-lg hover:bg-brand-cyan/90">
                        Sử dụng phiên bản này
                    </button>
                </div>
            )}
            
            {error && <p className="text-xs text-brand-coral mt-2 text-center">{error}</p>}
        </div>
    );
};

interface BrandCreativesViewProps {
  editingHistoryItem: EditingHistoryState | null;
  onEditComplete: () => void;
  setActiveView: (view: View) => void;
}

const OptionSelector = <T extends string>({ title, options, selected, onSelect, disabled = false, gridCols = 'grid-cols-none', tooltips }: { title: string, options: readonly {id: T, name: string}[], selected: T, onSelect: (value: T) => void, disabled?: boolean, gridCols?: string, tooltips?: Record<string, string> }) => (
    <div>
        <h3 className="text-md font-semibold mb-3 text-dark-text">{title}</h3>
        <div className={`flex flex-wrap gap-2 ${gridCols}`}>
            {options.map(option => {
                const isSelected = selected === option.id;
                return (
                    <button 
                        key={option.id} 
                        onClick={() => onSelect(option.id)} 
                        disabled={disabled} 
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${isSelected ? 'bg-brand-cyan text-white shadow-lg' : 'bg-dark-card text-dark-text-secondary hover:bg-dark-border hover:text-dark-text'}`}
                        title={tooltips ? tooltips[option.id] : undefined}
                    >
                        {option.name}
                    </button>
                );
            })}
        </div>
    </div>
);

const TextareaInput: React.FC<{label: string; value: string; onChange: (value: string) => void; placeholder: string; rows?: number}> = ({ label, value, onChange, placeholder, rows=4 }) => (
    <div>
        <label className="block text-sm font-medium text-dark-text-secondary mb-1">{label}</label>
        <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={rows}
            className="w-full p-2 bg-dark-bg border border-dark-border rounded-lg text-sm text-dark-text-secondary focus:ring-2 focus:ring-brand-cyan"
            placeholder={placeholder}
        />
    </div>
);

const blobUrlToBase64 = (blobUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        fetch(blobUrl)
            .then(res => res.blob())
            .then(blob => {
                const reader = new FileReader();
                reader.readAsDataURL(blob);
                reader.onloadend = () => {
                    resolve(reader.result as string);
                };
                reader.onerror = reject;
            })
            .catch(reject);
    });
};

const dataUrlToUploadedFile = async (dataUrlOrBlobUrl: string, filename: string): Promise<UploadedFile> => {
    const isBlobUrl = dataUrlOrBlobUrl.startsWith('blob:');
    
    let finalDataUrl = dataUrlOrBlobUrl;
    if (isBlobUrl) {
        finalDataUrl = await blobUrlToBase64(dataUrlOrBlobUrl);
    }
    
    const res = await fetch(finalDataUrl);
    const blob = await res.blob();
    const file = new File([blob], filename, { type: blob.type });
    const base64 = finalDataUrl.split(',')[1];
    return {
        file,
        name: file.name,
        base64: base64,
        type: file.type,
        url: isBlobUrl ? dataUrlOrBlobUrl : URL.createObjectURL(blob)
    };
};


type PickerTarget = 'main_idol' | 'supporting_idol' | 'outfit' | 'ad_base' | 'blog_featured' | 'sample';
type ContentType = 'paid_ad' | 'seo_blog';


export const BrandCreativesView: React.FC<BrandCreativesViewProps> = ({ editingHistoryItem, onEditComplete, setActiveView }) => {
  const { t, language } = useLanguage();
  const { profiles, activeProfile, setActiveProfileId, updateProfile } = useBrand();
  const { projects, addContentItem, updateContentItem } = useLibrary();
  
  // SHARED STATE
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [sampleFile, setSampleFile] = useState<UploadedFile | null>(null);
  const [mainIdolFile, setMainIdolFile] = useState<UploadedFile | null>(null);
  const [supportingIdolFile, setSupportingIdolFile] = useState<UploadedFile | null>(null);
  const [productFile, setProductFile] = useState<UploadedFile | null>(null);
  const [outfitFile, setOutfitFile] = useState<UploadedFile | null>(null);
  const [creationMode, setCreationMode] = useState<CreationMode>('video');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [customContext, setCustomContext] = useState('');
  const [songFile, setSongFile] = useState<UploadedFile | null>(null);
  const [lyrics, setLyrics] = useState('');
  const [musicVibe, setMusicVibe] = useState<MusicVibe>('Romantic');
  
  // SHARED STRATEGY STATE (for 'content' mode)
  const [targetAge, setTargetAge] = useState<TargetAudienceAge[]>(['25-34']);
  const [targetGender, setTargetGender] = useState<TargetAudienceGender>('Any');
  const [viralAdFormula, setViralAdFormula] = useState<ViralAdFormula>('IDOL_CENTRIC_STORY');
  const [customerInsights, setCustomerInsights] = useState('khách hàng thích sử dụng những sản phẩm trung cao cấp có câu chuyện thương hiệu có tính thân mật cao');

  // IMAGE-SPECIFIC STATE
  const [brandStyle, setBrandStyle] = useState<BrandStyle>('CUSTOM_PROMPT');
  const [imageFormat, setImageFormat] = useState<ImageFormat>('Realistic');
  const [cameraShot, setCameraShot] = useState<CameraShot>('AUTO');
  const [generatedPrompt, setGeneratedPrompt] = useState('');

  // CHARACTER ANALYSIS STATE
  const [characterAnalysis, setCharacterAnalysis] = useState<CharacterAnalysis | null>(null);
  const [supportingCharacterAnalysis, setSupportingCharacterAnalysis] = useState<CharacterAnalysis | null>(null);
  const [characterInsights, setCharacterInsights] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isAnalyzingSupporting, setIsAnalyzingSupporting] = useState<boolean>(false);
  const [selectedInsights, setSelectedInsights] = useState<string[]>([]);
  const [isGeneratingNewInsights, setIsGeneratingNewInsights] = useState(false);
  
  // STORYBOARD-SPECIFIC STATE
  const [videoDuration, setVideoDuration] = useState<VideoDuration>('30s');
  const [videoStyle, setVideoStyle] = useState<BrandStyle>('CUSTOM_PROMPT');
  const [videoUsageGoal, setVideoUsageGoal] = useState<VideoUsageGoal>('SOCIAL_MEDIA_STORY');
  const [isGeneratingFullVideo, setIsGeneratingFullVideo] = useState(false);
  const [videoProgressMessage, setVideoProgressMessage] = useState('');
  const [videoDownloadUrl, setVideoDownloadUrl] = useState<string | null>(null);
  const [generatingClipIndex, setGeneratingClipIndex] = useState<number | null>(null);
  const [isGeneratingSingleVideo, setIsGeneratingSingleVideo] = useState(false);
  const [storyboardGenerationContext, setStoryboardGenerationContext] = useState<any>(null);
  const [generatingImageForFrame, setGeneratingImageForFrame] = useState<number | null>(null);
  const [inspirationYouTubeLink, setInspirationYouTubeLink] = useState('');
  const [inspirationFile, setInspirationFile] = useState<UploadedFile | null>(null);


  // CONTENT-MODE (AD/BLOG) STATE
  const [contentType, setContentType] = useState<ContentType>('paid_ad');

  // AD-SPECIFIC STATE
  const [adBaseImage, setAdBaseImage] = useState<UploadedFile | null>(null);
  const [adGoal, setAdGoal] = useState<AdGoal>('CONVERSION');
  const [adBody, setAdBody] = useState('');
  const [adHeadline, setAdHeadline] = useState('');
  const [adCTA, setAdCTA] = useState('');
  const [adTextStyle, setAdTextStyle] = useState<AdTextStyle>('Elegant Script');
  const [textFont, setTextFont] = useState<string>('Lora');
  const [isGeneratingCopy, setIsGeneratingCopy] = useState(false);
  const [adCopyIdeas, setAdCopyIdeas] = useState<AdCopy[]>([]);
  const [selectedAdCopyIndex, setSelectedAdCopyIndex] = useState<number | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformName>('Facebook');
  const [selectedPlacementId, setSelectedPlacementId] = useState<string>('fb-feed');


  // SEO/BLOG-SPECIFIC STATE
  const [blogTopic, setBlogTopic] = useState('');
  const [blogKeywords, setBlogKeywords] = useState('');
  const [blogLength, setBlogLength] = useState<BlogLength>('MEDIUM');
  const [blogGoal, setBlogGoal] = useState<BlogGoal>('SEO_RANKING');
  const [blogFeaturedImage, setBlogFeaturedImage] = useState<UploadedFile | null>(null);
  const [blogContent, setBlogContent] = useState<BlogPost | null>(null);
  const [blogSections, setBlogSections] = useState<BlogSection[]>([]);
  const [isGeneratingImageFor, setIsGeneratingImageFor] = useState<number | null>(null);
  const [isGeneratingBlogIdeas, setIsGeneratingBlogIdeas] = useState(false);
  const [blogIdeas, setBlogIdeas] = useState<BlogIdea[]>([]);
  const [selectedBlogIdeaIndex, setSelectedBlogIdeaIndex] = useState<number | null>(null);
  const [isGeneratingAllIllustrations, setIsGeneratingAllIllustrations] = useState(false);
  const [generatingAllIllustrationsProgress, setGeneratingAllIllustrationsProgress] = useState('');
  const [currentBlogItem, setCurrentBlogItem] = useState<BlogContent | null>(null);


  // OUTPUT STATE
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSegmenting, setIsSegmenting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  // FIX: Change the state type from Storyboard to StoryboardContent to include an ID.
  const [generatedStoryboard, setGeneratedStoryboard] = useState<StoryboardContent | null>(null);

  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [generatingAllProgress, setGeneratingAllProgress] = useState('');
  const [isAssetPickerOpen, setIsAssetPickerOpen] = useState(false); // For face/outfit assets
  const [isLibraryPickerOpen, setIsLibraryPickerOpen] = useState(false); // For general library images
  const [isStoryboardPickerOpen, setIsStoryboardPickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
  const [isSlideshowOpen, setIsSlideshowOpen] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);

  // CONTEXT SUGGESTION STATE
  const [isGeneratingContexts, setIsGeneratingContexts] = useState(false);
  const [suggestedContexts, setSuggestedContexts] = useState<string[]>([]);
  const [selectedSuggestedContext, setSelectedSuggestedContext] = useState<string | null>(null);
  
  const product = activeProfile?.products.find(p => p.id === selectedProductId);
  const availableViralFormulas = CONTEXTUAL_VIRAL_FORMULAS[videoUsageGoal] || [];

    useEffect(() => {
        const formulas = CONTEXTUAL_VIRAL_FORMULAS[videoUsageGoal] || [];
        if (formulas.length > 0 && !formulas.some(f => f.id === viralAdFormula)) {
            setViralAdFormula(formulas[0].id);
        }
    }, [videoUsageGoal, viralAdFormula]);

    const viralAdFormulaTooltips = useMemo(() => {
        const formulas = CONTEXTUAL_VIRAL_FORMULAS[videoUsageGoal] || [];
        return formulas.reduce((acc, item) => {
            acc[item.id] = t(item.descriptionKey);
            return acc;
        }, {} as Record<string, string>);
    }, [videoUsageGoal, t]);

    const handleTargetAgeChange = (age: TargetAudienceAge) => {
        setTargetAge(prev => {
            const newAges = prev.includes(age)
                ? prev.filter(a => a !== age)
                : [...prev, age];
            // Ensure at least one age is selected
            return newAges.length > 0 ? newAges : prev;
        });
    };

  // Helper to get all current settings for saving to history
  const getCurrentCreationContext = useCallback(() => {
    const createRef = (file: UploadedFile | null) => file ? { name: file.name, url: file.url, type: file.type } : null;

    return {
      brandId: activeProfile?.id,
      selectedProductId,
      mainIdol: createRef(mainIdolFile),
      supportingIdol: createRef(supportingIdolFile),
      productImage: createRef(productFile),
      outfit: createRef(outfitFile),
      song: createRef(songFile),
      lyrics,
      musicVibe,
      customerInsights,
      viralAdFormula,
      targetAge,
      targetGender,
      aspectRatio,
      customContext,
    };
  }, [
    activeProfile?.id, selectedProductId, mainIdolFile, supportingIdolFile, productFile, outfitFile, songFile,
    lyrics, musicVibe, customerInsights, viralAdFormula, targetAge, targetGender, aspectRatio, customContext
  ]);

  // FIX: This useEffect keeps the storyboard generation context up-to-date.
  // This is crucial for allowing regeneration/humanization of scripts after a storyboard is loaded from the library.
  useEffect(() => {
    if (creationMode === 'video' && generatedStoryboard && product) {
        const genderName = TARGET_AUDIENCE_GENDERS.find(g => g.id === targetGender);
        const audience = `${(genderName ? t(genderName.nameKey) : 'Mọi giới tính')}, ${targetAge.map(ageId => TARGET_AUDIENCE_AGES.find(a => a.id === ageId)?.name).filter(Boolean).join(', ')}.`;
        const context = (videoStyle === 'CUSTOM_PROMPT') 
            ? customContext 
            : (SCENES.find(s => s.id === videoStyle)?.description || 'Một bối cảnh phù hợp với sản phẩm.');
        const usageGoalDesc = VIDEO_USAGE_GOALS.find(g => g.id === videoUsageGoal) ? t(VIDEO_USAGE_GOALS.find(g => g.id === videoUsageGoal)!.descriptionKey) : 'Video quảng cáo chung.';
        const adFormulaDesc = (CONTEXTUAL_VIRAL_FORMULAS[videoUsageGoal] || []).find(f => f.id === viralAdFormula) ? t((CONTEXTUAL_VIRAL_FORMULAS[videoUsageGoal] || []).find(f => f.id === viralAdFormula)!.descriptionKey) : 'Không có công thức cụ thể.';

        const newContext = {
            product, videoDuration, aspectRatio, idolFile: mainIdolFile, supportingIdolFile, productFile, outfitFile,
            context, audience, customerInsights, usageGoal: usageGoalDesc, adFormula: adFormulaDesc, language, musicVibe, lyrics
        };
        setStoryboardGenerationContext(newContext);
    } else {
        setStoryboardGenerationContext(null);
    }
  }, [
      creationMode, generatedStoryboard, product, 
      targetGender, targetAge, videoStyle, customContext, videoUsageGoal, viralAdFormula,
      videoDuration, aspectRatio, mainIdolFile, supportingIdolFile, productFile, outfitFile,
      customerInsights, language, musicVibe, lyrics, t
  ]);

  // Auto-populate product image from assets
  useEffect(() => {
    if (product?.productImage) {
        ensureBase64(product.productImage).then(setProductFile);
    } else {
        setProductFile(null); // Clear if new product has no image
    }
  }, [product]);

  // Sync selected insights to the main customerInsights textarea
  useEffect(() => {
    if (selectedInsights.length > 0) {
        setCustomerInsights(selectedInsights.join('; '));
    }
  }, [selectedInsights]);

  // Automatically detect video duration from uploaded song
  useEffect(() => {
    if (songFile?.url) {
        const audio = new Audio(songFile.url);
        const handleMetadata = () => {
            const durationInSeconds = Math.round(audio.duration);
            if (durationInSeconds > 0) {
                setVideoDuration(`${durationInSeconds}s`);
            }
        };
        audio.addEventListener('loadedmetadata', handleMetadata);
        return () => {
            audio.removeEventListener('loadedmetadata', handleMetadata);
        };
    } else {
        // Reset to a default if the song is removed, or keep it if a storyboard is loaded
        if (!generatedStoryboard) {
          setVideoDuration('30s');
        }
    }
  }, [songFile, generatedStoryboard]);

  // Automatically detect aspect ratio from input image
  useEffect(() => {
    const fileToAnalyze = sampleFile || mainIdolFile;

    if (fileToAnalyze?.url) {
        const img = new Image();
        img.onload = () => {
            const w = img.naturalWidth;
            const h = img.naturalHeight;
            const ratio = w / h;

            if (ratio > 1.3) { // Landscape-ish
                setAspectRatio('16:9');
            } else if (ratio < 0.75) { // Portrait-ish
                setAspectRatio('9:16');
            } else { // Square-ish
                setAspectRatio('1:1');
            }
        };
        img.onerror = () => {
            console.error("Could not load image to determine aspect ratio.");
            setAspectRatio('9:16'); // Fallback on error
        };
        img.src = fileToAnalyze.url;
    } else {
        setAspectRatio('9:16'); // Default when no image is present
    }
  }, [sampleFile, mainIdolFile]);

  const handleInsightClick = (insight: string) => {
    setSelectedInsights(prev => {
        if (prev.includes(insight)) {
            return prev.filter(i => i !== insight); // Deselect
        } else {
            return [...prev, insight]; // Select
        }
    });
  };

  const handleRegenerateInsights = async () => {
    if (!characterAnalysis || !product) return;
    setIsGeneratingNewInsights(true);
    try {
        const insights = await generateCharacterInsights(product, characterAnalysis, supportingCharacterAnalysis);
        setCharacterInsights(insights);
        setSelectedInsights([]); // Clear previous selections
    } catch (err) {
        setError(`Failed to regenerate insights: ${parseGeminiError(err)}`);
    } finally {
        setIsGeneratingNewInsights(false);
    }
  };

  const runCharacterAnalysis = useCallback(async (file: UploadedFile, type: 'primary' | 'supporting') => {
    if (!file.base64 || !product) return;
    
    if (type === 'primary') {
        setIsAnalyzing(true);
        setCharacterAnalysis(null);
    } else {
        setIsAnalyzingSupporting(true);
        setSupportingCharacterAnalysis(null);
    }
    setCharacterInsights([]);
    setSelectedInsights([]);
    
    try {
        const analysis = await analyzeCharacterImage(file.base64, file.type);
        if (type === 'primary') {
            setCharacterAnalysis(analysis);
            setTargetGender(analysis.gender === 'Other' ? 'Any' : analysis.gender);
            setTargetAge([analysis.ageRange]);
            const insights = await generateCharacterInsights(product, analysis, supportingCharacterAnalysis);
            setCharacterInsights(insights);
        } else {
            setSupportingCharacterAnalysis(analysis);
            const insights = await generateCharacterInsights(product, characterAnalysis!, analysis);
            setCharacterInsights(insights);
        }
    } catch (err) {
        const newError = `Character Analysis Failed: ${parseGeminiError(err)}`;
        setError(prev => prev ? `${prev}\n${newError}` : newError);
    } finally {
        if (type === 'primary') setIsAnalyzing(false);
        else setIsAnalyzingSupporting(false);
    }
  }, [product, characterAnalysis, supportingCharacterAnalysis]);

  const handleMainIdolFileSelect = (file: UploadedFile | null) => {
    setMainIdolFile(file);
    if (file) {
        runCharacterAnalysis(file, 'primary');
    } else {
        setCharacterAnalysis(null);
        setCharacterInsights([]);
        setSelectedInsights([]);
    }
  };

  const handleSupportingIdolFileSelect = (file: UploadedFile | null) => {
    setSupportingIdolFile(file);
    if (file) {
        runCharacterAnalysis(file, 'supporting');
    } else {
        setSupportingCharacterAnalysis(null);
    }
  };
  
  const handleSampleFileSelect = async (file: UploadedFile | null) => {
    setSampleFile(file);
    setMainIdolFile(null);
    setSupportingIdolFile(null);
    setProductFile(null);
    setOutfitFile(null);
    setCharacterAnalysis(null);
    setSupportingCharacterAnalysis(null);
    setCharacterInsights([]);
    setSelectedInsights([]);
    setError(null);

    if (file && file.base64) {
      setIsSegmenting(true);
      try {
        const results = await Promise.allSettled([
          extractImagePart(file.base64, file.type, 'face'),
          extractImagePart(file.base64, file.type, 'product'),
          extractImagePart(file.base64, file.type, 'outfit'),
        ]);
        
        const [faceRes, productRes, outfitRes] = results;

        if (faceRes.status === 'fulfilled') {
            const newFaceFile = await dataUrlToUploadedFile(faceRes.value, 'face.png');
            handleMainIdolFileSelect(newFaceFile);
        } else { console.error("Face extraction failed:", faceRes.reason); }
        if (productRes.status === 'fulfilled') {
            const newProductFile = await dataUrlToUploadedFile(productRes.value, 'product.png');
            setProductFile(newProductFile);
        } else { 
            console.error("Product extraction failed:", productRes.reason); 
            // If product extraction from sample fails, use the one from brand assets if available
            if (product?.productImage) {
                ensureBase64(product.productImage).then(setProductFile);
            }
        }
        if (outfitRes.status === 'fulfilled') {
            setOutfitFile(await dataUrlToUploadedFile(outfitRes.value, 'outfit.png'));
        } else { console.error("Outfit extraction failed:", outfitRes.reason); }
      } catch (err) {
        setError("Failed to automatically segment the image. Please upload parts manually.");
        console.error(err);
      } finally {
        setIsSegmenting(false);
      }
    }
  };


  useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

   useEffect(() => {
    if (editingHistoryItem) {
        const { item, initialMode, initialSubMode } = editingHistoryItem;

        // Reset all output states
        setGeneratedImageUrl(null);
        setGeneratedStoryboard(null);
        setBlogContent(null);
        setBlogSections([]);
        
        setCreationMode(initialMode || (item.type === 'video_script' ? 'video' : 'image'));
      
        if (item.type === 'image') {
            const { settings, url, name } = item;
            setBrandStyle(settings.brandStyle || 'CUSTOM_PROMPT');
            setCameraShot(settings.cameraShot || 'AUTO');
            setAspectRatio(settings.aspectRatio || '9:16');
            setImageFormat(settings.imageFormat || 'Realistic');
            setSelectedProductId(settings.selectedProductId || null);
            setCustomContext('');
            
            if (initialMode === 'content') {
                const newContentType: ContentType = initialSubMode === 'blog' ? 'seo_blog' : 'paid_ad';
                setContentType(newContentType);
                if (initialSubMode === 'ad') {
                    dataUrlToUploadedFile(url, `ad-base-${Date.now()}.png`).then(setAdBaseImage);
                } else { // blog
                    setBlogTopic(`Write about: ${name}`);
                    setBlogKeywords('');
                    dataUrlToUploadedFile(url, `blog-featured-${Date.now()}.png`).then(setBlogFeaturedImage);
                }
            } else { // 'image' or default
                setGeneratedImageUrl(url);
            }
        } else if (item.type === 'video_script') {
            const storyboardItem = item as StoryboardContent;
            const { settings } = storyboardItem;
            
            setGeneratedStoryboard(storyboardItem);
            
            setVideoDuration(settings.videoDuration || '30s');
            setAspectRatio(settings.aspectRatio || '9:16');
            setVideoStyle(settings.videoStyle || 'CUSTOM_PROMPT');
            setTargetAge(settings.targetAge || ['25-34']);
            setTargetGender(settings.targetGender || 'Any');
            setVideoUsageGoal(settings.videoUsageGoal || 'SOCIAL_MEDIA_STORY');
            setViralAdFormula(settings.viralAdFormula || 'IDOL_CENTRIC_STORY');
            setCustomContext(settings.customContext || '');
            
            const savedContext = settings as any;
            setSelectedProductId(savedContext.selectedProductId || null);
            setCustomerInsights(savedContext.customerInsights || '');
            setLyrics(savedContext.lyrics || '');
            setMusicVibe(savedContext.musicVibe || 'Romantic');

            const restoreFile = (fileRef: any) => fileRef ? { name: fileRef.name, type: fileRef.type, url: fileRef.url } as UploadedFile : null;
            
            setMainIdolFile(restoreFile(savedContext.mainIdol));
            setSupportingIdolFile(restoreFile(savedContext.supportingIdol));
            setProductFile(restoreFile(savedContext.productImage));
            setOutfitFile(restoreFile(savedContext.outfit));
            setSongFile(restoreFile(savedContext.song));
        }
      
      onEditComplete();
    }
  }, [editingHistoryItem, onEditComplete]);
  
  useEffect(() => {
    if (activeProfile?.products?.length) {
        const currentProductExists = activeProfile.products.some(p => p.id === selectedProductId);
        if (!currentProductExists) {
            setSelectedProductId(activeProfile.products[0].id);
        }
    } else {
        setSelectedProductId(null);
    }
  }, [activeProfile]);

  useEffect(() => {
    if (!activeProfile || !product) {
      setGeneratedPrompt('');
      return;
    };

    const aspectRatioData = ASPECT_RATIOS.find(ar => ar.id === aspectRatio);
    let aspectRatioDescription = 'specific';
    if (aspectRatioData) {
        const name = translations.en[aspectRatioData.nameKey];
        if (name.includes('Landscape')) {
            aspectRatioDescription = 'wide landscape';
        } else if (name.includes('Portrait')) {
            aspectRatioDescription = 'tall vertical';
        } else if (name.includes('Square')) {
            aspectRatioDescription = 'square';
        }
    }

    const variables: Record<string, string | undefined> = {
        image_format: imageFormat,
        // FIX: Property 'name' does not exist on type '{ id: CameraShot; nameKey: ...}'. Changed to use English translation from translations object.
        camera_shot: (CAMERA_SHOTS.find(cs => cs.id === cameraShot) ? translations.en[CAMERA_SHOTS.find(cs => cs.id === cameraShot)!.nameKey] : null) || 'an optimal angle',
        brand_tone: product.notes,
        keywords: 'approachable, confident, authentic, premium',
        brand_colors: activeProfile.colors.join(', '),
        aspect_ratio: aspectRatio,
        aspect_ratio_description: aspectRatioDescription,
        product_short: product.product_short,
    };

    variables.idol_ref = mainIdolFile ? `the user's provided face image named ${mainIdolFile.name}` : 'a person who fits the scene';
    variables.supporting_idol_ref = supportingIdolFile ? `the user's provided supporting face image named ${supportingIdolFile.name}` : 'not applicable';
    variables.product_ref = productFile ? `the user's provided product image named ${productFile.name}` : `a ${product.product_short}`;
    variables.outfit_ref = outfitFile ? `an outfit similar to the user's provided image named ${outfitFile.name}` : 'a stylish, scene-appropriate outfit';
    
    if (brandStyle === 'CUSTOM_PROMPT') {
        variables.style_name = 'custom user-defined scene';
        variables.style_desc = customContext || 'A scene that is visually appealing and brand-appropriate.';
        variables.lighting = 'natural, flattering light';
    } else {
        const selectedScene = SCENES.find(s => s.id === brandStyle);
        const styleOption = BRAND_STYLE_OPTIONS.find(o => o.id === brandStyle);
        const styleNameInEnglish = styleOption ? translations.en[styleOption.nameKey] : brandStyle;

        variables.style_name = styleNameInEnglish;
        variables.style_desc = selectedScene?.description || 'A scene that is visually appealing and brand-appropriate.';
        variables.lighting = selectedScene?.lighting || 'natural, flattering light';
    }
    
    const prompt = buildPrompt(ImageType.BRANDFACE, variables);
    setGeneratedPrompt(prompt);

  }, [mainIdolFile, supportingIdolFile, productFile, outfitFile, brandStyle, cameraShot, aspectRatio, product, activeProfile, imageFormat, customContext]);
  
  const handleGenerateImage = async () => {
    if (!selectedProjectId) {
      alert("Please select a project to save to.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setGeneratedImageUrl(null);
    setGeneratedStoryboard(null);
    setGeneratedVideoUrl(null);
    
    const finalPrompt = generatedPrompt;

    if (!finalPrompt || !product) {
        setError("Prompt cannot be empty. Please select a brand and product.");
        setIsLoading(false);
        return;
    }

    const imagesToProcess = [mainIdolFile, supportingIdolFile, productFile, outfitFile];

    try {
      const imageUrl = await generateEcomImage(finalPrompt, imagesToProcess);
      setGeneratedImageUrl(imageUrl);
      
      const styleOption = BRAND_STYLE_OPTIONS.find(o => o.id === brandStyle);
      const styleNameForDisplay = styleOption ? t(styleOption.nameKey) : brandStyle;

      const newImage: ImageContent = {
        id: crypto.randomUUID(),
        url: imageUrl,
        prompt: finalPrompt,
        settings: {
          ...getCurrentCreationContext(),
          brandStyle,
          cameraShot,
          imageFormat,
          hasSampleFile: !!sampleFile,
        },
        createdAt: new Date().toISOString(),
        type: 'image',
        projectId: selectedProjectId,
        userId: '', // Will be filled by context
        name: `${product.product_short} in ${styleNameForDisplay}`,
      };
      addContentItem(newImage);

    } catch (err: any) {
      setError(parseGeminiError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateStoryboard = useCallback(async () => {
    if (!activeProfile || !product) {
      setError("Please select an active brand and product first.");
      return;
    }
     if (!selectedProjectId) {
      alert("Please select a project before generating a storyboard.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setGeneratedStoryboard(null);
    setGeneratedImageUrl(null);

    try {
      const genderName = TARGET_AUDIENCE_GENDERS.find(g => g.id === targetGender);
      const audience = `${(genderName ? t(genderName.nameKey) : 'Mọi giới tính')}, ${targetAge.map(ageId => TARGET_AUDIENCE_AGES.find(a => a.id === ageId)?.name).filter(Boolean).join(', ')}.`;
      const usageGoalDesc = VIDEO_USAGE_GOALS.find(g => g.id === videoUsageGoal) ? t(VIDEO_USAGE_GOALS.find(g => g.id === videoUsageGoal)!.descriptionKey) : 'Video quảng cáo chung.';
      const adFormulaDesc = (CONTEXTUAL_VIRAL_FORMULAS[videoUsageGoal] || []).find(f => f.id === viralAdFormula) ? t((CONTEXTUAL_VIRAL_FORMULAS[videoUsageGoal] || []).find(f => f.id === viralAdFormula)!.descriptionKey) : 'Không có công thức cụ thể.';

      const result = await generateStoryboard(
        product, videoDuration, aspectRatio, mainIdolFile, supportingIdolFile, productFile, outfitFile,
        customContext, audience, customerInsights, usageGoalDesc, adFormulaDesc, language, musicVibe, lyrics
      );
      const newStoryboardContent: StoryboardContent = {
        id: crypto.randomUUID(),
        type: 'video_script',
        storyboard: result,
        settings: {
          ...getCurrentCreationContext(),
          videoDuration,
          videoStyle,
          videoUsageGoal
        },
        projectId: selectedProjectId,
        createdAt: new Date().toISOString(),
        name: `Storyboard for ${product.product_short}`,
        userId: '', // Will be filled by context
      };
      setGeneratedStoryboard(newStoryboardContent);
      await addContentItem(newStoryboardContent);
    } catch (err: any) {
      setError(parseGeminiError(err));
    } finally {
      setIsLoading(false);
    }
  }, [activeProfile, product, selectedProjectId, videoDuration, aspectRatio, mainIdolFile, supportingIdolFile, productFile, outfitFile, videoStyle, customerInsights, videoUsageGoal, customContext, addContentItem, language, musicVibe, lyrics, getCurrentCreationContext, targetAge, targetGender, t]);

  const handleGenerateStoryboardFromInspiration = async () => {
    if (!activeProfile || !product || !selectedProjectId) {
        setError("Please select brand, product, and project.");
        return;
    }
    if (!inspirationYouTubeLink && !inspirationFile) {
        setError("Please provide a YouTube link or a file.");
        return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedStoryboard(null);

    try {
        if (inspirationFile && inspirationFile.type !== 'text/plain') {
            throw new Error(t('error_file_type_not_supported'));
        }

        const context = {
            product,
            videoDuration,
            aspectRatio,
            idolFile: mainIdolFile,
            supportingIdolFile: supportingIdolFile,
            language,
        };
        
        const result = await generateStoryboardFromInspiration(
            { youtubeUrl: inspirationYouTubeLink, file: inspirationFile },
            context
        );
        
        const newStoryboardContent: StoryboardContent = {
            id: crypto.randomUUID(),
            type: 'video_script',
            storyboard: result,
            settings: {
              ...getCurrentCreationContext(),
              videoDuration,
              videoStyle,
              videoUsageGoal
            },
            projectId: selectedProjectId,
            createdAt: new Date().toISOString(),
            name: `Clone of ${inspirationYouTubeLink || inspirationFile?.name || 'Inspiration'}`,
            userId: '', // Will be filled by context
        };
        setGeneratedStoryboard(newStoryboardContent);
        await addContentItem(newStoryboardContent);

    } catch (err: any) {
        setError(parseGeminiError(err));
    } finally {
        setIsLoading(false);
    }
};
  
  const handleGenerateAllVideoClips = async () => {
        if (!generatedStoryboard || !product || !selectedProjectId) {
            setVideoProgressMessage("Missing storyboard, product, or project selection.");
            return;
        }

        const framesWithImages = generatedStoryboard.storyboard.storyboard.filter(f => f.generated_image_url);
        if (framesWithImages.length < 2) {
            setVideoProgressMessage("At least two frames must have generated images to create video clips.");
            return;
        }

        setIsGeneratingFullVideo(true);
        setError(null);
        setVideoDownloadUrl(null);

        const numClips = framesWithImages.length - 1;
        for (let i = 0; i < numClips; i++) {
            const firstFrame = framesWithImages[i];
            const lastFrame = framesWithImages[i + 1];

            setVideoProgressMessage(`Generating clip ${i + 1} of ${numClips}...`);

            try {
                const videoBlob = await generateVideoClipFromFrames(firstFrame, lastFrame, aspectRatio, (progress) => {
                    if (progress.includes("is creating")) {
                        setVideoProgressMessage(`Clip ${i + 1}/${numClips}: AI is working...`);
                    } else {
                        setVideoProgressMessage(`Clip ${i + 1}/${numClips}: ${progress}`);
                    }
                });

                setVideoProgressMessage(`Saving clip ${i + 1}/${numClips} to library...`);

                const videoUrl = URL.createObjectURL(videoBlob);
                const newVideoItem: Omit<VideoContent, 'id' | 'userId'> = {
                    type: 'video',
                    url: videoUrl,
                    sourceStoryboardId: generatedStoryboard.id || 'storyboard-clip',
                    projectId: selectedProjectId,
                    createdAt: new Date().toISOString(),
                    name: `Clip ${i + 1}/${numClips} for ${product.product_short}`,
                    mimeType: videoBlob.type,
                    settings: { aspectRatio }
                };
                await addContentItem(newVideoItem as any);

            } catch (err) {
                const message = `Error on clip ${i + 1}: ${parseGeminiError(err)}. Process stopped.`;
                setError(message);
                setVideoProgressMessage(message);
                setIsGeneratingFullVideo(false);
                return;
            }
        }

        setVideoProgressMessage(`Success! All ${numClips} clips saved to library.`);
        setTimeout(() => {
            setIsGeneratingFullVideo(false);
            setVideoProgressMessage('');
        }, 5000);
    };

    const handleGenerateVideoFromFrame = async (frame: StoryboardFrame, index: number) => {
        if (!frame.generated_image_url || !product || !selectedProjectId) {
            setVideoProgressMessage("Missing data to generate video clip.");
            return;
        }
        setGeneratingClipIndex(index);
        setVideoProgressMessage(`Generating clip for frame ${index + 1}...`);
        setError(null);

        try {
            const tempStoryboardContent: StoryboardContent = {
                id: `temp-${Date.now()}`,
                userId: '', // placeholder
                projectId: selectedProjectId,
                createdAt: new Date().toISOString(),
                name: `Clip for frame ${index + 1}`,
                type: 'video_script',
                storyboard: {
                    script_full: frame.dialogue || frame.action,
                    storyboard: [frame],
                },
                settings: {
                    aspectRatio: aspectRatio,
                    videoDuration: '3s', 
                    videoStyle,
                    targetAge,
                    targetGender,
                    videoUsageGoal,
                    viralAdFormula,
                    customContext,
                },
            };
            const videoBlob = await generateVideoFromStoryboard(
                tempStoryboardContent,
                (progress) => setVideoProgressMessage(`Frame ${index + 1}: ${progress}`)
            );

            const videoUrl = URL.createObjectURL(videoBlob);
            const newVideoItem: Omit<VideoContent, 'id' | 'userId'> = {
                type: 'video',
                url: videoUrl,
                sourceStoryboardId: 'single-frame', // Identifier for single clips
                projectId: selectedProjectId,
                createdAt: new Date().toISOString(),
                name: `Clip for ${product.product_short}: ${frame.scene.substring(0, 20)}`,
                mimeType: videoBlob.type,
                settings: { aspectRatio, duration: '3s' } 
            };
            await addContentItem(newVideoItem as any);
             setVideoProgressMessage(`Video clip for frame ${index + 1} saved to library!`);

        } catch (err) {
            const message = `Error generating clip: ${err instanceof Error ? err.message : 'Unknown error'}`;
            setError(message);
            setVideoProgressMessage(message);
        } finally {
            setGeneratingClipIndex(null);
            setTimeout(() => setVideoProgressMessage(''), 3000);
        }
    };

    const handleGenerateVideoFromSingleImage = async () => {
        if (!generatedImageUrl || !generatedPrompt || !product || !selectedProjectId) return;
        setIsGeneratingSingleVideo(true);
        setError(null);
        setVideoProgressMessage("Preparing image for video generation...");
        try {
            const imageFile = await dataUrlToUploadedFile(generatedImageUrl, `source-image-${Date.now()}.png`);
            
            const videoPrompt = `Create a short, dynamic 3-5 second video clip by smoothly animating this image. The original context of the image is: "${generatedPrompt}". The animation should be cinematic and engaging.`;

            const videoBlob = await generateVideo(videoPrompt, imageFile, aspectRatio, setVideoProgressMessage);

            setVideoProgressMessage("Saving video to library...");
            const videoUrl = URL.createObjectURL(videoBlob);
            setGeneratedVideoUrl(videoUrl);
            
            const newVideoItem: Omit<VideoContent, 'id' | 'userId'> = {
                type: 'video',
                url: videoUrl,
                sourceStoryboardId: 'from-single-image',
                projectId: selectedProjectId,
                createdAt: new Date().toISOString(),
                name: `Video for ${product.product_short}`,
                mimeType: videoBlob.type,
                settings: { aspectRatio }
            };
            await addContentItem(newVideoItem as any);
            setVideoProgressMessage('Video saved to library!');
            setTimeout(() => setVideoProgressMessage(''), 3000);
        } catch (err) {
            setError(parseGeminiError(err));
        } finally {
            setIsGeneratingSingleVideo(false);
        }
    };


  const handleGenerateAdCopy = async () => {
    if (!product) {
        setError("Please select a product first.");
        return;
    }
    setIsGeneratingCopy(true);
    setAdCopyIdeas([]);
    setError(null);
    const genderName = TARGET_AUDIENCE_GENDERS.find(g => g.id === targetGender);
    const audience = `${(genderName ? t(genderName.nameKey) : 'Mọi giới tính')}, ${targetAge.map(ageId => TARGET_AUDIENCE_AGES.find(a => a.id === ageId)?.name).filter(Boolean).join(', ')}.`;
    const goalDesc = AD_GOALS.find(g => g.id === adGoal) ? t(AD_GOALS.find(g => g.id === adGoal)!.descriptionKey) : 'Mục tiêu quảng cáo chung.';
    const formulaDesc = (CONTEXTUAL_VIRAL_FORMULAS[videoUsageGoal] || []).find(f => f.id === viralAdFormula) ? t((CONTEXTUAL_VIRAL_FORMULAS[videoUsageGoal] || []).find(f => f.id === viralAdFormula)!.descriptionKey) : 'Không có công thức cụ thể.';

    try {
        const adCopies = await generateAdCopy(product, goalDesc, formulaDesc, audience, customerInsights);
        setAdCopyIdeas(adCopies);
        if (adCopies.length > 0) {
            setSelectedAdCopyIndex(0);
            setAdHeadline(adCopies[0].headline);
            setAdBody(adCopies[0].body);
            setAdCTA(adCopies[0].cta);
        }
    } catch (err: any) {
        setError(parseGeminiError(err));
    } finally {
        setIsGeneratingCopy(false);
    }
  };
  
  const handleSaveAdToLibrary = async () => {
     if (!adBaseImage?.url || !selectedProjectId || !product) {
        alert("Please select a base image, project and product to save the ad.");
        return;
    }
    setIsLoading(true);
    setError(null);
    setGeneratedImageUrl(null); // Clear previous results

    try {
        const newAdItem: Omit<AdContent, 'userId' | 'id'> = {
            type: 'ad',
            projectId: selectedProjectId,
            createdAt: new Date().toISOString(),
            name: `Ad: ${adHeadline.substring(0, 30)}...`,
            baseImageUrl: adBaseImage.url,
            headline: adHeadline,
            body: adBody,
            cta: adCTA,
            settings: {
                ...getCurrentCreationContext(),
                // FIX: 'targetAge' is expected to be a single value for AdContent, but the shared state is an array. Using the first value.
                targetAge: targetAge[0],
                adGoal,
                adTextStyle,
                textFont,
                platform: selectedPlatform,
                placementId: selectedPlacementId,
                baseAssetMimeType: adBaseImage.type,
            }
        };

        await addContentItem(newAdItem as any);
        alert("Ad creative saved to library!");
    } catch(err: any) {
        setError(parseGeminiError(err));
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleGenerateBlog = useCallback(async () => {
    if (!product || !selectedProjectId) {
        setError("Please select a brand with at least one product and a project.");
        return;
    }
    setIsLoading(true);
    setError(null);
    setBlogContent(null);
    setBlogSections([]);

    const lengthDesc = BLOG_LENGTHS.find(l => l.id === blogLength) ? t(BLOG_LENGTHS.find(l => l.id === blogLength)!.nameKey) : 'Medium';
    const goalDesc = BLOG_GOALS.find(g => g.id === blogGoal) ? t(BLOG_GOALS.find(g => g.id === blogGoal)!.nameKey) : 'SEO Ranking';

    try {
        const result = await generateBlogPost(product, blogTopic, blogKeywords, lengthDesc, goalDesc);
        setBlogContent(result);
        const sectionsWithImageProp = result.sections.map(s => ({ ...s, imageUrl: undefined }));
        setBlogSections(sectionsWithImageProp);

        const newBlogContent: BlogContent = {
            id: crypto.randomUUID(),
            userId: '',
            projectId: selectedProjectId,
            createdAt: new Date().toISOString(),
            name: result.title.substring(0, 50),
            type: 'blog',
            title: result.title,
            featuredImageUrl: blogFeaturedImage?.url,
            sections: sectionsWithImageProp,
            settings: {
                ...getCurrentCreationContext(),
                topic: blogTopic,
                keywords: blogKeywords.split(',').map(k => k.trim()),
                blogLength,
                blogGoal,
                featuredAssetMimeType: blogFeaturedImage?.type,
            }
        };
        setCurrentBlogItem(newBlogContent);
        await addContentItem(newBlogContent);

    } catch (err: any) {
        setError(parseGeminiError(err));
    } finally {
        setIsLoading(false);
    }
  }, [product, selectedProjectId, blogLength, blogGoal, blogTopic, blogKeywords, blogFeaturedImage, t, addContentItem, getCurrentCreationContext]);

  const handleApplyHumanizedStoryboard = async (newScript: string) => {
    if (!generatedStoryboard || !storyboardGenerationContext) {
        setError("Cannot update storyboard: generation context is missing.");
        return;
    }
    
    setIsLoading(true); 
    setError(null);

    try {
        const newFrames = await regenerateStoryboardFrames(newScript, storyboardGenerationContext);
        
        const updatedStoryboard: StoryboardContent = {
            ...generatedStoryboard,
            storyboard: {
                script_full: newScript,
                storyboard: newFrames
            },
            createdAt: new Date().toISOString(),
        };
        
        setGeneratedStoryboard(updatedStoryboard);
        await updateContentItem(updatedStoryboard);

        alert("Storyboard updated successfully with the new script and saved to library!");

    } catch (err) {
        setError(parseGeminiError(err));
    } finally {
        setIsLoading(false);
    }
  };

  const handleApplyHumanizedAd = (newText: string) => {
    let newHeadline = '';
    let newBody = '';
    
    const doubleNewlineIndex = newText.indexOf('\n\n');
    if (doubleNewlineIndex !== -1) {
        newHeadline = newText.substring(0, doubleNewlineIndex).trim();
        newBody = newText.substring(doubleNewlineIndex + 2).trim();
    } else {
        const singleNewlineIndex = newText.indexOf('\n');
        if (singleNewlineIndex !== -1) {
            newHeadline = newText.substring(0, singleNewlineIndex).trim();
            newBody = newText.substring(singleNewlineIndex + 1).trim();
        } else {
            const sentenceEndIndex = newText.search(/[.!?]/);
            if (sentenceEndIndex !== -1 && newText.length > sentenceEndIndex + 1) {
                 newHeadline = newText.substring(0, sentenceEndIndex + 1).trim();
                 newBody = newText.substring(sentenceEndIndex + 2).trim();
            } else {
                newHeadline = newText.trim();
                newBody = '';
            }
        }
    }
    
    setAdHeadline(newHeadline);
    setAdBody(newBody);
    setSelectedAdCopyIndex(null);
    setPreviewKey(prev => prev + 1);
  };

  const handleApplyHumanizedBlog = (newText: string) => {
    if (!blogContent) return;

    const parts = newText.split('\n\n').filter(p => p.trim());
    if (parts.length === 0) return;

    const newTitle = parts.shift() || blogContent.title;
    const newSections: BlogSection[] = parts.map(part => {
        const lineBreakIndex = part.indexOf('\n');
        if (lineBreakIndex > 0 && lineBreakIndex < part.length - 1) {
            const heading = part.substring(0, lineBreakIndex).trim();
            const paragraph = part.substring(lineBreakIndex + 1).trim();
            return { heading, paragraph, imageUrl: undefined };
        }
        return { heading: 'Nội dung', paragraph: part.trim(), imageUrl: undefined };
    });
    
    if (newSections.length === 0 && newText.length > 0) {
        newSections.push({ heading: 'Nội dung cập nhật', paragraph: newText.replace(newTitle, '').trim(), imageUrl: undefined });
    }

    const updatedBlog: BlogPost = { title: newTitle, sections: newSections };
    setBlogContent(updatedBlog);
    setBlogSections(newSections);
    setPreviewKey(prev => prev + 1);
  };


  const handleSwitchToContentMode = async (imageUrl: string, subMode: ContentSubMode) => {
    setCreationMode('content');
    const newContentType: ContentType = subMode === 'blog' ? 'seo_blog' : 'paid_ad';
    setContentType(newContentType);
    setGeneratedImageUrl(null);
    setGeneratedStoryboard(null);
    if (subMode === 'ad') {
        const file = await dataUrlToUploadedFile(imageUrl, `ad-base-${Date.now()}.png`);
        setAdBaseImage(file);
    } else { // blog
        const file = await dataUrlToUploadedFile(imageUrl, `blog-featured-${Date.now()}.png`);
        setBlogFeaturedImage(file);
        setBlogTopic(`Viết về: ${product?.product_short} in ${brandStyle}`);
        setBlogKeywords(product?.benefits.join(', ') || '');
    }
  };

  const handleSwitchToStoryboardMode = async (prompt: string, imageUrl: string | null) => {
    if (!imageUrl) return;
    setCreationMode('video');
    setVideoStyle(brandStyle); 
    setCustomerInsights(`Bắt đầu từ bối cảnh được mô tả trong prompt hình ảnh sau: ${prompt}`);
    setGeneratedImageUrl(null); 

    try {
        const newSampleFile = await dataUrlToUploadedFile(imageUrl, `generated-image-${Date.now()}.png`);
        handleSampleFileSelect(newSampleFile);
    } catch (e) {
        console.error("Error processing generated image for storyboard:", e);
        setError("Could not use the generated image. Please try again.");
    }
  };
    
  const handleCreateContentFromFrame = async (frame: StoryboardFrame, subMode: ContentSubMode) => {
    if (!frame.generated_image_url) return;
    setCreationMode('content');
    const newContentType: ContentType = subMode === 'blog' ? 'seo_blog' : 'paid_ad';
    setContentType(newContentType);
    
    if (subMode === 'ad') {
      const file = await dataUrlToUploadedFile(frame.generated_image_url, `ad-base-${Date.now()}.png`);
      setAdBaseImage(file);
    } else {
      const file = await dataUrlToUploadedFile(frame.generated_image_url, `blog-featured-${Date.now()}.png`);
      setBlogFeaturedImage(file);
      setBlogTopic(`Blog post inspired by the scene: ${frame.scene}`);
      setBlogKeywords(product?.product_short || '');
    }
  };

  const handleImageGeneratedForStoryboard = (index: number, imageUrl: string) => {
    if (generatedStoryboard) {
        const updatedStoryboardFrames = [...generatedStoryboard.storyboard.storyboard];
        updatedStoryboardFrames[index].generated_image_url = imageUrl;
        const updatedStoryboard = { ...generatedStoryboard.storyboard, storyboard: updatedStoryboardFrames };
        const updatedStoryboardContent = { ...generatedStoryboard, storyboard: updatedStoryboard };
        setGeneratedStoryboard(updatedStoryboardContent);
        updateContentItem(updatedStoryboardContent);

        if (!selectedProjectId) return;
        const newImage: ImageContent = {
            id: crypto.randomUUID(),
            url: imageUrl,
            prompt: updatedStoryboardFrames[index].image_prompt,
            settings: { brandId: activeProfile?.id, selectedProductId, duration: videoDuration, from: 'StoryboardView' },
            createdAt: new Date().toISOString(),
            type: 'image',
            projectId: selectedProjectId,
            userId: '',
            name: `Storyboard frame ${index + 1}`
        };
        addContentItem(newImage);
    }
  };

  const buildStoryboardFramePrompt = useCallback((frame: StoryboardFrame): string => {
    if (!activeProfile || !product) {
        throw new Error("Active profile and product are required to build a storyboard prompt.");
    }
    
    const aspectRatioData = ASPECT_RATIOS.find(ar => ar.id === aspectRatio);
    let aspectRatioDescription = 'specific';
    if (aspectRatioData) {
        const name = translations.en[aspectRatioData.nameKey];
        if (name.includes('Landscape')) {
            aspectRatioDescription = 'wide landscape';
        } else if (name.includes('Portrait')) {
            aspectRatioDescription = 'tall vertical';
        } else if (name.includes('Square')) {
            aspectRatioDescription = 'square';
        }
    }

    const variables: Record<string, string | undefined> = {
        image_format: imageFormat,
        brand_tone: product.notes,
        brand_colors: activeProfile.colors.join(', '),
        aspect_ratio: aspectRatio,
        aspect_ratio_description: aspectRatioDescription,
        product_short: product.product_short,
        idol_ref: mainIdolFile ? `the user's provided face image named ${mainIdolFile.name}` : 'a person who fits the scene',
        supporting_idol_ref: supportingIdolFile ? `the user's provided supporting face image named ${supportingIdolFile.name}` : 'not applicable',
        product_ref: productFile ? `the user's provided product image named ${productFile.name}` : `a ${product.product_short}`,
        outfit_ref: outfitFile ? `an outfit similar to the user's provided image named ${outfitFile.name}` : 'a stylish, scene-appropriate outfit',
        frame_description: frame.image_prompt,
    };
    
    const sceneData = SCENES.find(s => s.id === videoStyle);
    const styleOption = BRAND_STYLE_OPTIONS.find(o => o.id === videoStyle);
    const styleNameInEnglish = styleOption ? translations.en[styleOption.nameKey] : videoStyle;

    if (videoStyle === 'CUSTOM_PROMPT') {
        variables.style_name = 'custom user-defined scene';
        variables.style_desc = customContext || 'A scene that is visually appealing and brand-appropriate.';
        variables.lighting = 'natural, flattering light';
    } else {
        variables.style_name = styleNameInEnglish;
        variables.style_desc = sceneData?.description || 'A scene that is visually appealing and brand-appropriate.';
        variables.lighting = sceneData?.lighting || 'natural, flattering light';
    }

    return buildPrompt(ImageType.STORYBOARD_FRAME, variables);
  }, [activeProfile, product, aspectRatio, imageFormat, mainIdolFile, supportingIdolFile, productFile, outfitFile, videoStyle, customContext]);


  const handleGenerateSingleStoryboardImage = async (frame: StoryboardFrame, index: number) => {
    if (isGeneratingAll || generatingImageForFrame !== null) return;

    setGeneratingImageForFrame(index);
    setError(null);
    try {
        const fullPrompt = buildStoryboardFramePrompt(frame);
        const imageUrl = await generateEcomImage(fullPrompt, [mainIdolFile, supportingIdolFile, productFile, outfitFile]);
        handleImageGeneratedForStoryboard(index, imageUrl);
    } catch (err: any) {
        setError(`Error generating image for scene ${index + 1}: ${parseGeminiError(err)}.`);
    } finally {
        setGeneratingImageForFrame(null);
    }
  };

   const handleGenerateAllStoryboardImages = async () => {
    if (!generatedStoryboard || !selectedProjectId) return;
    
    const framesToGenerate = generatedStoryboard.storyboard.storyboard.map((frame, index) => ({ frame, index }))
                                            .filter(({ frame }) => !frame.generated_image_url);
    if (framesToGenerate.length === 0) return;

    setIsGeneratingAll(true);
    setError(null);

    // Use a concurrency of 2 to speed up while being mindful of quotas
    const concurrency = 2;
    for (let i = 0; i < framesToGenerate.length; i += concurrency) {
        const chunk = framesToGenerate.slice(i, i + concurrency);
        setGeneratingAllProgress(`Đang tạo ảnh ${i + 1}-${Math.min(i + concurrency, framesToGenerate.length)}/${framesToGenerate.length}...`);
        
        try {
            await Promise.all(chunk.map(async ({ frame, index }) => {
                const fullPrompt = buildStoryboardFramePrompt(frame);
                const imageUrl = await generateEcomImage(fullPrompt, [mainIdolFile, supportingIdolFile, productFile, outfitFile]);
                handleImageGeneratedForStoryboard(index, imageUrl);
            }));
            
            // Small delay between batches to avoid hitting burst limits
            if (i + concurrency < framesToGenerate.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        } catch (err: any) {
            setError(`Lỗi khi tạo ảnh: ${parseGeminiError(err)}. Quá trình đã dừng lại.`);
            setIsGeneratingAll(false);
            setGeneratingAllProgress('');
            return;
        }
    }
    setIsGeneratingAll(false);
    setGeneratingAllProgress('Hoàn tất!');
    setTimeout(() => setGeneratingAllProgress(''), 3000);
  };
  
  const handleOpenPicker = (target: PickerTarget) => {
      setPickerTarget(target);
      if (['main_idol', 'supporting_idol', 'outfit'].includes(target)) {
        setIsAssetPickerOpen(true);
      } else {
        setIsLibraryPickerOpen(true);
      }
  };

  const handleSelectFromAssetLibrary = async (file: UploadedFile) => {
      // Ensure the file has a base64 string for AI analysis before proceeding.
      const fileWithBase64 = await ensureBase64(file);

      if (pickerTarget === 'main_idol') {
        handleMainIdolFileSelect(fileWithBase64);
      } else if (pickerTarget === 'supporting_idol') {
        handleSupportingIdolFileSelect(fileWithBase64);
      } else if (pickerTarget === 'outfit') {
        setOutfitFile(fileWithBase64);
      }
      setIsAssetPickerOpen(false);
      setPickerTarget(null);
  };
    
  const handleSelectFromImageLibrary = async (item: ContentItem) => {
      if (!pickerTarget) return;
      if (item.type !== 'image' && item.type !== 'video') {
          alert("Please select an image or video asset.");
          return;
      }
      const file = await dataUrlToUploadedFile(item.url, item.name);
      switch(pickerTarget) {
          case 'ad_base': setAdBaseImage(file); break;
          case 'blog_featured': setBlogFeaturedImage(file); break;
          case 'sample': handleSampleFileSelect(file); break;
      }
      setIsLibraryPickerOpen(false);
      setPickerTarget(null);
  };

  const handleSelectStoryboardFromLibrary = (item: ContentItem) => {
      if (item.type !== 'video_script') return;
      
      const storyboardItem = item as StoryboardContent;
      setGeneratedStoryboard(storyboardItem);
      
      const { settings } = storyboardItem;
      setVideoDuration(settings.videoDuration);
      setAspectRatio(settings.aspectRatio);
      setVideoStyle(settings.videoStyle);
      setTargetAge(settings.targetAge);
      setTargetGender(settings.targetGender);
      setVideoUsageGoal(settings.videoUsageGoal);
      setViralAdFormula(settings.viralAdFormula);
      setCustomContext(settings.customContext);
      
      setIsStoryboardPickerOpen(false);
  };

    const handleGenerateBlogIdeas = async () => {
        if (!product) {
            setError("Please select a product first.");
            return;
        }
        setIsGeneratingBlogIdeas(true);
        setBlogIdeas([]);
        setError(null);
        const genderName = TARGET_AUDIENCE_GENDERS.find(g => g.id === targetGender);
        const audience = `${(genderName ? t(genderName.nameKey) : 'Mọi giới tính')}, ${targetAge.map(ageId => TARGET_AUDIENCE_AGES.find(a => a.id === ageId)?.name).filter(Boolean).join(', ')}.`;
        const formulaDesc = (CONTEXTUAL_VIRAL_FORMULAS[videoUsageGoal] || []).find(f => f.id === viralAdFormula) ? t((CONTEXTUAL_VIRAL_FORMULAS[videoUsageGoal] || []).find(f => f.id === viralAdFormula)!.descriptionKey) : 'Không có công thức cụ thể.';

        try {
            const ideas = await generateBlogIdeas(product, formulaDesc, audience, customerInsights);
            setBlogIdeas(ideas);
            setSelectedBlogIdeaIndex(null);
        } catch (err: any) {
            setError(parseGeminiError(err));
        } finally {
            setIsGeneratingBlogIdeas(false);
        }
    };

    const handleGenerateImageForSection = async (index: number) => {
        if (!blogFeaturedImage) {
            setError("Please provide a featured image first to set the style.");
            return;
        }
        const section = blogSections[index];
        if (!section) return;

        setIsGeneratingImageFor(index);
        setError(null);

        const prompt = `Based on the style, color palette, and overall mood of the provided reference image, create a new image that visually represents the following concept for a blog post: "${section.heading}". The new image should feel like it belongs to the same series as the reference image, maintaining a consistent brand aesthetic. Do not include any text. The concept is: ${section.paragraph}. CRITICAL: The output image MUST be a standard 16:9 landscape aspect ratio.`;

        try {
            const imageUrl = await generateEcomImage(prompt, [blogFeaturedImage]);
            
            setBlogSections(prevSections => {
                const newSections = [...prevSections];
                newSections[index].imageUrl = imageUrl;

                if (currentBlogItem) {
                    const updatedBlogItem = { ...currentBlogItem, sections: newSections };
                    setCurrentBlogItem(updatedBlogItem);
                    updateContentItem(updatedBlogItem);
                }

                return newSections;
            });

        } catch (err) {
             setError(parseGeminiError(err));
        } finally {
            setIsGeneratingImageFor(null);
        }
    };
    
    const handleGenerateAllIllustrations = async () => {
        if (!blogFeaturedImage || blogSections.length === 0) {
            setError("Please add a featured image and generate blog content first.");
            return;
        }
        const sectionsToGenerate = blogSections
            .map((s, i) => ({ ...s, index: i }))
            .filter(s => !s.imageUrl);

        if (sectionsToGenerate.length === 0) {
            alert("All sections already have illustrations!");
            return;
        }

        setIsGeneratingAllIllustrations(true);
        setError(null);

        for (let i = 0; i < sectionsToGenerate.length; i++) {
            const sectionInfo = sectionsToGenerate[i];
            setGeneratingAllIllustrationsProgress(`Generating image ${i + 1}/${sectionsToGenerate.length}...`);
            await handleGenerateImageForSection(sectionInfo.index);
        }

        setIsGeneratingAllIllustrations(false);
        setGeneratingAllIllustrationsProgress('Done!');
        setTimeout(() => setGeneratingAllIllustrationsProgress(''), 2000);
    };

    const handleSaveToAssetLibrary = async (assetType: 'face' | 'outfit') => {
        if (!generatedImageUrl || !activeProfile || !updateProfile) {
            alert("No image or active profile available to save.");
            return;
        }
        try {
            const filename = `${assetType}-${Date.now()}.png`;
            const newAssetFile = await dataUrlToUploadedFile(generatedImageUrl, filename);

            const updatedProfile = { ...activeProfile };
            if (assetType === 'face') {
                // FIX: Property 'idols' does not exist on type 'BrandProfile'. It has been renamed to 'virtualIdols' and requires creating a full VirtualIdol object.
                const newIdol: VirtualIdol = {
                    id: crypto.randomUUID(),
                    name: `New Idol ${(updatedProfile.virtualIdols?.length || 0) + 1}`,
                    username: `@newidol${(updatedProfile.virtualIdols?.length || 0) + 1}`,
                    avatar: newAssetFile,
                    gender: 'Any',
                    ageRange: '25-34',
                    incomeLevel: 'Medium',
                    archetype: 'Người Bình thường',
                    platforms: [],
                    toneOfVoice: '',
                    nicheMarkets: '',
                    contentPillars: '',
                    usp: '',
                    isActive: false,
                };
                updatedProfile.virtualIdols = [...(updatedProfile.virtualIdols || []), newIdol];
            } else {
                updatedProfile.outfits = [...(updatedProfile.outfits || []), newAssetFile];
            }
            updateProfile(updatedProfile);
            alert(`Image saved to ${assetType} library!`);
        } catch (e) {
            console.error("Failed to save asset:", e);
            setError("Failed to save asset to library.");
        }
    };

    const handleGenerateContexts = async () => {
        if (!product || !characterAnalysis) {
            setError("Please select a product and provide a character face for analysis first.");
            return;
        }
        setIsGeneratingContexts(true);
        setSuggestedContexts([]);
        setError(null);
        try {
            const suggestions = await generateContextSuggestions(product, characterAnalysis, customerInsights);
            setSuggestedContexts(suggestions);
        } catch (err: any) {
            setError(parseGeminiError(err));
        } finally {
            setIsGeneratingContexts(false);
        }
    };


  const closeSlideshow = () => {
    setIsSlideshowOpen(false);
    setIsGeneratingFullVideo(false);
    setVideoProgressMessage('');
    if (videoDownloadUrl) {
        URL.revokeObjectURL(videoDownloadUrl);
        setVideoDownloadUrl(null);
    }
  };

  const isFormDisabled = !activeProfile || !product;
  const isGenerateImageDisabled = isFormDisabled || isLoading || isSegmenting || isAnalyzing || (!mainIdolFile && !productFile && !outfitFile);
  const isGenerateStoryboardDisabled = isFormDisabled || isLoading || isAnalyzing || !selectedProjectId;
  const isSaveAdDisabled = isFormDisabled || isLoading || !adBaseImage || !adHeadline;
  const font = BRAND_FONTS.find(f => f.name === textFont);

  const characterAnalysisUI = (isAnalyzing || characterAnalysis || isAnalyzingSupporting || supportingCharacterAnalysis) && (
    <div className="p-4 bg-dark-bg rounded-lg border border-dark-border space-y-3 animate-fade-in mt-4">
        <h4 className="text-md font-semibold text-transparent bg-clip-text bg-gradient-to-r from-brand-purple to-brand-cyan">{t('ai_character_analysis_title')}</h4>
        {isAnalyzing && <div className="flex items-center gap-2 text-sm text-dark-text-secondary"><Spinner message="Analyzing Primary..."/></div>}
        {characterAnalysis && !isAnalyzing && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <p><strong>{t('gender')}:</strong> {characterAnalysis.gender}</p>
                <p><strong>{t('age_range')}:</strong> {characterAnalysis.ageRange}</p>
                <p><strong>{t('income')}:</strong> {characterAnalysis.incomeLevel}</p>
                <p><strong>{t('location')}:</strong> {characterAnalysis.location}</p>
                <p><strong>{t('voice_type')}:</strong> {characterAnalysis.voiceType}</p>
                <p><strong>{t('music_vibe')}:</strong> {characterAnalysis.musicVibe}</p>
                <p><strong>{t('role')}:</strong> {characterAnalysis.role}</p>
                <p className="col-span-2"><strong>{t('lifestyle')}:</strong> {characterAnalysis.lifestyle}</p>
            </div>
        )}
        {isAnalyzingSupporting && <div className="flex items-center gap-2 text-sm text-dark-text-secondary"><Spinner message="Analyzing Supporting..."/></div>}
        {supportingCharacterAnalysis && !isAnalyzingSupporting && (
            <div className='pt-3 mt-3 border-t border-dark-border'>
                 <h5 className="text-sm font-semibold text-dark-text-secondary mb-1">Supporting Character</h5>
                 <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <p><strong>{t('gender')}:</strong> {supportingCharacterAnalysis.gender}</p>
                    <p><strong>{t('age_range')}:</strong> {supportingCharacterAnalysis.ageRange}</p>
                    <p><strong>{t('income')}:</strong> {supportingCharacterAnalysis.incomeLevel}</p>
                    <p><strong>{t('location')}:</strong> {supportingCharacterAnalysis.location}</p>
                    <p className="col-span-2"><strong>{t('lifestyle')}:</strong> {supportingCharacterAnalysis.lifestyle}</p>
                </div>
            </div>
        )}
        {characterInsights.length > 0 && !isAnalyzing && (
            <div className="pt-3 border-t border-dark-border">
                <div className="flex justify-between items-center mb-2">
                    <h5 className="text-sm font-semibold text-dark-text-secondary">{t('suggested_insights')}</h5>
                    <button 
                        onClick={handleRegenerateInsights}
                        disabled={isGeneratingNewInsights || !characterAnalysis}
                        className="text-xs px-2 py-1 rounded-lg bg-dark-card hover:bg-dark-border disabled:opacity-50"
                    >
                        {isGeneratingNewInsights ? '...' : 'Regenerate'}
                    </button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {characterInsights.map((insight, index) => {
                        const isSelected = selectedInsights.includes(insight);
                        return (
                            <button
                                key={index}
                                onClick={() => handleInsightClick(insight)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-full transition-colors ${
                                    isSelected
                                        ? 'border-brand-cyan text-brand-cyan bg-brand-cyan/20'
                                        : 'border-dark-border bg-dark-card hover:bg-brand-cyan hover:border-brand-cyan hover:text-white'
                                }`}
                            >
                                {insight}
                                {isSelected && <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                            </button>
                        );
                    })}
                </div>
            </div>
        )}
    </div>
  );

  const SelectedPlacementComponent = PLATFORM_PLACEMENTS[selectedPlatform]?.find(p => p.id === selectedPlacementId)?.component;


  return (
    <div className="space-y-6">
       {isAssetPickerOpen && activeProfile && pickerTarget && <AssetPickerModal 
            onClose={() => setIsAssetPickerOpen(false)} 
            onSelect={handleSelectFromAssetLibrary} 
            // FIX: Property 'idols' does not exist on type 'BrandProfile'. Updated to use 'virtualIdols' and map to their avatars.
            assets={(pickerTarget === 'main_idol' || pickerTarget === 'supporting_idol') ? activeProfile.virtualIdols.map(v => v.avatar).filter((a): a is UploadedFile => !!a) : activeProfile.outfits}
            assetTypeLabel={pickerTarget}
        />}
       {isLibraryPickerOpen && <LibraryPickerModal 
            onClose={() => setIsLibraryPickerOpen(false)}
            onSelect={handleSelectFromImageLibrary}
            filterTypes={['image', 'video']}
       />}
       {isStoryboardPickerOpen && <LibraryPickerModal 
            onClose={() => setIsStoryboardPickerOpen(false)}
            onSelect={handleSelectStoryboardFromLibrary}
            filterTypes={['video_script']}
       />}
       {isSlideshowOpen && generatedStoryboard && <SlideshowPreviewModal 
            storyboardContent={generatedStoryboard} 
            songFile={songFile}
            onClose={closeSlideshow} 
            isGeneratingVideo={isGeneratingFullVideo}
            progressMessage={videoProgressMessage}
       />}

      <div className="bg-dark-card border border-dark-border rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-4 md:col-span-1">
              <label className="text-md font-semibold text-dark-text whitespace-nowrap">{t('brand')}:</label>
              <select value={activeProfile?.id || ''} onChange={(e) => setActiveProfileId(e.target.value)} className="w-full bg-dark-bg border border-dark-border rounded-lg py-2 px-3">
                {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
          </div>
          {activeProfile && (
            <div className="flex items-center gap-4 md:col-span-1">
              <label className="text-md font-semibold text-dark-text whitespace-nowrap">{t('product')}:</label>
              <select value={selectedProductId || ''} onChange={(e) => setSelectedProductId(e.target.value)} disabled={!activeProfile || activeProfile.products.length === 0} className="w-full bg-dark-bg border border-dark-border rounded-lg py-2 px-3 disabled:opacity-50">
                {activeProfile.products.map(p => <option key={p.id} value={p.id}>{p.product_name}</option>)}
              </select>
            </div>
          )}
           <div className="flex items-center gap-4 md:col-span-1">
              <label className="text-md font-semibold text-dark-text whitespace-nowrap">{t('project')}:</label>
              <select value={selectedProjectId || ''} onChange={(e) => setSelectedProjectId(e.target.value)} disabled={projects.length === 0} className="w-full bg-dark-bg border border-dark-border rounded-lg py-2 px-3 disabled:opacity-50">
                {projects.length === 0 ? <option>{t('no_project_found')}</option> : projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className={`flex flex-col gap-6 p-6 bg-dark-card rounded-2xl border border-dark-border ${isFormDisabled ? 'opacity-50' : ''}`}>
           <div className="flex p-1 bg-dark-bg rounded-xl border border-dark-border">
                <button onClick={() => setCreationMode('image')} className={`w-1/3 py-2 text-sm font-semibold rounded-lg transition-colors ${creationMode === 'image' ? 'bg-brand-cyan text-white' : 'text-dark-text-secondary hover:bg-dark-card'}`}>
                    {t('image_gen')}
                </button>
                <button onClick={() => setCreationMode('video')} className={`w-1/3 py-2 text-sm font-semibold rounded-lg transition-colors ${creationMode === 'video' ? 'bg-brand-cyan text-white' : 'text-dark-text-secondary hover:bg-dark-card'}`}>
                    {t('storyboard')}
                </button>
                <button onClick={() => setCreationMode('content')} className={`w-1/3 py-2 text-sm font-semibold rounded-lg transition-colors ${creationMode === 'content' ? 'bg-brand-cyan text-white' : 'text-dark-text-secondary hover:bg-dark-card'}`}>
                    {t('content_creation')}
                </button>
            </div>
            
            <div className="space-y-4">
                <details className="bg-dark-bg border border-dark-border rounded-xl">
                    <summary className="p-3 cursor-pointer font-semibold text-dark-text">{t('option_1_title')}</summary>
                    <div className="p-4 border-t border-dark-border space-y-2">
                        <p className="text-xs text-dark-text-secondary">{t('option_1_desc')}</p>
                        <FileUpload label={t('all_in_one_image_label')} value={sampleFile} onFileSelect={handleSampleFileSelect} isLoading={isSegmenting} />
                        <button onClick={() => handleOpenPicker('sample')} className="w-full text-xs py-1.5 px-2 bg-dark-bg border border-dark-border rounded-lg hover:border-brand-cyan text-dark-text-secondary">{t('choose_from_library')}</button>
                    </div>
                </details>

                 <details className="bg-dark-bg border border-dark-border rounded-xl">
                    <summary className="p-3 cursor-pointer font-semibold text-dark-text text-transparent bg-clip-text bg-gradient-to-r from-brand-purple to-brand-cyan">{t('option_2_title')}</summary>
                     <div className="p-4 border-t border-dark-border space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div>
                                <div className="space-y-2">
                                   <FileUpload label={t('main_idol_label')} value={mainIdolFile} onFileSelect={handleMainIdolFileSelect} isLoading={isSegmenting || isAnalyzing} />
                                   <button onClick={() => handleOpenPicker('main_idol')} className="w-full text-xs py-1.5 px-2 bg-dark-bg border border-dark-border rounded-lg hover:border-brand-cyan text-dark-text-secondary">
                                       {t('choose_from_idol_library')}
                                   </button>
                                </div>
                           </div>
                           <div>
                                <div className="space-y-2">
                                   <FileUpload label={t('supporting_idol_label')} value={supportingIdolFile} onFileSelect={handleSupportingIdolFileSelect} isLoading={isAnalyzingSupporting} />
                                   <button onClick={() => handleOpenPicker('supporting_idol')} className="w-full text-xs py-1.5 px-2 bg-dark-bg border border-dark-border rounded-lg hover:border-brand-cyan text-dark-text-secondary">
                                       {t('choose_from_idol_library')}
                                   </button>
                                </div>
                           </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                               <FileUpload label={t('brand_element_label')} value={productFile} onFileSelect={(f) => setProductFile(f)} isLoading={isSegmenting} />
                            </div>
                            <div className="space-y-2">
                               <FileUpload label={t('idol_outfit_label')} value={outfitFile} onFileSelect={(f) => setOutfitFile(f)} isLoading={isSegmenting} />
                               <button onClick={() => handleOpenPicker('outfit')} className="w-full text-xs py-1.5 px-2 bg-dark-bg border border-dark-border rounded-lg hover:border-brand-cyan text-dark-text-secondary">
                                   {t('choose_from_outfit_library')}
                               </button>
                            </div>
                        </div>
                         {characterAnalysisUI}
                    </div>
                </details>
            </div>


            <div className="space-y-4 p-4 bg-dark-bg rounded-xl border border-dark-border">
                <h3 className="text-md font-semibold text-dark-text">{t('target_audience')}</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <h4 className="text-sm font-semibold text-dark-text-secondary mb-2">{t('gender')}</h4>
                        <div className="flex flex-wrap gap-2">
                            {TARGET_AUDIENCE_GENDERS.map(option => (
                                <button
                                    key={option.id}
                                    onClick={() => setTargetGender(option.id)}
                                    disabled={isFormDisabled}
                                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-50 ${targetGender === option.id ? 'bg-brand-cyan text-white shadow-lg' : 'bg-dark-card text-dark-text-secondary hover:bg-dark-border'}`}
                                >
                                    {t(option.nameKey)}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-dark-text-secondary mb-2">{t('age_range')}</h4>
                        <div className="flex flex-wrap gap-2">
                            {TARGET_AUDIENCE_AGES.map(age => (
                                <button
                                    key={age.id}
                                    onClick={() => handleTargetAgeChange(age.id)}
                                    disabled={isFormDisabled}
                                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-50 ${targetAge.includes(age.id) ? 'bg-brand-cyan text-white shadow-lg' : 'bg-dark-card text-dark-text-secondary hover:bg-dark-border'}`}
                                >
                                    {age.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <OptionSelector title={t('usage_goal_title')} options={VIDEO_USAGE_GOALS.map(o => ({ id: o.id, name: t(o.nameKey) }))} selected={videoUsageGoal} onSelect={v => setVideoUsageGoal(v)} disabled={isFormDisabled}/>
                <OptionSelector title={t('viral_formula_title')} options={availableViralFormulas.map(o => ({ id: o.id, name: t(o.nameKey) }))} selected={viralAdFormula} onSelect={v => setViralAdFormula(v)} disabled={isFormDisabled} tooltips={viralAdFormulaTooltips} />
                <TextareaInput label={t('insights_label')} value={customerInsights} onChange={setCustomerInsights} placeholder={t('insights_placeholder')} />
            </div>
            
            {creationMode === 'image' && (
              <div className="space-y-6 animate-fade-in">
                 <details className="bg-dark-bg border border-dark-border rounded-xl" open>
                    <summary className="p-3 cursor-pointer font-semibold text-dark-text text-transparent bg-clip-text bg-gradient-to-r from-brand-purple to-brand-cyan">{t('choose_context_title')}</summary>
                    <div className="p-4 border-t border-dark-border space-y-4">
                        <div className="p-3 bg-dark-card rounded-lg border border-dark-border">
                            <h4 className="text-sm font-semibold mb-2 text-dark-text-secondary">{t('ai_suggested_context_title')}</h4>
                            <p className="text-xs text-dark-text-secondary mb-3">{t('ai_suggested_context_desc')}</p>
                            <button onClick={handleGenerateContexts} disabled={isGeneratingContexts || !product || !characterAnalysis} className="w-full py-2 px-3 text-sm font-semibold rounded-lg bg-brand-purple hover:bg-brand-purple/90 text-white disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors">
                                {isGeneratingContexts ? t('analyzing') : t('analyze_and_suggest')}
                            </button>
                            {suggestedContexts.length > 0 && (
                                <div className="mt-4 pt-3 border-t border-dark-border">
                                    <h5 className="text-xs font-semibold uppercase text-dark-text-secondary mb-2">{t('suggestions')}</h5>
                                    <div className="flex flex-wrap gap-2">
                                        {suggestedContexts.map((suggestion, index) => {
                                            const isSelected = selectedSuggestedContext === suggestion;
                                            return (
                                                <button key={index} onClick={() => { setBrandStyle('CUSTOM_PROMPT'); setCustomContext(suggestion); setSelectedSuggestedContext(suggestion); }} 
                                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${isSelected ? 'bg-brand-cyan/20 text-brand-cyan border-brand-cyan' : 'bg-dark-bg text-dark-text-secondary border-dark-border hover:border-brand-cyan hover:text-brand-cyan'}`}>
                                                    {suggestion}
                                                    {isSelected && <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="mt-2">
                            <TextareaInput 
                                label={t('custom_context_label')} 
                                value={customContext} 
                                onChange={(value) => {
                                    setCustomContext(value); 
                                    setSelectedSuggestedContext(null);
                                    setBrandStyle('CUSTOM_PROMPT');
                                }} 
                                placeholder={t('custom_context_placeholder')} rows={3} />
                        </div>
                    </div>
                </details>
                <OptionSelector title={t('camera_shot_title')} options={CAMERA_SHOTS.map(o => ({ id: o.id, name: t(o.nameKey) }))} selected={cameraShot} onSelect={v => setCameraShot(v)} disabled={isFormDisabled} />
                <OptionSelector title={t('image_style_title')} options={IMAGE_FORMATS} selected={imageFormat} onSelect={v => setImageFormat(v)} disabled={isFormDisabled} />
                <div>
                    <label className="block text-sm font-medium text-dark-text-secondary mb-1">{t('review_prompt_label')}</label>
                    <textarea value={generatedPrompt} readOnly rows={8} className="w-full p-2 bg-dark-bg border border-dark-border rounded-lg text-xs"/>
                </div>
                <button onClick={handleGenerateImage} disabled={isGenerateImageDisabled} className="w-full flex justify-center items-center py-3 px-4 bg-gradient-to-r from-brand-cyan to-blue-500 text-white font-semibold rounded-lg disabled:bg-gray-600 disabled:from-gray-600 disabled:cursor-not-allowed">
                    {isLoading ? t('generating') : t('generate_scene')}
                </button>
              </div>
            )}

            {creationMode === 'video' && (
                <div className="space-y-6 animate-fade-in">
                    <details className="bg-dark-bg border border-dark-border rounded-xl">
                        <summary className="p-3 cursor-pointer font-semibold text-dark-text">{t('sync_with_song_title')}</summary>
                        <div className="p-4 border-t border-dark-border space-y-4">
                            <p className="text-xs text-dark-text-secondary">{t('sync_with_song_desc_manual')}</p>
                            <FileUpload label={t('upload_song_label')} value={songFile} onFileSelect={setSongFile} acceptedTypes="audio/mpeg,audio/wav" />
                            <TextareaInput label={t('enter_lyrics_label')} value={lyrics} onChange={setLyrics} placeholder={t('enter_lyrics_placeholder')} />
                            {/* FIX: Use a lambda function to correctly match the onSelect prop type. */}
                             <OptionSelector title={t('style_of_music_label')} options={MUSIC_VIBE_OPTIONS.map(o => ({ id: o.id, name: t(o.nameKey) }))} selected={musicVibe} onSelect={v => setMusicVibe(v)} disabled={isFormDisabled} />
                        </div>
                    </details>
                    <details className="bg-dark-bg border border-dark-border rounded-xl">
                        <summary className="p-3 cursor-pointer font-semibold text-dark-text text-transparent bg-clip-text bg-gradient-to-r from-brand-purple to-brand-cyan">{t('choose_context_title')}</summary>
                        <div className="p-4 border-t border-dark-border space-y-4">
                            <div className="p-3 bg-dark-card rounded-lg border border-dark-border">
                                <h4 className="text-sm font-semibold mb-2 text-dark-text-secondary">{t('ai_suggested_context_title')}</h4>
                                <p className="text-xs text-dark-text-secondary mb-3">Dựa trên sản phẩm và chân dung nhân vật, AI sẽ đề xuất các bối cảnh phù hợp cho video.</p>
                                <button onClick={handleGenerateContexts} disabled={isGeneratingContexts || !product || !characterAnalysis} className="w-full py-2 px-3 text-sm font-semibold rounded-lg bg-brand-purple hover:bg-brand-purple/90 text-white disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors">
                                    {isGeneratingContexts ? t('analyzing') : t('analyze_and_suggest')}
                                </button>
                                {suggestedContexts.length > 0 && (
                                    <div className="mt-4 pt-3 border-t border-dark-border">
                                        <h5 className="text-xs font-semibold uppercase text-dark-text-secondary mb-2">{t('suggestions')}</h5>
                                        <div className="flex flex-wrap gap-2">
                                            {suggestedContexts.map((suggestion, index) => {
                                                const isSelected = selectedSuggestedContext === suggestion;
                                                return (
                                                <button key={index} onClick={() => { setVideoStyle('CUSTOM_PROMPT'); setCustomContext(suggestion); setSelectedSuggestedContext(suggestion); }} 
                                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${isSelected ? 'bg-brand-cyan/20 text-brand-cyan border-brand-cyan' : 'bg-dark-bg text-dark-text-secondary border-dark-border hover:border-brand-cyan hover:text-brand-cyan'}`}>
                                                    {suggestion}
                                                    {isSelected && <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>}
                                                </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="mt-2">
                                <TextareaInput 
                                    label={t('custom_context_label')} 
                                    value={customContext} 
                                    onChange={(value) => {
                                        setCustomContext(value); 
                                        setSelectedSuggestedContext(null);
                                        setVideoStyle('CUSTOM_PROMPT');
                                    }} 
                                    placeholder="VD: Một video unboxing sản phẩm trên bàn làm việc gọn gàng, ánh sáng tự nhiên từ cửa sổ." rows={3} />
                            </div>
                        </div>
                    </details>
                    
                     <div className="space-y-2">
                        <button onClick={() => setIsStoryboardPickerOpen(true)} disabled={isGenerateStoryboardDisabled} className="w-full py-3 px-8 bg-dark-bg border border-dark-border text-dark-text font-semibold rounded-lg hover:border-brand-cyan disabled:bg-gray-600 disabled:cursor-not-allowed">
                            {t('use_storyboard_from_library')}
                        </button>
                        <button onClick={() => handleGenerateStoryboard()} disabled={isGenerateStoryboardDisabled} className="w-full py-3 px-8 bg-brand-green text-white font-semibold rounded-lg hover:bg-green-600 disabled:bg-gray-600">
                            {isLoading ? t('writing_storyboard') : t('generate_storyboard')}
                        </button>
                    </div>
                </div>
            )}

            {creationMode === 'content' && (
                <div className="space-y-6 animate-fade-in">
                    {/* Content Type Toggle */}
                    <div className="flex p-1 bg-dark-bg rounded-xl border border-dark-border">
                        <button onClick={() => setContentType('paid_ad')} className={`w-1/2 py-2 text-sm font-semibold rounded-lg transition-colors ${contentType === 'paid_ad' ? 'bg-brand-cyan text-white' : 'text-dark-text-secondary hover:bg-dark-card'}`}>
                            {t('paid_ad')}
                        </button>
                        <button onClick={() => setContentType('seo_blog')} className={`w-1/2 py-2 text-sm font-semibold rounded-lg transition-colors ${contentType === 'seo_blog' ? 'bg-indigo-500 text-white' : 'text-dark-text-secondary hover:bg-dark-card'}`}>
                            {t('seo_blog')}
                        </button>
                    </div>

                    {/* Paid Ad Specific Inputs */}
                    {contentType === 'paid_ad' && (
                        <div className="space-y-6">
                            <div>
                                <h4 className="text-md font-semibold mb-2">{t('base_image_title')}</h4>
                                <div className="space-y-2">
                                     <FileUpload label={t('upload_select_base_image')} value={adBaseImage} onFileSelect={setAdBaseImage} />
                                     <button onClick={() => handleOpenPicker('ad_base')} className="w-full text-xs py-1.5 px-2 bg-dark-bg border border-dark-border rounded-lg hover:border-brand-cyan text-dark-text-secondary">
                                         {t('choose_from_library')}
                                     </button>
                                </div>
                            </div>
                            
                            <div className="space-y-4 p-4 bg-dark-bg rounded-xl border border-dark-border">
                                <h4 className="text-md font-semibold">{t('ad_specifics_title')}</h4>
                                <OptionSelector title={t('ad_goal_title')} options={AD_GOALS.map(o => ({ id: o.id, name: t(o.nameKey) }))} selected={adGoal} onSelect={v => setAdGoal(v)} disabled={isFormDisabled}/>
                                <button onClick={handleGenerateAdCopy} disabled={isGeneratingCopy || isFormDisabled} className="w-full py-2 px-4 rounded-lg text-white bg-brand-cyan hover:bg-cyan-600 font-semibold disabled:bg-gray-600">
                                    {isGeneratingCopy ? t('generating_copy') : t('generate_ad_copy')}
                                </button>
                            </div>
                            {isGeneratingCopy && <div className="text-center text-dark-text-secondary">{t('generating_copy')}</div>}
                            {adCopyIdeas.length > 0 && (
                                <div className="space-y-3">
                                    <h4 className="text-md font-semibold">{t('choose_ad_copy_title')}</h4>
                                    {adCopyIdeas.map((idea, index) => (
                                        <div key={index} onClick={() => {
                                            setSelectedAdCopyIndex(index);
                                            setAdHeadline(idea.headline);
                                            setAdBody(idea.body);
                                            setAdCTA(idea.cta);
                                        }} className={`p-3 border rounded-lg cursor-pointer transition-all ${selectedAdCopyIndex === index ? 'bg-brand-cyan/20 border-brand-cyan' : 'bg-dark-bg border-dark-border hover:border-gray-600'}`}>
                                            <p className="font-bold text-sm">{idea.headline}</p>
                                            <p className="text-xs mt-1 text-dark-text-secondary">{idea.body}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                             <div className="space-y-4 p-4 bg-dark-bg rounded-xl border border-dark-border">
                                 <h4 className="text-md font-semibold">{t('edit_refine_title')}</h4>
                                <div className="space-y-3">
                                  <div>
                                      <label className="text-sm font-medium text-dark-text-secondary">{t('headline_label')}</label>
                                      <input type="text" value={adHeadline} onChange={e => {setAdHeadline(e.target.value); setSelectedAdCopyIndex(null);}} className="w-full p-2 bg-dark-card border border-dark-border rounded-lg text-sm" placeholder={t('headline_placeholder')}/>
                                  </div>
                                    <div>
                                      <label className="text-sm font-medium text-dark-text-secondary">{t('body_label')}</label>
                                      <textarea value={adBody} onChange={e => {setAdBody(e.target.value); setSelectedAdCopyIndex(null);}} rows={3} className="w-full p-2 bg-dark-card border border-dark-border rounded-lg text-sm" placeholder={t('body_placeholder')}/>
                                  </div>
                                    <div>
                                      <label className="text-sm font-medium text-dark-text-secondary">{t('cta_label')}</label>
                                      <input type="text" value={adCTA} onChange={e => {setAdCTA(e.target.value); setSelectedAdCopyIndex(null);}} className="w-full p-2 bg-dark-card border border-dark-border rounded-lg text-sm" placeholder={t('cta_placeholder')}/>
                                  </div>
                                </div>
                             </div>
                             <div className="space-y-4 p-4 bg-dark-bg rounded-xl border border-dark-border">
                                 <h4 className="text-md font-semibold">{t('text_style_title')}</h4>
                                <OptionSelector title={t('ad_font_title')} options={BRAND_FONTS.map(f => ({ id: f.name, name: f.name }))} selected={textFont} onSelect={v => setTextFont(v)} disabled={isFormDisabled} />
                             </div>
                            <button onClick={handleSaveAdToLibrary} disabled={isSaveAdDisabled} className="w-full py-3 px-8 bg-brand-green text-white font-semibold rounded-lg hover:bg-green-600 disabled:bg-gray-600">
                                {isLoading ? t('saving') : t('save_ad_to_library')}
                            </button>
                        </div>
                    )}

                    {/* SEO/Blog Specific Inputs */}
                    {contentType === 'seo_blog' && (
                         <div className="space-y-6">
                            <div>
                                <h4 className="text-md font-semibold mb-2">{t('featured_image_title')}</h4>
                                <div className="space-y-2">
                                     <FileUpload label={t('upload_select_featured_image')} value={blogFeaturedImage} onFileSelect={setBlogFeaturedImage} />
                                     <button onClick={() => handleOpenPicker('blog_featured')} className="w-full text-xs py-1.5 px-2 bg-dark-bg border border-dark-border rounded-lg hover:border-brand-cyan text-dark-text-secondary">
                                         {t('choose_from_library')}
                                     </button>
                                </div>
                            </div>
                            <div className="space-y-4 p-4 bg-dark-bg rounded-xl border border-dark-border">
                                <h4 className="text-md font-semibold">{t('blog_details_title')}</h4>
                                <OptionSelector title={t('blog_length_title')} options={BLOG_LENGTHS.map(o => ({ id: o.id, name: t(o.nameKey) }))} selected={blogLength} onSelect={v => setBlogLength(v)} disabled={isFormDisabled} />
                                <OptionSelector title={t('blog_goal_title')} options={BLOG_GOALS.map(o => ({ id: o.id, name: t(o.nameKey) }))} selected={blogGoal} onSelect={v => setBlogGoal(v)} disabled={isFormDisabled} />
                                <div>
                                    <label className="block text-sm font-medium text-dark-text-secondary mb-1">{t('main_topic_label')}</label>
                                    <input type="text" value={blogTopic} onChange={e => setBlogTopic(e.target.value)} placeholder={t('main_topic_placeholder')} className="w-full p-2 bg-dark-card border border-dark-border rounded-lg text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-dark-text-secondary mb-1">{t('keywords_label')}</label>
                                    <input type="text" value={blogKeywords} onChange={e => setBlogKeywords(e.target.value)} placeholder={t('keywords_placeholder')} className="w-full p-2 bg-dark-card border border-dark-border rounded-lg text-sm" />
                                </div>
                            </div>
                             <button onClick={() => handleGenerateBlog()} disabled={isLoading || isFormDisabled || !blogTopic} className="w-full py-3 px-4 bg-brand-cyan text-white font-semibold rounded-lg disabled:bg-gray-600">
                                {isLoading ? t('writing_blog') : t('generate_blog')}
                            </button>
                         </div>
                    )}
                </div>
            )}
        </div>

        <div className="bg-dark-card border border-dark-border rounded-2xl p-6 flex flex-col items-center justify-center min-h-[600px] lg:min-h-0 relative">
            {isLoading && <Spinner />}
            {isGeneratingFullVideo && <Spinner message={videoProgressMessage}/>}
            {isGeneratingSingleVideo && <Spinner message={videoProgressMessage} />}
            {generatingClipIndex !== null && <Spinner message={videoProgressMessage} />}

            {error && <div className="text-center text-red-400"><h3 className="text-lg font-semibold">{t('error_title')}</h3><p>{error}</p></div>}
            
            {creationMode === 'content' && !isLoading && !error && (
                 <div className="w-full h-full animate-fade-in">
                    {contentType === 'paid_ad' ? (
                        <div className="w-full h-full flex flex-col gap-4 items-center justify-start">
                            <div className="flex items-center justify-center gap-2">
                                <h3 className="text-lg font-bold text-center">{t('platform_previews')}</h3>
                                <button
                                    onClick={() => setPreviewKey(prev => prev + 1)}
                                    className="p-1.5 rounded-full bg-dark-bg border border-dark-border text-dark-text-secondary hover:bg-dark-border hover:text-white"
                                    title={t('reload_preview')}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>

                            {(adHeadline || adBody) && (
                                <div className="w-full max-w-sm">
                                    <ContentRefinementPanel
                                        contentId={`${adHeadline}-${adBody}`}
                                        key={`${adHeadline}-${adBody}`}
                                        originalText={`${adHeadline}\n\n${adBody}`}
                                        onApplyChanges={handleApplyHumanizedAd}
                                        contentType="ad"
                                        product={product}
                                        characterAnalysis={characterAnalysis}
                                        customerInsights={customerInsights}
                                        context={`Ad Goal: ${adGoal}`}
                                    />
                                </div>
                            )}
                            <div className="w-full">
                                <div className="flex justify-center flex-wrap gap-2 mb-4 p-1 bg-dark-bg rounded-xl border border-dark-border">
                                    {(Object.keys(PLATFORM_PLACEMENTS) as PlatformName[]).map(platform => (
                                        <button key={platform} onClick={() => {
                                            setSelectedPlatform(platform);
                                            setSelectedPlacementId(PLATFORM_PLACEMENTS[platform][0].id);
                                        }} className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors ${selectedPlatform === platform ? 'bg-brand-cyan text-white' : 'text-dark-text-secondary hover:bg-dark-card'}`}>
                                            {platform}
                                        </button>
                                    ))}
                                </div>
                                 <div className="relative">
                                    <div className="flex overflow-x-auto gap-2 pb-2 -mb-2">
                                        {PLATFORM_PLACEMENTS[selectedPlatform].map(placement => (
                                            <button key={placement.id} onClick={() => setSelectedPlacementId(placement.id)} className={`flex-shrink-0 px-3 py-1 text-xs font-semibold rounded-full transition-colors ${selectedPlacementId === placement.id ? 'bg-brand-cyan text-white' : 'bg-dark-border text-dark-text-secondary hover:bg-dark-border/50'}`}>
                                                {placement.name}
                                            </button>
                                        ))}
                                    </div>
                                 </div>
                            </div>
                            <div key={previewKey} className="flex-grow w-full flex items-center justify-center overflow-y-auto p-4">
                                {SelectedPlacementComponent && (
                                    <SelectedPlacementComponent
                                        baseImage={adBaseImage}
                                        headline={adHeadline}
                                        body={adBody}
                                        cta={adCTA}
                                        fontFamily={font?.family || 'sans-serif'}
                                        brandName={activeProfile?.name || 'Your Brand'}
                                        brandLogoUrl={activeProfile?.logo?.url}
                                    />
                                )}
                            </div>
                        </div>
                    ) : (
                        // Blog Preview
                         blogContent ? (
                             <div key={previewKey} className="w-full h-full flex flex-col gap-4">
                                 <ContentRefinementPanel 
                                    contentId={blogContent.title}
                                    key={blogContent.title}
                                    originalText={`${blogContent.title}\n\n${blogContent.sections.map(s => `${s.heading}\n${s.paragraph}`).join('\n\n')}`}
                                    onApplyChanges={handleApplyHumanizedBlog}
                                    contentType="blog"
                                    product={product}
                                    characterAnalysis={characterAnalysis}
                                    customerInsights={customerInsights}
                                    context={blogTopic}
                                />
                                 <div className="flex-grow bg-white text-gray-800 rounded-xl p-8 overflow-y-auto font-serif min-h-0">
                                    <div className="flex justify-between items-start mb-4">
                                        <h1 className="text-4xl font-bold text-gray-900 flex-1">{blogContent.title}</h1>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setPreviewKey(prev => prev + 1)}
                                                className="p-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300"
                                                title={t('reload_preview')}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={handleGenerateAllIllustrations}
                                                disabled={isGeneratingAllIllustrations}
                                                className="px-3 py-2 text-sm font-semibold text-white bg-brand-cyan rounded-lg hover:bg-brand-cyan/90 disabled:bg-gray-500"
                                                title={t('generate_all_illustrations')}
                                            >
                                                 {isGeneratingAllIllustrations ? generatingAllIllustrationsProgress : t('generate_all_illustrations')}
                                            </button>
                                        </div>
                                    </div>
                                     {blogFeaturedImage && (
                                         <div className="my-6">
                                            {blogFeaturedImage.type.startsWith('video/') ? (
                                                <video src={blogFeaturedImage.url} muted loop autoPlay playsInline className="w-full h-auto rounded-xl shadow-xl" />
                                            ) : (
                                                <img src={blogFeaturedImage.url} alt={blogContent.title} className="w-full h-auto rounded-xl shadow-xl" />
                                            )}
                                         </div>
                                     )}
                                     {blogSections.map((section, index) => (
                                        <div key={index} className="mb-8">
                                            <h2 className="text-2xl font-bold mb-3 text-gray-900">{section.heading}</h2>
                                            {section.imageUrl ? (
                                                <div className="my-4">
                                                    <img src={section.imageUrl} alt={section.heading} className="w-full h-auto rounded-lg shadow-lg" />
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => handleGenerateImageForSection(index)}
                                                    disabled={isGeneratingImageFor !== null}
                                                    className="w-full my-4 p-4 text-center border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-indigo-400 hover:text-indigo-500 transition-colors"
                                                >
                                                    {isGeneratingImageFor === index ? <Spinner /> : "🖼️ " + t('generate_image')}
                                                </button>
                                            )}
                                            <div className="space-y-4 text-gray-700 leading-relaxed whitespace-pre-wrap">
                                                 {section.paragraph.split('\n\n').map((para, pIndex) => <p key={pIndex}>{para}</p>)}
                                            </div>
                                        </div>
                                     ))}
                                 </div>
                             </div>
                         ) : (
                             <div className="text-center text-dark-text-secondary">
                                 <h3 className="text-lg font-bold">{t('blog_preview_here')}</h3>
                                 <p>{t('blog_preview_prompt')}</p>
                             </div>
                         )
                    )}
                 </div>
            )}

            {creationMode === 'image' && !isLoading && !error && (
                <div className="w-full h-full animate-fade-in flex flex-col items-center justify-center">
                    {generatedImageUrl ? (
                        <div className="w-full h-full flex flex-col gap-4">
                            <h3 className="text-lg font-bold text-center text-brand-green">{t('image_generated')}</h3>
                            <div className="relative flex-grow w-full rounded-lg overflow-hidden">
                                 <img src={generatedImageUrl} alt="Generated e-commerce" className="w-full h-full object-contain" />
                                 {generatedVideoUrl && <video src={generatedVideoUrl} controls autoPlay className="absolute inset-0 w-full h-full object-contain bg-black/50" />}
                            </div>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-sm font-semibold">
                                <button onClick={() => handleSwitchToContentMode(generatedImageUrl, 'ad')} className="py-2 px-3 bg-dark-bg border border-dark-border rounded-lg hover:border-yellow-500">{t('create_ad')}</button>
                                <button onClick={() => handleSwitchToContentMode(generatedImageUrl, 'blog')} className="py-2 px-3 bg-dark-bg border border-dark-border rounded-lg hover:border-indigo-500">{t('write_blog')}</button>
                                <button onClick={() => handleGenerateVideoFromSingleImage()} disabled={isGeneratingSingleVideo} className="py-2 px-3 bg-dark-bg border border-dark-border rounded-lg hover:border-red-500">{isGeneratingSingleVideo ? t('creating') : t('create_video')}</button>
                                <button onClick={() => handleSwitchToStoryboardMode(generatedPrompt, generatedImageUrl)} className="py-2 px-3 bg-dark-bg border border-dark-border rounded-lg hover:border-purple-500">{t('storyboard')}</button>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm font-semibold">
                                <button onClick={() => handleSaveToAssetLibrary('face')} className="py-2 px-3 bg-dark-bg border border-dark-border rounded-lg hover:border-brand-purple">{t('save_to_idols')}</button>
                                <button onClick={() => handleSaveToAssetLibrary('outfit')} className="py-2 px-3 bg-dark-bg border border-dark-border rounded-lg hover:border-brand-purple">{t('save_to_outfits_library', 'Save to Outfits')}</button>
                            </div>
                        </div>
                    ) : (
                         <div className="text-center text-dark-text-secondary">
                            {!activeProfile ? (
                                <div>
                                    <h3 className="text-lg font-bold">{t('no_active_brand')}</h3>
                                    <p>{t('no_active_brand_prompt')} <button onClick={() => setActiveView('assets')} className="text-brand-cyan underline font-semibold">{t('brand_assets_link')}</button> {t('no_active_brand_prompt_2')}</p>
                                </div>
                            ) : !product ? (
                                <div>
                                     <h3 className="text-lg font-bold">{t('select_product_prompt')}</h3>
                                </div>
                            ) : (
                                <div>
                                    <h3 className="text-lg font-bold">{t('results_here')}</h3>
                                    <p>{t('fill_info_prompt')}</p>
                                </div>
                            )}
                         </div>
                    )}
                </div>
            )}
            
            {creationMode === 'video' && !isLoading && !error && generatedStoryboard && (
                <div className="w-full h-full animate-fade-in flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                         <h3 className="text-lg font-bold text-center text-brand-green">{t('storyboard_results_title')}</h3>
                         <div className="flex gap-2">
                            <button onClick={handleGenerateAllStoryboardImages} disabled={isGeneratingAll} className="px-3 py-2 text-sm font-semibold bg-dark-bg border border-dark-border rounded-lg hover:border-brand-cyan disabled:bg-gray-600">
                                {isGeneratingAll ? generatingAllProgress : t('generate_all_images')}
                            </button>
                             <button onClick={() => setIsSlideshowOpen(true)} className="px-3 py-2 text-sm font-semibold bg-brand-cyan text-white rounded-lg hover:bg-brand-cyan/90">
                                {t('view_storyboard')}
                            </button>
                         </div>
                    </div>
                     <div className="flex-grow overflow-y-auto pr-2 -mr-2 space-y-4">
                        <ContentRefinementPanel 
                            contentId={generatedStoryboard.id}
                            key={generatedStoryboard.id}
                            originalText={generatedStoryboard.storyboard.script_full}
                            onApplyChanges={handleApplyHumanizedStoryboard}
                            contentType="storyboard"
                            product={product}
                            characterAnalysis={characterAnalysis}
                            customerInsights={customerInsights}
                            context={customContext}
                        />
                        {generatedStoryboard.storyboard.storyboard.map((frame, index) => (
                            <StoryboardFrameCard 
                                key={index} 
                                frame={frame} 
                                frameIndex={index}
                                startTime={index * 3}
                                onGenerateSingleImage={handleGenerateSingleStoryboardImage}
                                isGeneratingAll={isGeneratingAll}
                                isGeneratingImage={generatingImageForFrame === index}
                            />
                        ))}
                    </div>
                </div>
            )}

        </div>
      </div>
    </div>
  );
};
