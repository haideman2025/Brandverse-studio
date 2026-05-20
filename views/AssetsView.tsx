

import React, { useState, useEffect } from 'react';
import { useBrand } from '../context/BrandContext';
import { FileUpload } from '../components/FileUpload';
import { BrandProfile, Product, UploadedFile, VirtualIdol, TargetAudienceGender, TargetAudienceAge, IncomeLevel, IdolPlatform } from '../types';
import { View } from '../App';
import { useLanguage } from '../context/LanguageContext';
import { TranslationKey } from '../localization';
import { TARGET_AUDIENCE_AGES, TARGET_AUDIENCE_GENDERS } from '../constants';

const INCOME_LEVELS: { id: IncomeLevel; name: string }[] = [
    { id: 'Low', name: 'Thấp' },
    { id: 'Medium', name: 'Trung cấp' },
    { id: 'High', name: 'Cao' },
    { id: 'Affluent', name: 'Thượng lưu' },
];

const ARCHETYPES: { id: string; name: string }[] = [
    { id: 'Người Bình thường', name: 'Người Bình thường' },
    { id: 'Người Hùng', name: 'Người Hùng' },
    { id: 'Người Tình', name: 'Người Tình' },
    { id: 'Người Khai Phá', name: 'Người Khai Phá' },
];

const PLATFORMS: { id: IdolPlatform; name: string }[] = [
    { id: 'TikTok', name: 'TikTok' },
    { id: 'Facebook', name: 'Facebook' },
    { id: 'YouTube', name: 'YouTube' },
    { id: 'Instagram', name: 'Instagram' },
];


const AssetLibraryGrid: React.FC<{
    titleKey: TranslationKey;
    assets: UploadedFile[];
    onAdd: (file: UploadedFile) => void;
    onDelete: (fileName: string) => void;
}> = ({ titleKey, assets, onAdd, onDelete }) => {
    const { t } = useLanguage();
    const title = t(titleKey);
    // FIX: Add missing translation key and logic
    const singularTitleKey = (titleKey.endsWith('s_title') ? titleKey.replace('s_title', '_label') : `add_new_${titleKey.replace('_title', '')}`) as TranslationKey;
    const singularTitle = t(singularTitleKey);
    
    return (
        <div>
            <h3 className="text-lg font-semibold text-brand-cyan mb-3">{title}</h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {assets.map(asset => (
                    <div key={asset.name} className="relative group aspect-square">
                        <img src={asset.url} alt={asset.name} className="w-full h-full object-cover rounded-lg border border-dark-border"/>
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                            <button onClick={() => onDelete(asset.name)} className="text-white bg-brand-coral hover:bg-brand-coral/80 rounded-full p-2" aria-label={`${t('delete')} ${asset.name}`}>
                               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                            </button>
                        </div>
                    </div>
                ))}
                <div className="aspect-square">
                    <FileUpload label={`${t('add')} ${singularTitle}`} onFileSelect={(file) => file && onAdd(file)} value={null} />
                </div>
            </div>
            {/* FIX: Use translation key for 'no assets' prompt. */}
             {assets.length === 0 && <p className="text-center text-sm text-dark-text-secondary py-4 col-span-full">{t('no_assets_of_type_prompt').replace('{type}', singularTitle.toLowerCase())}</p>}
        </div>
    );
};


