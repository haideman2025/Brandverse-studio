import React, { useState, useMemo } from 'react';
import { ContentItem, ImageContent, AdContent, BlogContent, BrandProfile, PlatformName, UploadedFile, ContentType, Product, StoryboardContent, VideoContent } from '../types';
import { CreationMode, ContentSubMode } from '../App';
import { useLibrary } from '../context/LibraryContext';
import { useBrand } from '../context/BrandContext';
import { PLATFORM_PLACEMENTS } from '../components/AdPreviews';
import JSZip from 'jszip';
import { useLanguage } from '../context/LanguageContext';
import { TranslationKey } from '../localization';
import { SlideshowPreviewModal } from '../components/SlideshowPreviewModal';


// --- HELPER & MODAL COMPONENTS ---

const DetailRow: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => {
    if (!value) return null;
    return (
        <div className="text-sm grid grid-cols-3 gap-2">
            <strong className="text-dark-text-secondary col-span-1">{label}:</strong>
            <span className="text-dark-text col-span-2">{value}</span>
        </div>
    );
};

const FileDetail: React.FC<{ label: string; file: { name: string, url?: string } | null | undefined }> = ({ label, file }) => {
    if (!file) return null;
    return (
        <div className="flex items-center gap-2 text-sm">
            <strong className="text-dark-text-secondary w-1/3">{label}:</strong>
            <div className="flex items-center gap-2">
                {file.url && <img src={file.url} alt={file.name} className="w-8 h-8 rounded object-cover border border-dark-border" />}
                <span className="text-dark-text truncate">{file.name}</span>
            </div>
        </div>
    );
};

const ImageDetailsModal: React.FC<{ item: ImageContent, onClose: () => void }> = ({ item, onClose }) => {
    const { profiles } = useBrand();
    const { t } = useLanguage();
    const brand = profiles.find(p => p.id === item.settings.brandId);
    const product = brand?.products.find(pr => pr.id === item.settings.selectedProductId);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-dark-card border border-dark-border rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
                <div className="p-4 border-b border-dark-border flex justify-between items-center">
                    <h3 className="text-lg font-bold">Image Details: {item.name}</h3>
                    <button onClick={onClose} className="text-dark-text-secondary text-2xl font-bold hover:text-dark-text">&times;</button>
                </div>
                <div className="flex-grow p-6 overflow-y-auto flex flex-col md:flex-row gap-6">
                    <div className="md:w-1/2 flex items-center justify-center bg-dark-bg rounded-lg p-2">
                        <img src={item.url} alt={item.name} className="max-w-full max-h-full object-contain rounded-md"/>
                    </div>
                    <div className="md:w-1/2 space-y-3">
                        <h4 className="text-lg font-semibold text-brand-cyan">Creation Context</h4>
                        <DetailRow label="Product" value={product?.product_name} />
                        <FileDetail label="Main Idol" file={item.settings.mainIdol} />
                        <FileDetail label="Supporting Idol" file={item.settings.supportingIdol} />
                        <FileDetail label="Outfit" file={item.settings.outfit} />
                        <DetailRow label="Scene/Style" value={item.settings.brandStyle} />
                        <DetailRow label="Camera Shot" value={item.settings.cameraShot} />
                        <DetailRow label="Image Format" value={item.settings.imageFormat} />
                        <DetailRow label="Aspect Ratio" value={item.settings.aspectRatio} />
                        <DetailRow label="Customer Insights" value={item.settings.customerInsights} />
                        
                        <h5 className="text-md font-semibold pt-3 border-t border-dark-border mt-3 text-brand-cyan">Full Prompt</h5>
                        <pre className="text-xs whitespace-pre-wrap font-mono bg-dark-bg p-3 rounded-md max-h-48 overflow-y-auto">{item.prompt}</pre>
                    </div>
                </div>
                <div className="p-4 border-t border-dark-border text-right">
                    <button onClick={onClose} className="px-6 py-2 bg-brand-cyan text-white font-semibold rounded-lg hover:bg-brand-cyan/90">{t('close')}</button>
                </div>
            </div>
        </div>
    );
};

