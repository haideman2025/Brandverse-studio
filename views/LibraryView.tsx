

import React, { useState, useMemo, useEffect } from 'react';
import { ContentItem, ImageContent, AdContent, BlogContent, BrandProfile, UploadedFile, ContentType, Project, StoryboardContent, VideoContent } from '../types';
import { CreationMode, ContentSubMode } from '../App';
import { useLibrary } from '../context/LibraryContext';
import { useBrand } from '../context/BrandContext';
import { PLATFORM_PLACEMENTS } from '../components/AdPreviews';
import JSZip from 'jszip';
import { useLanguage } from '../context/LanguageContext';
import { TranslationKey } from '../localization';
import { HistoryView } from './HistoryView'; // Re-using components from HistoryView

// --- Re-using components from HistoryView to avoid duplication ---
// This assumes HistoryView exports its internal components or we extract them.
// For this example, let's copy the required components here for simplicity.

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


const NewProjectModal: React.FC<{ onClose: () => void, onSave: (name: string) => void }> = ({ onClose, onSave }) => {
    const [name, setName] = useState('');
    const { t } = useLanguage();
    const handleSave = () => {
        if (name.trim()) {
            onSave(name.trim());
            onClose();
        }
    };
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-dark-card border border-dark-border rounded-xl shadow-xl w-full max-w-md">
                <h3 className="text-lg font-bold p-4 border-b border-dark-border">{t('create_project_title')}</h3>
                <div className="p-4 space-y-2">
                    <label htmlFor="project-name" className="text-sm font-medium text-dark-text-secondary">{t('project_name_label')}</label>
                    <input
                        id="project-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-dark-bg border border-dark-border rounded-lg py-2 px-3"
                        placeholder={t('project_name_placeholder')}
                        autoFocus
                    />
                </div>
                <div className="p-4 flex justify-end gap-2 border-t border-dark-border">
                    <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg bg-dark-bg border border-dark-border hover:bg-dark-border">{t('cancel')}</button>
                    <button onClick={handleSave} className="px-4 py-2 text-sm rounded-lg bg-brand-cyan text-white hover:bg-brand-cyan/90">{t('save_project')}</button>
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
                    ) : (
                        <p className="text-dark-text-secondary">{t('preview_not_available')}</p>
                    )}
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
                        <button onClick={(e) => { e.stopPropagation(); setIsDetailsModalOpen(true);}} className="text-white p-2 rounded-full bg-black/50 hover:bg-black/80">
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
}

// --- MAIN VIEW COMPONENT ---
const CONTENT_TYPE_FILTERS: { id: 'all' | ContentType, nameKey: TranslationKey }[] = [
    { id: 'all', nameKey: 'all_content' },
    { id: 'image', nameKey: 'type_images' },
    { id: 'ad', nameKey: 'type_ads' },
    { id: 'blog', nameKey: 'type_blogs' },
    { id: 'video_script', nameKey: 'type_storyboards'},
    { id: 'video', nameKey: 'type_videos' },
];

const SelectionToolbar: React.FC<{
    count: number;
    onDownload: () => void;
    onCancel: () => void;
    onMove: () => void;
    isDownloading: boolean;
}> = ({ count, onDownload, onCancel, onMove, isDownloading }) => {
    const { t } = useLanguage();
    return (
        <div className="fixed bottom-20 md:bottom-4 left-1/2 -translate-x-1/2 w-11/12 max-w-lg bg-dark-card border border-dark-border rounded-xl shadow-2xl p-3 flex justify-between items-center z-30 animate-fade-in">
            <p className="text-sm font-semibold">{t('items_selected').replace('{count}', count.toString())}</p>
            <div className="flex gap-2">
                <button onClick={onCancel} className="px-4 py-2 text-sm rounded-lg bg-dark-bg border border-dark-border hover:bg-dark-border">{t('cancel')}</button>
                <button onClick={onMove} className="px-4 py-2 text-sm rounded-lg bg-brand-purple text-white hover:bg-brand-purple/90">Move</button>
                <button onClick={onDownload} disabled={isDownloading} className="px-4 py-2 text-sm rounded-lg bg-brand-cyan text-white hover:bg-brand-cyan/90 disabled:opacity-50 disabled:cursor-wait">
                    {isDownloading ? t('zipping') : t('download_selected')}
                </button>
            </div>
        </div>
    );
};