const ProductEditor: React.FC<{
    product: Product;
    onUpdate: (updatedProduct: Product) => void;
    onDelete: () => void;
}> = ({ product, onUpdate, onDelete }) => {
    const { t } = useLanguage();
    const handleProductChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (name === 'benefits') {
            onUpdate({ ...product, benefits: value.split(',').map(s => s.trim()) });
        } else {
            onUpdate({ ...product, [name]: value });
        }
    };

    return (
        <details className="bg-dark-bg border border-dark-border rounded-xl" open>
            <summary className="p-3 cursor-pointer font-semibold text-dark-text flex justify-between items-center">
                {/* FIX: Add missing translation key */}
                {product.product_short || t('new_product_placeholder')}
                <button onClick={(e) => { e.preventDefault(); onDelete(); }} className="text-xs text-brand-coral hover:text-brand-coral/80 font-semibold p-1">{t('delete')}</button>
            </summary>
            <div className="p-4 border-t border-dark-border space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor={`product_name-${product.id}`} className="block text-sm font-medium text-dark-text-secondary mb-1">{t('product_full_name_label')}</label>
                        <input type="text" id={`product_name-${product.id}`} name="product_name" value={product.product_name} onChange={handleProductChange} className="w-full bg-dark-bg border border-dark-border rounded-lg py-2 px-3"/>
                    </div>
                     <div>
                        <label htmlFor={`product_short-${product.id}`} className="block text-sm font-medium text-dark-text-secondary mb-1">{t('product_short_name_label')}</label>
                        <input type="text" id={`product_short-${product.id}`} name="product_short" value={product.product_short} onChange={handleProductChange} className="w-full bg-dark-bg border border-dark-border rounded-lg py-2 px-3"/>
                    </div>
                     <div>
                         <label htmlFor={`sku-${product.id}`} className="block text-sm font-medium text-dark-text-secondary mb-1">{t('product_sku_label')}</label>
                         <input type="text" name="sku" id={`sku-${product.id}`} value={product.sku} readOnly className="w-full bg-dark-border text-dark-text-secondary/70 rounded-lg py-2 px-3 cursor-not-allowed"/>
                    </div>
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FileUpload
                        label={t('product_image_label')}
                        value={product.productImage}
                        onFileSelect={(file) => onUpdate({ ...product, productImage: file })}
                    />
                    <FileUpload
                        label={t('product_info_file_label')}
                        value={product.productInfoFile}
                        onFileSelect={(file) => onUpdate({ ...product, productInfoFile: file })}
                        acceptedTypes="image/*,application/pdf,text/plain,application/zip,.pdf,.txt,.zip"
                    />
                </div>
                <div>
                     <label htmlFor={`notes-${product.id}`} className="block text-sm font-medium text-dark-text-secondary mb-1">{t('brand_tone_notes_label')}</label>
                     <textarea id={`notes-${product.id}`} name="notes" value={product.notes} onChange={handleProductChange} rows={3} className="w-full bg-dark-bg border border-dark-border rounded-lg py-2 px-3"/>
                </div>
            </div>
        </details>
    );
};