const ViewAdModal: React.FC<{ item: AdContent, brand: BrandProfile | null | undefined, onClose: () => void }> = ({ item, brand, onClose }) => {
    const { t } = useLanguage();
    const product = brand?.products.find(p => p.id === item.settings.selectedProductId);
    const PlacementComponent = PLATFORM_PLACEMENTS[item.settings.platform || 'Facebook']?.find(p => p.id === item.settings.placementId)?.component;
    const baseImageFile: UploadedFile = {
        name: 'baseImage',
        type: item.settings.baseAssetMimeType || 'image/png',
        url: item.baseImageUrl,
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-dark-card border border-dark-border rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <h3 className="text-lg font-bold p-4 border-b border-dark-border text-yellow-500">{t('ad_creative_title')}: {item.name}</h3>
                <div className="p-6 overflow-y-auto flex items-center justify-center bg-dark-bg">
                    {PlacementComponent ? (
                        <PlacementComponent
                            baseImage={baseImageFile}
                            headline={item.headline}
                            body={item.body}
                            cta={item.cta}
                            fontFamily={item.settings.textFont || 'sans-serif'}
                            brandName={brand?.name || 'Your Brand'}
                            brandLogoUrl={brand?.logo?.url}
                        />
                    ) : <p className="text-dark-text-secondary">{t('preview_not_available')}</p> }
                </div>
                <details className="border-t border-dark-border">
                    <summary className="p-4 cursor-pointer font-semibold text-brand-cyan">View Creation Context</summary>
                    <div className="px-4 pb-4 space-y-2 bg-dark-bg border-t border-dark-border">
                        <DetailRow label="Product" value={product?.product_name} />
                        <FileDetail label="Main Idol" file={item.settings.mainIdol} />
                        <DetailRow label="Ad Goal" value={item.settings.adGoal} />
                        <DetailRow label="Viral Formula" value={item.settings.viralAdFormula} />
                        <DetailRow label="Target" value={`${item.settings.targetGender}, ${item.settings.targetAge}`} />
                        <DetailRow label="Insights" value={item.settings.customerInsights} />
                    </div>
                </details>
                <div className="p-4 border-t border-dark-border text-right sticky bottom-0 bg-dark-card">
                    <button onClick={onClose} className="px-6 py-2 bg-brand-cyan text-white font-semibold rounded-lg hover:bg-brand-cyan/90">{t('close')}</button>
                </div>
            </div>
        </div>
    );
};

const ViewBlogModal: React.FC<{ item: BlogContent, brand: BrandProfile | null | undefined, onClose: () => void }> = ({ item, brand, onClose }) => {
    const { t } = useLanguage();
    const product = brand?.products.find(p => p.id === item.settings.selectedProductId);
    return (
         <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-dark-card border border-dark-border rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                 <h3 className="text-lg font-bold p-4 border-b border-dark-border text-indigo-400 sticky top-0 bg-dark-card">{t('blog_post_title')}: {item.title}</h3>
                 <div className="p-1 bg-dark-bg flex-grow overflow-y-auto">
                     <div className="w-full h-full bg-white text-gray-800 rounded-xl p-8 font-serif">
                        <h1 className="text-4xl font-bold mb-4 text-gray-900">{item.title}</h1>
                        <p className="text-sm text-gray-500 mb-8">By {brand?.name || 'Your Brand'} | Published on {new Date(item.createdAt).toLocaleDateString()}</p>
                        {item.featuredImageUrl && (
                             <div className="my-6">
                                {item.settings.featuredAssetMimeType?.startsWith('video/') ? (
                                    <video src={item.featuredImageUrl} muted loop autoPlay playsInline className="w-full h-auto rounded-xl shadow-xl" />
                                ) : (
                                    <img src={item.featuredImageUrl} alt={item.title} className="w-full h-auto rounded-xl shadow-xl" />
                                )}
                             </div>
                        )}
                        {item.sections.map((section, index) => (
                            <div key={index} className="mb-8">
                                <h2 className="text-2xl font-bold mb-3 text-gray-900">{section.heading}</h2>
                                 {section.imageUrl && (
                                    <div className="my-4">
                                        <img src={section.imageUrl} alt={section.heading} className="w-full h-auto rounded-lg shadow-lg" />
                                    </div>
                                )}
                                <div className="space-y-4 text-gray-700 leading-relaxed whitespace-pre-wrap">
                                    {section.paragraph.split('\n\n').map((para, pIndex) => <p key={pIndex}>{para}</p>)}
                                </div>
                            </div>
                        ))}
                     </div>
                 </div>
                 <details className="border-t border-dark-border">
                    <summary className="p-4 cursor-pointer font-semibold text-brand-cyan">View Creation Context</summary>
                    <div className="px-4 pb-4 space-y-2 bg-dark-bg border-t border-dark-border">
                        <DetailRow label="Product" value={product?.product_name} />
                        <FileDetail label="Featured Image Source" file={item.settings.mainIdol} />
                        <DetailRow label="Blog Goal" value={item.settings.blogGoal} />
                        <DetailRow label="Blog Length" value={item.settings.blogLength} />
                        <DetailRow label="Topic" value={item.settings.topic} />
                        <DetailRow label="Keywords" value={item.settings.keywords.join(', ')} />
                        <DetailRow label="Insights" value={item.settings.customerInsights} />
                    </div>
                </details>
                 <div className="p-4 border-t border-dark-border text-right sticky bottom-0 bg-dark-card">
                    <button onClick={onClose} className="px-6 py-2 bg-brand-cyan text-white font-semibold rounded-lg hover:bg-brand-cyan/90">{t('close')}</button>
                </div>
            </div>
        </div>
    );
};