const MoveProjectModal: React.FC<{
    projects: Project[];
    currentProjectId: string | 'all';
    onClose: () => void;
    onMove: (targetProjectId: string) => void;
}> = ({ projects, currentProjectId, onClose, onMove }) => {
    const [targetId, setTargetId] = useState<string>('');
    const { t } = useLanguage();

    const availableProjects = projects.filter(p => p.id !== currentProjectId);

    useEffect(() => {
        if (availableProjects.length > 0) {
            setTargetId(availableProjects[0].id);
        }
    }, [projects, currentProjectId]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-dark-card border border-dark-border rounded-xl shadow-xl w-full max-w-md">
                <h3 className="text-lg font-bold p-4 border-b border-dark-border">Move to Project</h3>
                <div className="p-4 space-y-2">
                    <label htmlFor="project-select" className="text-sm font-medium text-dark-text-secondary">Select destination project:</label>
                    <select
                        id="project-select"
                        value={targetId}
                        onChange={(e) => setTargetId(e.target.value)}
                        className="w-full bg-dark-bg border border-dark-border rounded-lg py-2 px-3"
                    >
                        {availableProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                <div className="p-4 flex justify-end gap-2 border-t border-dark-border">
                    <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg bg-dark-bg border border-dark-border hover:bg-dark-border">{t('cancel')}</button>
                    <button onClick={() => onMove(targetId)} disabled={!targetId} className="px-4 py-2 text-sm rounded-lg bg-brand-purple text-white hover:bg-brand-purple/90 disabled:opacity-50">Move</button>
                </div>
            </div>
        </div>
    );
};

export const LibraryView: React.FC<{ onEdit: (item: ContentItem, mode: CreationMode, subMode?: ContentSubMode) => void; }> = ({ onEdit }) => {
  const { projects, contentLibrary, addProject, deleteProject, updateProject, deleteContentItem, moveContentItems } = useLibrary();
  const { t } = useLanguage();
  const [activeProjectId, setActiveProjectId] = useState<string | 'all'>('all');
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | ContentType>('all');
  
  const [selectionMode, setSelectionMode] = useState(false);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [isDownloading, setIsDownloading] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<{ id: string; name: string } | null>(null);

  const filteredByProject = useMemo(() => {
    if (activeProjectId === 'all') return contentLibrary;
    return contentLibrary.filter(item => item.projectId === activeProjectId);
  }, [contentLibrary, activeProjectId]);

  const filteredContent = useMemo(() => {
    if (filter === 'all') return filteredByProject;
    return filteredByProject.filter(item => {
        if (filter === 'video_script') return item.type === 'video_script';
        if (filter === 'video') return item.type === 'video';
        return item.type === filter;
    });
  }, [filteredByProject, filter]);
  
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

  const activeProjectName = useMemo(() => {
      if(activeProjectId === 'all') return t('all_content');
      return projects.find(p => p.id === activeProjectId)?.name || t('select_a_project');
  }, [activeProjectId, projects, t]);
  
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

  const handleSaveRename = () => {
      if (editingProject && editingProject.name.trim()) {
          const project = projects.find(p => p.id === editingProject.id);
          if (project) {
              updateProject({ ...project, name: editingProject.name.trim() });
          }
      }
      setEditingProject(null);
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

  const handleDeleteProject = (projectId: string) => {
      if(window.confirm(t('confirm_delete_project'))) {
          deleteProject(projectId);
          setActiveProjectId('all');
      }
  }

  return (
    <div className="flex flex-col md:flex-row gap-8">
      {isNewProjectModalOpen && <NewProjectModal onClose={() => setIsNewProjectModalOpen(false)} onSave={addProject} />}
      {isMoveModalOpen && <MoveProjectModal projects={projects} currentProjectId={activeProjectId} onClose={() => setIsMoveModalOpen(false)} onMove={(targetId) => { moveContentItems(Array.from(selection), targetId); cancelSelection(); setIsMoveModalOpen(false); }} />}
      
      <aside className="md:w-64 flex-shrink-0 bg-dark-card border border-dark-border rounded-2xl p-4 h-fit">
        <h2 className="text-lg font-bold mb-4">{t('projects')}</h2>
        <nav className="space-y-1">
            <button onClick={() => setActiveProjectId('all')} className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeProjectId === 'all' ? 'bg-brand-cyan text-white' : 'hover:bg-dark-border'}`}>{t('all_content')}</button>
            {projects.map(p => (
                <div key={p.id} className="group flex items-center justify-between">
                    {editingProject?.id === p.id ? (
                        <input
                            type="text"
                            value={editingProject.name}
                            onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })}
                            onBlur={handleSaveRename}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveRename(); if (e.key === 'Escape') setEditingProject(null); }}
                            className="flex-grow bg-dark-bg border border-brand-cyan rounded-lg px-3 py-2 text-sm"
                            autoFocus
                        />
                    ) : (
                        <button onClick={() => setActiveProjectId(p.id)} className={`flex-grow text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeProjectId === p.id ? 'bg-brand-cyan text-white' : 'hover:bg-dark-border'}`}>{p.name}</button>
                    )}
                    <div className="flex items-center">
                        <button onClick={() => setEditingProject({id: p.id, name: p.name})} className="p-1 opacity-0 group-hover:opacity-100 text-dark-text-secondary hover:text-white"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" /></svg></button>
                        <button onClick={() => handleDeleteProject(p.id)} className="p-1 opacity-0 group-hover:opacity-100 text-dark-text-secondary hover:text-brand-coral"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                    </div>
                </div>
            ))}
        </nav>
        <button onClick={() => setIsNewProjectModalOpen(true)} className="w-full mt-4 py-2 border-2 border-dashed border-dark-border text-dark-text-secondary rounded-lg hover:border-brand-cyan hover:text-brand-cyan transition-colors">
            + {t('new_project')}
        </button>
      </aside>

      <main className="flex-grow">
        {selectionMode && <SelectionToolbar count={selection.size} onDownload={handleDownloadSelected} onCancel={cancelSelection} onMove={() => setIsMoveModalOpen(true)} isDownloading={isDownloading} />}
         <div className="bg-dark-card border border-dark-border rounded-xl p-3 mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
                 <h2 className="text-xl font-bold">{activeProjectName}</h2>
                 <p className="text-sm text-dark-text-secondary">{t('item_count').replace('{count}', filteredByProject.length.toString())}</p>
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

        <div className="flex flex-wrap justify-start gap-2 mb-6">
            {CONTENT_TYPE_FILTERS.map(f => (
                <button key={f.id} onClick={() => setFilter(f.id)} className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors ${filter === f.id ? 'bg-brand-cyan text-white' : 'bg-dark-bg text-dark-text-secondary hover:bg-dark-border'}`}>{t(f.nameKey)}</button>
            ))}
        </div>
        
        {filteredContent.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredContent.map(item => {
                  switch (item.type) {
                      case 'image': return <ImageCard key={item.id} item={item} onEdit={onEdit} onDelete={deleteContentItem} selectionMode={selectionMode} isSelected={selection.has(item.id)} onSelect={toggleSelection} />;
                      case 'ad': return <AdCard key={item.id} item={item} onDelete={deleteContentItem} selectionMode={selectionMode} isSelected={selection.has(item.id)} onSelect={toggleSelection} />;
                      case 'blog': return <BlogCard key={item.id} item={item} onDelete={deleteContentItem} selectionMode={selectionMode} isSelected={selection.has(item.id)} onSelect={toggleSelection} />;
                      // The following cards need to be implemented or imported if they exist
                      case 'video_script': return <div>Storyboard Card Placeholder</div> // Replace with actual StoryboardCard
                      case 'video': return <div>Video Card Placeholder</div> // Replace with actual VideoCard
                      default: return null;
                  }
              })}
          </div>
        ) : contentLibrary.length === 0 ? (
          <div className="text-center py-16">
              <h3 className="text-xl font-bold">{t('no_content_title')}</h3>
              <p className="text-dark-text-secondary mt-2">{t('no_content_prompt')}</p>
          </div>
        ) : (
           <div className="text-center py-16">
              <h3 className="text-xl font-bold">{t('no_type_title').replace('{type}', filter)}</h3>
              <p className="text-dark-text-secondary mt-2">{activeProjectId === 'all' ? t('no_type_prompt').replace('{type}', filter) : t('no_content_in_project_prompt')}</p>
          </div>
        )}
      </main>
    </div>
  );
};