const BrandProfileEditor: React.FC<{ profile: BrandProfile, onSave: (profile: BrandProfile) => void }> = ({ profile, onSave }) => {
    const [editedProfile, setEditedProfile] = useState<BrandProfile>(profile);
    const [newColor, setNewColor] = useState('#22D3EE');
    const { t } = useLanguage();

    useEffect(() => {
        setEditedProfile(profile);
    }, [profile]);

    const handleUpdate = <K extends keyof BrandProfile>(key: K, value: BrandProfile[K]) => {
        setEditedProfile(prev => ({ ...prev, [key]: value }));
    };

    const addColor = () => {
        if (newColor && !editedProfile.colors.includes(newColor)) {
            handleUpdate('colors', [...editedProfile.colors, newColor]);
        }
    };

    const removeColor = (colorToRemove: string) => {
        handleUpdate('colors', editedProfile.colors.filter(c => c !== colorToRemove));
    };
    
    const handleAddProduct = () => {
        const newProduct: Product = {
            id: crypto.randomUUID(),
            sku: `${(editedProfile.name || 'BRAND').substring(0,5).toUpperCase()}-PRD-${String(editedProfile.products.length + 1).padStart(3, '0')}`,
            product_name: 'New Product Name',
            product_short: 'New Product',
            benefits: [],
            tech_specs: '',
            usp: '',
            productImage: null,
            productInfoFile: null,
            notes: ''
        };
        setEditedProfile(prev => ({...prev, products: [...prev.products, newProduct]}));
    };

    const handleUpdateProduct = (index: number, updatedProduct: Product) => {
        const newProducts = [...editedProfile.products];
        newProducts[index] = updatedProduct;
        handleUpdate('products', newProducts);
    };

    const handleDeleteProduct = (id: string) => {
        handleUpdate('products', editedProfile.products.filter(p => p.id !== id));
    };

    const handleAddAsset = (assetType: 'outfits') => (file: UploadedFile) => {
        handleUpdate(assetType, [...editedProfile[assetType], file]);
    };

    const handleDeleteAsset = (assetType: 'outfits') => (fileName: string) => {
        handleUpdate(assetType, editedProfile[assetType].filter(asset => asset.name !== fileName));
    };

    return (
        <div className="p-6 space-y-6">
            <div>
                <label htmlFor="brand-name" className="block text-sm font-medium text-dark-text-secondary mb-1">{t('brand_name_label')}</label>
                <input type="text" id="brand-name" value={editedProfile.name} onChange={(e) => handleUpdate('name', e.target.value)} className="w-full bg-dark-bg border border-dark-border rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-cyan focus:border-brand-cyan" />
            </div>
             <div>
                <label className="block text-sm font-medium text-dark-text-secondary mb-1">{t('brand_colors_label')}</label>
                <div className="flex flex-wrap gap-3 items-center">
                    {editedProfile.colors.map(color => (
                        <div key={color} className="relative group">
                            <div className="w-10 h-10 rounded-full border-2 border-dark-border" style={{ backgroundColor: color }} />
                            <button onClick={() => removeColor(color)} className="absolute -top-1 -right-1 bg-brand-coral text-white rounded-full h-5 w-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                                &times;
                            </button>
                        </div>
                    ))}
                    <div className="flex items-center gap-2 p-1 border border-dashed border-dark-border rounded-lg">
                        <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)} className="w-8 h-8 rounded-lg bg-dark-bg border-none cursor-pointer" />
                        <button onClick={addColor} className="px-3 py-1 bg-brand-cyan text-white text-sm rounded-lg hover:bg-brand-cyan/90 transition-colors">{t('add')}</button>
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FileUpload label={t('brand_logo_label')} value={editedProfile.logo} onFileSelect={(file) => handleUpdate('logo', file)} />
                <FileUpload label={t('brand_guideline_label')} value={editedProfile.guidelineFile} acceptedTypes="image/*,application/pdf,text/plain,application/zip,.pdf,.txt,.zip" onFileSelect={(file) => handleUpdate('guidelineFile', file)} />
            </div>

            <div className="border-t border-dark-border pt-6">
                <AssetLibraryGrid titleKey="outfits_title" assets={editedProfile.outfits} onAdd={handleAddAsset('outfits')} onDelete={handleDeleteAsset('outfits')} />
            </div>
            
            <div className="border-t border-dark-border pt-6">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-semibold text-brand-cyan">{t('product_details_title')}</h3>
                    <button onClick={handleAddProduct} className="text-sm font-semibold bg-brand-cyan text-white px-3 py-1 rounded-lg hover:bg-brand-cyan/90 transition-colors">
                        {t('add_product')}
                    </button>
                </div>
                <div className="space-y-4">
                    {editedProfile.products.length > 0 ? (
                        editedProfile.products.map((product, index) => (
                            <ProductEditor
                                key={product.id}
                                product={product}
                                onUpdate={(updated) => handleUpdateProduct(index, updated)}
                                onDelete={() => handleDeleteProduct(product.id)}
                            />
                        ))
                    ) : (
                        <p className="text-center text-dark-text-secondary py-4">{t('no_products_prompt')}</p>
                    )}
                </div>
            </div>

            <button onClick={() => onSave(editedProfile)} className="w-full py-2 px-4 bg-brand-green text-white font-semibold rounded-lg hover:bg-brand-green/90 transition-colors">
                {t('save')}
            </button>
        </div>
    );
};