const ViewVideoModal: React.FC<{ item: VideoContent, onClose: () => void }> = ({ item, onClose }) => {
    const { t } = useLanguage();
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-dark-card border border-dark-border rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold p-4 border-b border-dark-border text-red-400">Video: {item.name}</h3>
                <div className="p-6 flex-grow overflow-y-auto flex items-center justify-center bg-dark-bg">
                    <video src={item.url} controls autoPlay className="max-w-full max-h-full rounded-lg" />
                </div>
                <div className="p-4 border-t border-dark-border text-right sticky bottom-0 bg-dark-card">
                    <button onClick={onClose} className="px-6 py-2 bg-brand-cyan text-white font-semibold rounded-lg hover:bg-brand-cyan/90">{t('close')}</button>
                </div>
            </div>
        </div>
    );
};


// --- CARD COMPONENTS ---

const ImageCard: React.FC<{ 
    item: ImageContent, 
    onEdit: (item: ImageContent, mode: CreationMode, subMode?: ContentSubMode) => void, 
    onDelete: (id: string) => void,
    selectionMode: boolean,
    isSelected: boolean,
    onSelect: (id: string) => void,
}> = ({ item, onEdit, onDelete, selectionMode, isSelected, onSelect }) => {
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const { t } = useLanguage();
    const handleDelete = () => {
        if (window.confirm(t('confirm_delete_image'))) onDelete(item.id);
    };
    const handleCardClick = () => {
        if (selectionMode) {
            onSelect(item.id);
        }
    };

    return (
        <>
            {isDetailsModalOpen && <ImageDetailsModal item={item} onClose={() => setIsDetailsModalOpen(false)} />}
            <div onClick={handleCardClick} className={`bg-dark-card border border-dark-border rounded-2xl overflow-hidden group flex flex-col relative transition-all duration-200 ${selectionMode ? 'cursor-pointer' : ''} ${isSelected ? 'ring-2 ring-brand-cyan' : ''}`}>
                {selectionMode && (
                    <div className="absolute top-2 left-2 z-10 bg-dark-card p-1 rounded-full">
                        <div className={`w-5 h-5 rounded-full border-2 ${isSelected ? 'bg-brand-cyan border-brand-cyan' : 'border-gray-400'}`}>
                            {isSelected && <svg className="w-full h-full text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                        </div>
                    </div>
                )}
                <div className="relative aspect-w-1 aspect-h-1 bg-dark-bg">
                    <img src={item.url} alt={item.name} className="object-cover w-full h-full" />
                     <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button onClick={(e) => { e.stopPropagation(); setIsDetailsModalOpen(true); }} className="text-white p-2 rounded-full bg-black/50 hover:bg-black/80">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </button>
                    </div>
                    {!selectionMode && <span className="absolute top-2 left-2 text-xs bg-brand-green text-black font-bold px-2 py-0.5 rounded-lg">{t('type_image').toUpperCase()}</span>}
                </div>
                <div className="p-3 flex flex-col flex-grow">
                    <p className="font-semibold text-sm truncate">{item.name}</p>
                    <p className="text-xs text-dark-text-secondary mb-2">{new Date(item.createdAt).toLocaleString()}</p>
                    <div className="mt-auto grid grid-cols-3 gap-2 text-xs">
                        <button onClick={(e) => { e.stopPropagation(); onEdit(item, 'image');}} className="w-full py-1.5 px-2 bg-dark-bg border border-dark-border rounded-lg hover:border-brand-cyan">{t('edit')}</button>
                        <button onClick={(e) => { e.stopPropagation(); onEdit(item, 'content', 'ad');}} className="w-full py-1.5 px-2 bg-dark-bg border border-dark-border rounded-lg hover:border-yellow-500">{t('create_ad')}</button>
                        <button onClick={(e) => { e.stopPropagation(); onEdit(item, 'content', 'blog');}} className="w-full py-1.5 px-2 bg-dark-bg border border-dark-border rounded-lg hover:border-indigo-500">{t('write_blog')}</button>
                    </div>
                     <a href={item.url} download={`${item.name.replace(/\s+/g, '_')}.png`} onClick={(e) => e.stopPropagation()} className="mt-2 text-center w-full py-1.5 px-2 bg-dark-bg border border-dark-border rounded-lg hover:border-brand-green text-xs">{t('download')}</a>
                </div>
                <button onClick={(e) => { e.stopPropagation(); handleDelete();}} className="absolute top-2 right-2 p-1.5 rounded-full bg-dark-bg/60 text-dark-text hover:bg-brand-coral hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
        </>
    );
};

const AdCard: React.FC<{ item: AdContent, onDelete: (id: string) => void, selectionMode: boolean, isSelected: boolean, onSelect: (id: string) => void }> = ({ item, onDelete, selectionMode, isSelected, onSelect }) => {
    const [isViewerOpen, setIsViewerOpen] = useState(false);
    const { profiles } = useBrand();
    const { t } = useLanguage();
    const brand = profiles.find(p => p.id === item.settings.brandId);

    const handleDelete = () => {
        if (window.confirm(t('confirm_delete_ad'))) onDelete(item.id);
    };
    const handleCardClick = () => {
        if (selectionMode) {
            onSelect(item.id);
        }
    };
    
    const platformName = item.settings.platform || 'AD';
    const placementName = PLATFORM_PLACEMENTS[platformName]?.find(p => p.id === item.settings.placementId)?.name || '';

    return (
        <>
        {isViewerOpen && <ViewAdModal item={item} brand={brand} onClose={() => setIsViewerOpen(false)} />}
        <div onClick={handleCardClick} className={`bg-dark-card border border-dark-border rounded-2xl overflow-hidden group flex flex-col relative transition-all duration-200 ${selectionMode ? 'cursor-pointer' : ''} ${isSelected ? 'ring-2 ring-brand-cyan' : ''}`}>
             {selectionMode && (
                <div className="absolute top-2 left-2 z-10 bg-dark-card p-1 rounded-full">
                    <div className={`w-5 h-5 rounded-full border-2 ${isSelected ? 'bg-brand-cyan border-brand-cyan' : 'border-gray-400'}`}>
                        {isSelected && <svg className="w-full h-full text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                    </div>
                </div>
            )}
            <div className="relative aspect-w-1 aspect-h-1 bg-dark-bg">
                {item.settings.baseAssetMimeType?.startsWith('video/') ? (
                    <video src={item.baseImageUrl} muted loop autoPlay playsInline className="object-cover w-full h-full" />
                ) : (
                    <img src={item.baseImageUrl} alt={item.headline} className="object-cover w-full h-full" />
                )}
                {!selectionMode && <span className="absolute top-2 left-2 text-xs bg-yellow-500 text-black font-bold px-2 py-0.5 rounded-lg">{platformName.toUpperCase()}</span>}
            </div>
            <div className="p-3 flex flex-col flex-grow">
                <p className="font-semibold text-sm truncate" title={item.headline}>{item.headline}</p>
                <p className="text-xs text-dark-text-secondary" title={placementName}>{placementName}</p>
                <p className="text-xs text-dark-text-secondary mt-1 mb-2">{new Date(item.createdAt).toLocaleString()}</p>
                <div className="mt-auto grid grid-cols-1 gap-2 text-xs">
                     <button onClick={(e) => { e.stopPropagation(); setIsViewerOpen(true);}} className="w-full text-center py-1.5 px-2 bg-dark-bg border border-dark-border rounded-lg hover:border-yellow-500">{t('view_details')}</button>
                </div>
            </div>
            <button onClick={(e) => { e.stopPropagation(); handleDelete();}} className="absolute top-2 right-2 p-1.5 rounded-full bg-dark-bg/60 text-dark-text hover:bg-brand-coral hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>
        </>
    );
};

const BlogCard: React.FC<{ item: BlogContent, onDelete: (id: string) => void, selectionMode: boolean, isSelected: boolean, onSelect: (id: string) => void }> = ({ item, onDelete, selectionMode, isSelected, onSelect }) => {
    const [isViewerOpen, setIsViewerOpen] = useState(false);
    const { profiles } = useBrand();
    const { t } = useLanguage();
    const brand = profiles.find(p => p.id === item.settings.brandId);

    const handleDelete = () => {
        if (window.confirm(t('confirm_delete_blog'))) onDelete(item.id);
    };
    const handleCardClick = () => {
        if (selectionMode) {
            onSelect(item.id);
        }
    };
    return (
        <>
        {isViewerOpen && <ViewBlogModal item={item} brand={brand} onClose={() => setIsViewerOpen(false)} />}
        <div onClick={handleCardClick} className={`bg-dark-card border border-dark-border rounded-2xl overflow-hidden group flex flex-col relative transition-all duration-200 ${selectionMode ? 'cursor-pointer' : ''} ${isSelected ? 'ring-2 ring-brand-cyan' : ''}`}>
            {selectionMode && (
                <div className="absolute top-2 left-2 z-10 bg-dark-card p-1 rounded-full">
                    <div className={`w-5 h-5 rounded-full border-2 ${isSelected ? 'bg-brand-cyan border-brand-cyan' : 'border-gray-400'}`}>
                        {isSelected && <svg className="w-full h-full text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                    </div>
                </div>
            )}
            <div className="relative aspect-w-1 aspect-h-1 bg-dark-bg flex flex-col items-center justify-center p-4">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                {!selectionMode && <span className="absolute top-2 left-2 text-xs bg-indigo-400 text-white font-bold px-2 py-0.5 rounded-lg">{t('type_blog').toUpperCase()}</span>}
            </div>
             <div className="p-3 flex flex-col flex-grow">
                <p className="font-semibold text-sm truncate" title={item.title}>{item.title}</p>
                <p className="text-xs text-dark-text-secondary mb-2">{new Date(item.createdAt).toLocaleString()}</p>
                <div className="mt-auto grid grid-cols-1 gap-2 text-xs">
                    <button onClick={(e) => { e.stopPropagation(); setIsViewerOpen(true);}} className="w-full text-center py-1.5 px-2 bg-dark-bg border border-dark-border rounded-lg hover:border-indigo-400">{t('view_post')}</button>
                </div>
            </div>
             <button onClick={(e) => { e.stopPropagation(); handleDelete();}} className="absolute top-2 right-2 p-1.5 rounded-full bg-dark-bg/60 text-dark-text hover:bg-brand-coral hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>
        </>
    );
};

const StoryboardCard: React.FC<{
    item: StoryboardContent,
    onEdit: (item: StoryboardContent, mode: CreationMode) => void,
    onDelete: (id: string) => void,
    selectionMode: boolean,
    isSelected: boolean,
    onSelect: (id: string) => void,
}> = ({ item, onEdit, onDelete, selectionMode, isSelected, onSelect }) => {
    const [isViewerOpen, setIsViewerOpen] = useState(false);
    const { t } = useLanguage();

    const handleDelete = () => {
        if (window.confirm(t('confirm_delete_storyboard'))) onDelete(item.id);
    };
    const handleCardClick = () => {
        if (selectionMode) {
            onSelect(item.id);
        }
    };
    const handleDownloadScript = () => {
        const script = item.storyboard.script_full;
        const blob = new Blob([script], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${item.name.replace(/\s+/g, '_')}_script.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };
    
    const song = (item.settings as any).song as UploadedFile | null;

    return (
        <>
        {isViewerOpen && <SlideshowPreviewModal 
            storyboardContent={item} 
            onClose={() => setIsViewerOpen(false)} 
            songFile={song}
            isGeneratingVideo={false} 
            progressMessage=""
        />}
        <div onClick={handleCardClick} className={`bg-dark-card border border-dark-border rounded-2xl overflow-hidden group flex flex-col relative transition-all duration-200 ${selectionMode ? 'cursor-pointer' : ''} ${isSelected ? 'ring-2 ring-brand-cyan' : ''}`}>
            {selectionMode && (
                <div className="absolute top-2 left-2 z-10 bg-dark-card p-1 rounded-full">
                    <div className={`w-5 h-5 rounded-full border-2 ${isSelected ? 'bg-brand-cyan border-brand-cyan' : 'border-gray-400'}`}>
                        {isSelected && <svg className="w-full h-full text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                    </div>
                </div>
            )}
            <div className="relative aspect-w-1 aspect-h-1 bg-dark-bg flex flex-col items-center justify-center p-4">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                {!selectionMode && <span className="absolute top-2 left-2 text-xs bg-purple-500 text-white font-bold px-2 py-0.5 rounded-lg">{t('type_storyboard').toUpperCase()}</span>}
            </div>
             <div className="p-3 flex flex-col flex-grow">
                <p className="font-semibold text-sm truncate" title={item.name}>{item.name}</p>
                <p className="text-xs text-dark-text-secondary mb-2">{new Date(item.createdAt).toLocaleString()}</p>
                <div className="mt-auto grid grid-cols-2 gap-2 text-xs">
                    <button onClick={(e) => { e.stopPropagation(); setIsViewerOpen(true);}} className="w-full text-center py-1.5 px-2 bg-dark-bg border border-dark-border rounded-lg hover:border-purple-400">{t('view_storyboard')}</button>
                    <button onClick={(e) => { e.stopPropagation(); onEdit(item, 'video');}} className="w-full py-1.5 px-2 bg-dark-bg border border-dark-border rounded-lg hover:border-brand-cyan">{t('edit')}</button>
                </div>
                <button onClick={(e) => { e.stopPropagation(); handleDownloadScript();}} className="mt-2 w-full text-center py-1.5 px-2 bg-dark-bg border border-dark-border rounded-lg hover:border-brand-green">{t('download_script')}</button>
            </div>
             <button onClick={(e) => { e.stopPropagation(); handleDelete();}} className="absolute top-2 right-2 p-1.5 rounded-full bg-dark-bg/60 text-dark-text hover:bg-brand-coral hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>
        </>
    );
};

const VideoCard: React.FC<{
    item: VideoContent,
    onDelete: (id: string) => void,
    selectionMode: boolean,
    isSelected: boolean,
    onSelect: (id: string) => void,
}> = ({ item, onDelete, selectionMode, isSelected, onSelect }) => {
    const [isViewerOpen, setIsViewerOpen] = useState(false);
    const { t } = useLanguage();

    const handleDelete = () => {
        if (window.confirm(t('confirm_delete_video'))) onDelete(item.id);
    };
    const handleCardClick = () => {
        if (selectionMode) {
            onSelect(item.id);
        }
    };
    
    return (
        <>
        {isViewerOpen && <ViewVideoModal item={item} onClose={() => setIsViewerOpen(false)} />}
        <div onClick={handleCardClick} className={`bg-dark-card border border-dark-border rounded-2xl overflow-hidden group flex flex-col relative transition-all duration-200 ${selectionMode ? 'cursor-pointer' : ''} ${isSelected ? 'ring-2 ring-brand-cyan' : ''}`}>
            {selectionMode && (
                <div className="absolute top-2 left-2 z-10 bg-dark-card p-1 rounded-full">
                    <div className={`w-5 h-5 rounded-full border-2 ${isSelected ? 'bg-brand-cyan border-brand-cyan' : 'border-gray-400'}`}>
                        {isSelected && <svg className="w-full h-full text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                    </div>
                </div>
            )}
            <div className="relative aspect-w-1 aspect-h-1 bg-dark-bg">
                <video src={item.url} muted loop autoPlay playsInline className="object-cover w-full h-full" />
                {!selectionMode && <span className="absolute top-2 left-2 text-xs bg-red-500 text-white font-bold px-2 py-0.5 rounded-lg">{t('type_video').toUpperCase()}</span>}
            </div>
             <div className="p-3 flex flex-col flex-grow">
                <p className="font-semibold text-sm truncate" title={item.name}>{item.name}</p>
                <p className="text-xs text-dark-text-secondary mb-2">{new Date(item.createdAt).toLocaleString()}</p>
                <div className="mt-auto grid grid-cols-1 gap-2 text-xs">
                    <button onClick={(e) => { e.stopPropagation(); setIsViewerOpen(true);}} className="w-full text-center py-1.5 px-2 bg-dark-bg border border-dark-border rounded-lg hover:border-red-400">{t('view_video')}</button>
                </div>
                 <a href={item.url} download={`${item.name.replace(/\s+/g, '_')}.mp4`} onClick={(e) => e.stopPropagation()} className="mt-2 text-center w-full py-1.5 px-2 bg-dark-bg border border-dark-border rounded-lg hover:border-brand-green text-xs">{t('download')}</a>
            </div>
             <button onClick={(e) => { e.stopPropagation(); handleDelete();}} className="absolute top-2 right-2 p-1.5 rounded-full bg-dark-bg/60 text-dark-text hover:bg-brand-coral hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>
        </>
    );
};


// --- MAIN VIEW COMPONENT ---
const CONTENT_TYPE_FILTERS: { id: 'all' | ContentType, nameKey: TranslationKey }[] = [
    { id: 'all', nameKey: 'all_content' },
    { id: 'image', nameKey: 'type_images' },
    { id: 'ad', nameKey: 'type_ads' },
    { id: 'blog', nameKey: 'type_blogs' },
    { id: 'video_script', nameKey: 'type_storyboards' },
    { id: 'video', nameKey: 'type_videos' },
];

const SelectionToolbar: React.FC<{
    count: number;
    onDownload: () => void;
    onCancel: () => void;
    isDownloading: boolean;
}> = ({ count, onDownload, onCancel, isDownloading }) => {
    const { t } = useLanguage();
    return (
        <div className="fixed bottom-20 md:bottom-4 left-1/2 -translate-x-1/2 w-11/12 max-w-lg bg-dark-card border border-dark-border rounded-xl shadow-2xl p-3 flex justify-between items-center z-30 animate-fade-in">
            <p className="text-sm font-semibold">{t('items_selected').replace('{count}', count.toString())}</p>
            <div className="flex gap-2">
                <button onClick={onCancel} className="px-4 py-2 text-sm rounded-lg bg-dark-bg border border-dark-border hover:bg-dark-border">{t('cancel')}</button>
                <button onClick={onDownload} disabled={isDownloading} className="px-4 py-2 text-sm rounded-lg bg-brand-cyan text-white hover:bg-brand-cyan/90 disabled:opacity-50 disabled:cursor-wait">
                    {isDownloading ? t('zipping') : t('download_selected')}
                </button>
            </div>
        </div>
    );
};

export const HistoryView: React.FC<{ onEdit: (item: ContentItem, mode: CreationMode, subMode?: ContentSubMode) => void; }> = ({ onEdit }) => {
  const { contentLibrary, deleteContentItem } = useLibrary();
  const { t } = useLanguage();
  const [filter, setFilter] = useState<'all' | ContentType>('all');
  
  const [selectionMode, setSelectionMode] = useState(false);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [isDownloading, setIsDownloading] = useState(false);

  const filteredContent = useMemo(() => {
    if (filter === 'all') return contentLibrary;
    return contentLibrary.filter(item => item.type === filter);
  }, [contentLibrary, filter]);

  const allVisibleSelected = useMemo(() => 
    filteredContent.length > 0 && filteredContent.every(item => selection.has(item.id)),
    [filteredContent, selection]
  );

  const handleSelectAll = () => {
    if (allVisibleSelected) {
        setSelection(new Set());
    } else {
        const allIds = new Set(filteredContent.map(item => item.id));
        setSelection(allIds);
    }
  };
  
  const toggleSelection = (id: string) => {
    setSelection(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        if (next.size === 0) setSelectionMode(false);
        return next;
    });
  };

  const cancelSelection = () => {
    setSelection(new Set());
    setSelectionMode(false);
  };
  
  const handleDownloadSelected = async () => {
    setIsDownloading(true);
    const zip = new JSZip();
    const itemsToDownload = contentLibrary.filter(item => selection.has(item.id));
    
    const fetchBlob = async (url: string) => (await fetch(url)).blob();
    const sanitizeFilename = (name: string, type: string, id: string) => {
        const base = name.replace(/[^a-z0-9_ -]/gi, '_').substring(0, 50);
        let ext = 'txt';
        if (type === 'image') ext = 'png';
        if (type === 'ad' || type === 'blog') ext = 'json';
        if (type === 'video') ext = 'mp4';
        return `${type}_${base}_${id.substring(0, 4)}.${ext}`;
    }

    for (const item of itemsToDownload) {
        try {
            switch (item.type) {
                case 'image':
                case 'video':
                    zip.file(sanitizeFilename(item.name, item.type, item.id), fetchBlob(item.url));
                    break;
                case 'ad': {
                    const adData = { ...item };
                    delete (adData as any).baseImageUrl; 
                    zip.file(sanitizeFilename(item.name, 'ad-data', item.id), JSON.stringify(adData, null, 2));
                    zip.file(sanitizeFilename(item.name, 'ad-image', item.id), fetchBlob(item.baseImageUrl));
                    break;
                }
                case 'blog':
                case 'video_script':
                    zip.file(sanitizeFilename(item.name, item.type, item.id), JSON.stringify(item, null, 2));
                    break;
            }
        } catch (e) { console.error(`Failed to add ${item.name} to zip:`, e); }
    }
    
    const content = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = `BrandVerse_Export_${new Date().toISOString().split('T')[0]}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    setIsDownloading(false);
    cancelSelection();
  };

  return (
    <div className="max-w-7xl mx-auto">
      {selectionMode && <SelectionToolbar count={selection.size} onDownload={handleDownloadSelected} onCancel={cancelSelection} isDownloading={isDownloading} />}
      <div className="text-center mb-8">
        <h2 className="font-display text-4xl font-bold text-dark-text">{t('history_title')}</h2>
        <p className="text-dark-text-secondary mt-1">{t('history_subtitle').replace('{count}', contentLibrary.length.toString())}</p>
      </div>

      <div className="bg-dark-card border border-dark-border rounded-xl p-3 mb-6 flex flex-col sm:flex-row justify-between items-center gap-4 sticky top-[70px] z-20 backdrop-blur-sm">
        <div className="flex-grow flex flex-wrap justify-center sm:justify-start gap-2">
            {CONTENT_TYPE_FILTERS.map(f => (
                <button key={f.id} onClick={() => setFilter(f.id)} className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors ${filter === f.id ? 'bg-brand-cyan text-white' : 'bg-dark-bg text-dark-text-secondary hover:bg-dark-border'}`}>{t(f.nameKey)}</button>
            ))}
        </div>
        <div className="flex-shrink-0 flex items-center gap-2">
           {selectionMode && (
                <button onClick={handleSelectAll} className="px-3 py-1.5 text-sm font-semibold bg-dark-bg border border-dark-border rounded-lg text-dark-text-secondary hover:border-brand-cyan">
                    {allVisibleSelected ? t('deselect_all') : `${t('select_all')} (${filteredContent.length})`}
                </button>
            )}
            <button onClick={() => setSelectionMode(!selectionMode)} className={`px-3 py-1.5 text-sm font-semibold rounded-lg ${selectionMode ? 'bg-brand-coral text-white' : 'bg-brand-cyan text-white'}`}>
                {selectionMode ? t('cancel_selection') : t('select_items')}
            </button>
        </div>
      </div>
      
      {filteredContent.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredContent.map(item => {
                switch (item.type) {
                    case 'image': return <ImageCard key={item.id} item={item} onEdit={onEdit} onDelete={deleteContentItem} selectionMode={selectionMode} isSelected={selection.has(item.id)} onSelect={toggleSelection} />;
                    case 'ad': return <AdCard key={item.id} item={item} onDelete={deleteContentItem} selectionMode={selectionMode} isSelected={selection.has(item.id)} onSelect={toggleSelection} />;
                    case 'blog': return <BlogCard key={item.id} item={item} onDelete={deleteContentItem} selectionMode={selectionMode} isSelected={selection.has(item.id)} onSelect={toggleSelection} />;
                    case 'video_script': return <StoryboardCard key={item.id} item={item} onEdit={onEdit} onDelete={deleteContentItem} selectionMode={selectionMode} isSelected={selection.has(item.id)} onSelect={toggleSelection} />;
                    case 'video': return <VideoCard key={item.id} item={item} onDelete={deleteContentItem} selectionMode={selectionMode} isSelected={selection.has(item.id)} onSelect={toggleSelection} />;
                    default: return null;
                }
            })}
        </div>
      ) : contentLibrary.length === 0 ? (
        <div className="text-center py-16">
            <h3 className="text-xl font-bold">{t('no_history_title')}</h3>
            <p className="text-dark-text-secondary mt-2">{t('no_history_prompt')}</p>
        </div>
      ) : (
         <div className="text-center py-16">
            <h3 className="text-xl font-bold">{t('no_type_title').replace('{type}', filter)}</h3>
            <p className="text-dark-text-secondary mt-2">{t('no_type_prompt').replace('{type}', filter)}</p>
        </div>
      )}
    </div>
  );
};