const CharacterEditor: React.FC<{
  character: VirtualIdol;
  onUpdate: (updatedCharacter: VirtualIdol) => void;
  onSave: () => void;
}> = ({ character, onUpdate, onSave }) => {
    const { t } = useLanguage();
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        onUpdate({ ...character, [e.target.name]: e.target.value });
    };
    
    const handleSelectChange = (name: keyof VirtualIdol, value: any) => {
        onUpdate({ ...character, [name]: value });
    };

    const handleCheckboxChange = (platform: IdolPlatform) => {
        const newPlatforms = character.platforms.includes(platform)
            ? character.platforms.filter(p => p !== platform)
            : [...character.platforms, platform];
        onUpdate({ ...character, platforms: newPlatforms });
    };

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-bold text-white">Chỉnh sửa Nhân vật <span className="text-brand-cyan">{character.name}</span></h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                    <FileUpload label="Ảnh đại diện" value={character.avatar} onFileSelect={file => onUpdate({ ...character, avatar: file })} />
                </div>
                <div className="md:col-span-2 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-dark-text-secondary mb-1">Tên Nhân vật</label>
                        <input type="text" name="name" value={character.name} onChange={handleInputChange} className="w-full bg-dark-bg border border-dark-border rounded-lg py-2 px-3"/>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-dark-text-secondary mb-1">Tên định danh / @username</label>
                        <input type="text" name="username" value={character.username} onChange={handleInputChange} className="w-full bg-dark-bg border border-dark-border rounded-lg py-2 px-3"/>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="block text-sm font-medium text-dark-text-secondary mb-1">Giới tính</label>
                    <select value={character.gender} onChange={e => handleSelectChange('gender', e.target.value)} className="w-full bg-dark-bg border border-dark-border rounded-lg py-2 px-3">
                       {TARGET_AUDIENCE_GENDERS.map(g => <option key={g.id} value={g.id}>{t(g.nameKey)}</option>)}
                    </select>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-dark-text-secondary mb-1">Độ tuổi</label>
                    <select value={character.ageRange} onChange={e => handleSelectChange('ageRange', e.target.value)} className="w-full bg-dark-bg border border-dark-border rounded-lg py-2 px-3">
                       {TARGET_AUDIENCE_AGES.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-dark-text-secondary mb-1">Mức thu nhập</label>
                    <select value={character.incomeLevel} onChange={e => handleSelectChange('incomeLevel', e.target.value)} className="w-full bg-dark-bg border border-dark-border rounded-lg py-2 px-3">
                       {INCOME_LEVELS.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                    </select>
                </div>
            </div>
            
            <div>
                <label className="block text-sm font-medium text-dark-text-secondary mb-1">Hình mẫu</label>
                <select value={character.archetype} onChange={e => handleSelectChange('archetype', e.target.value)} className="w-full bg-dark-bg border border-dark-border rounded-lg py-2 px-3">
                    {ARCHETYPES.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
            </div>
            
             <div>
                <label className="block text-sm font-medium text-dark-text-secondary mb-1">Nền tảng</label>
                <div className="flex flex-wrap gap-4 bg-dark-bg border border-dark-border rounded-lg p-3">
                    {PLATFORMS.map(p => (
                        <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={character.platforms.includes(p.id)} onChange={() => handleCheckboxChange(p.id)} className="form-checkbox h-4 w-4 rounded bg-dark-card border-dark-border text-brand-cyan focus:ring-brand-cyan"/>
                            <span className="text-sm">{p.name}</span>
                        </label>
                    ))}
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-dark-text-secondary mb-1">Tông giọng & Tiếng nói</label>
                <textarea name="toneOfVoice" value={character.toneOfVoice} onChange={handleInputChange} rows={3} className="w-full bg-dark-bg border border-dark-border rounded-lg py-2 px-3" placeholder="Friendly, authentic, and helpful."/>
            </div>
            <div>
                <label className="block text-sm font-medium text-dark-text-secondary mb-1">Thị trường ngách (cách nhau bằng dấu phẩy)</label>
                <textarea name="nicheMarkets" value={character.nicheMarkets} onChange={handleInputChange} rows={2} className="w-full bg-dark-bg border border-dark-border rounded-lg py-2 px-3" placeholder="lifestyle, e-commerce"/>
            </div>
             <div>
                <label className="block text-sm font-medium text-dark-text-secondary mb-1">Trụ cột Nội dung (cách nhau bằng dấu phẩy)</label>
                <textarea name="contentPillars" value={character.contentPillars} onChange={handleInputChange} rows={2} className="w-full bg-dark-bg border border-dark-border rounded-lg py-2 px-3" placeholder="product reviews, tutorials"/>
            </div>
             <div>
                <label className="block text-sm font-medium text-dark-text-secondary mb-1">USP (Điểm bán hàng độc nhất)</label>
                <textarea name="usp" value={character.usp} onChange={handleInputChange} rows={3} className="w-full bg-dark-bg border border-dark-border rounded-lg py-2 px-3"/>
            </div>
            <button onClick={onSave} className="w-full py-3 px-4 bg-brand-green text-white font-semibold rounded-lg hover:bg-brand-green/90 transition-colors">
                Lưu Nhân vật
            </button>
        </div>
    );
};

const CharacterManager: React.FC<{
  profile: BrandProfile;
  onSaveProfile: (updatedProfile: BrandProfile) => void;
}> = ({ profile, onSaveProfile }) => {
    const [characters, setCharacters] = useState<VirtualIdol[]>(profile.virtualIdols || []);
    const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);

    useEffect(() => {
        setCharacters(profile.virtualIdols || []);
        if (!selectedCharacterId && profile.virtualIdols?.length > 0) {
            const activeIdol = profile.virtualIdols.find(v => v.isActive);
            setSelectedCharacterId(activeIdol ? activeIdol.id : profile.virtualIdols[0].id);
        } else if (profile.virtualIdols?.length === 0) {
            setSelectedCharacterId(null);
        }
    }, [profile]);

    const handleUpdateCharacter = (updatedCharacter: VirtualIdol) => {
        setCharacters(chars => chars.map(c => c.id === updatedCharacter.id ? updatedCharacter : c));
    };

    const handleSave = () => {
        onSaveProfile({ ...profile, virtualIdols: characters });
    };
    
    const handleAddNewCharacter = () => {
        const newCharacter: VirtualIdol = {
            id: crypto.randomUUID(),
            name: `Creator ${characters.length + 1}`,
            username: `@creator${characters.length + 1}`,
            avatar: null,
            gender: 'Any',
            ageRange: '25-34',
            incomeLevel: 'Medium',
            archetype: 'Người Bình thường',
            platforms: [],
            toneOfVoice: 'Friendly, authentic, and helpful.',
            nicheMarkets: 'lifestyle, e-commerce',
            contentPillars: 'product reviews, tutorials',
            usp: '',
            isActive: false,
        };
        const newCharacters = [...characters, newCharacter];
        setCharacters(newCharacters);
        setSelectedCharacterId(newCharacter.id);
        onSaveProfile({ ...profile, virtualIdols: newCharacters });
    };
    
    const handleDeleteCharacter = (id: string) => {
        if (!window.confirm("Are you sure you want to delete this character?")) return;
        const newCharacters = characters.filter(c => c.id !== id);
        onSaveProfile({ ...profile, virtualIdols: newCharacters });
    };

    const setActiveCharacter = (id: string) => {
        const newCharacters = characters.map(c => ({...c, isActive: c.id === id}));
        setCharacters(newCharacters);
        onSaveProfile({ ...profile, virtualIdols: newCharacters });
    };
    
    const selectedCharacter = characters.find(c => c.id === selectedCharacterId);

    return (
        <div className="p-6 flex flex-col md:flex-row gap-8">
            <div className="md:w-1/3 flex-shrink-0">
                <h3 className="font-semibold mb-3 text-dark-text">Nhân vật của bạn</h3>
                <div className="space-y-2">
                    {characters.map(char => (
                        <div key={char.id} onClick={() => setSelectedCharacterId(char.id)} className={`p-3 rounded-lg cursor-pointer transition-colors flex justify-between items-center ${selectedCharacterId === char.id ? 'bg-brand-cyan/20 ring-2 ring-brand-cyan' : 'hover:bg-dark-border'}`}>
                            <div>
                                <p className="font-semibold text-dark-text">{char.name}</p>
                                {char.isActive && <span className="text-xs text-brand-green font-bold">Hoạt động</span>}
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteCharacter(char.id) }} className="text-xs p-1 text-dark-text-secondary hover:text-brand-coral">Xóa</button>
                        </div>
                    ))}
                </div>
                 <button onClick={handleAddNewCharacter} className="w-full mt-4 py-2 border-2 border-dashed border-dark-border text-dark-text-secondary rounded-lg hover:border-brand-cyan hover:text-brand-cyan transition-colors">
                    + Tạo Nhân vật mới
                </button>
            </div>
            <div className="md:w-2/3 flex-grow">
                {selectedCharacter ? (
                    <>
                    <div className="flex justify-end mb-4">
                        <button onClick={() => setActiveCharacter(selectedCharacter.id)} disabled={selectedCharacter.isActive} className="px-4 py-2 bg-slate-600 text-white font-semibold rounded-lg hover:bg-slate-500 disabled:bg-brand-green disabled:cursor-not-allowed transition-colors text-sm">
                            {selectedCharacter.isActive ? 'Đang hoạt động' : 'Đặt làm hoạt động'}
                        </button>
                    </div>
                    <CharacterEditor character={selectedCharacter} onUpdate={handleUpdateCharacter} onSave={handleSave} />
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center text-dark-text-secondary p-8">
                        <p>Tạo hoặc chọn một nhân vật để bắt đầu chỉnh sửa.</p>
                    </div>
                )}
            </div>
        </div>
    );
};


export const AssetsView: React.FC<{setActiveView: (view: View) => void}> = ({ setActiveView }) => {
  const { profiles, activeProfile, setActiveProfileId, addProfile, deleteProfile, updateProfile } = useBrand();
  const { t } = useLanguage();
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(activeProfile?.id || (profiles.length > 0 ? profiles[0].id : null));
  const [activeTab, setActiveTab] = useState<'brand' | 'character'>('character');


  useEffect(() => {
      if (!selectedProfileId && profiles.length > 0) {
          setSelectedProfileId(profiles[0].id);
      }
  }, [profiles, selectedProfileId]);

  const handleAddNewBrand = () => {
    // FIX: Add missing translation key
    const newBrandName = `${t('new_brand_placeholder')} ${profiles.length + 1}`;
    addProfile(newBrandName);
  };
  
  const selectedProfile = profiles.find(p => p.id === selectedProfileId);

  const handleSetActive = () => {
    if(selectedProfileId) {
        setActiveProfileId(selectedProfileId);
        setActiveView('creatives');
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
            {/* FIX: Add missing translation key */}
            <h2 className="font-display text-4xl font-bold text-dark-text">{t('assets_title')}</h2>
            <p className="text-dark-text-secondary mt-1">{t('assets_subtitle')}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1 bg-dark-card border border-dark-border rounded-2xl p-4 h-fit">
                <h3 className="font-semibold mb-3">{t('your_brands')}</h3>
                <div className="space-y-2">
                    {profiles.map(profile => (
                        <div key={profile.id} onClick={() => setSelectedProfileId(profile.id)} className={`p-3 rounded-lg cursor-pointer transition-colors flex justify-between items-center ${selectedProfileId === profile.id ? 'bg-brand-cyan/20 ring-2 ring-brand-cyan' : 'hover:bg-dark-border'}`}>
                           <div>
                             <p className="font-semibold text-dark-text">{profile.name}</p>
                             {/* FIX: Add missing translation key */}
                             {profile.id === activeProfile?.id && <span className="text-xs text-brand-green font-bold">{t('active_status')}</span>}
                           </div>
                           <button onClick={(e) => { e.stopPropagation(); deleteProfile(profile.id); }} className="text-dark-text-secondary hover:text-brand-coral text-xs p-1">{t('delete')}</button>
                        </div>
                    ))}
                </div>
                <button onClick={handleAddNewBrand} className="w-full mt-4 py-2 border-2 border-dashed border-dark-border text-dark-text-secondary rounded-lg hover:border-brand-cyan hover:text-brand-cyan transition-colors">
                    {t('create_new_brand')}
                </button>
            </div>

            <div className="md:col-span-2 bg-dark-card border border-dark-border rounded-2xl">
                {selectedProfile ? (
                    <div>
                        <div className="p-4 border-b border-dark-border flex justify-between items-center">
                            <div className="flex p-1 bg-dark-bg rounded-xl border border-dark-border w-fit">
                                <button onClick={() => setActiveTab('brand')} className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'brand' ? 'bg-slate-600 text-white' : 'text-dark-text-secondary hover:bg-dark-card'}`}>
                                  Thương hiệu
                                </button>
                                <button onClick={() => setActiveTab('character')} className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'character' ? 'bg-violet-600 text-white' : 'text-dark-text-secondary hover:bg-dark-card'}`}>
                                  Nhân vật
                                </button>
                            </div>
                            <button onClick={handleSetActive} disabled={activeProfile?.id === selectedProfileId} className="px-4 py-2 bg-brand-cyan text-white font-semibold rounded-lg hover:bg-brand-cyan/90 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors">
                                {activeProfile?.id === selectedProfileId ? t('currently_active') : t('set_active_and_create')}
                            </button>
                        </div>
                        {activeTab === 'brand' && <BrandProfileEditor profile={selectedProfile} onSave={updateProfile} />}
                        {activeTab === 'character' && <CharacterManager profile={selectedProfile} onSaveProfile={updateProfile} />}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full p-10 text-center">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-dark-text-secondary/60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                        <h3 className="mt-4 text-lg font-semibold">{t('no_brand_selected_title')}</h3>
                        <p className="text-dark-text-secondary">{t('no_brand_selected_prompt')}</p>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};