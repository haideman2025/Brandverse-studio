import React from 'react';
import { UploadedFile } from '../types';

export interface AdPreviewProps {
    baseImage: UploadedFile | null;
    headline: string;
    body: string;
    cta: string;
    fontFamily: string;
    brandName: string;
    brandLogoUrl?: string | null;
}

// --- SHARED & GENERIC COMPONENTS ---
const Avatar: React.FC<{ url?: string | null, name: string, size?: string }> = ({ url, name, size = 'w-10 h-10' }) => (
    <img src={url || `https://ui-avatars.com/api/?name=${name.charAt(0)}&background=random`} alt="logo" className={`${size} rounded-full bg-gray-200 object-cover border border-gray-300`} />
);

const PlaceholderImage: React.FC<{text: string}> = ({text}) => (
    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
        <span className="text-gray-500 text-xs text-center">{text}</span>
    </div>
);

const MediaDisplay: React.FC<{asset: UploadedFile | null, altText: string}> = ({ asset, altText }) => {
    if (!asset?.url) return <PlaceholderImage text={altText} />;
    
    if (asset.type?.startsWith('video/')) {
        return <video src={asset.url} muted loop autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />;
    }
    
    return <img src={asset.url} className="absolute inset-0 w-full h-full object-cover" />;
};


// --- FACEBOOK PREVIEWS ---

const FacebookFeedPreview: React.FC<AdPreviewProps> = ({ baseImage, headline, body, cta, fontFamily, brandName, brandLogoUrl }) => (
    <div className="w-full max-w-sm bg-white text-black rounded-lg shadow-lg overflow-hidden border border-gray-300">
        <div className="p-3 flex items-center gap-3">
            <Avatar url={brandLogoUrl} name={brandName} />
            <div>
                <p className="font-bold text-sm" style={{ fontFamily }}>{brandName}</p>
                <p className="text-xs text-gray-500">Sponsored · <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 inline-block" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 014 0v.414a1 1 0 01-1.414 1.414l-2.12-2.12a1 1 0 00-1.415 0l-.364.364a1 1 0 01-1.414 0l-2.475-2.475a1 1 0 00-1.414 0l-2.733 2.733a1 1 0 01-1.414 0l-2.121-2.121a1 1 0 00-1.414 0l-1.18 1.18A6.035 6.035 0 014.332 8.027z" clipRule="evenodd" /></svg></p>
            </div>
        </div>
        <div className="px-3 pb-2 text-sm" style={{ fontFamily }}>
            <p className="line-clamp-3">{body || "Your compelling body text goes here, explaining the value."}</p>
        </div>
        <div className="relative w-full aspect-square bg-gray-200">
           <MediaDisplay asset={baseImage} altText="1:1 Media" />
        </div>
        <div className="p-2 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
             <div className="pl-1">
                 <p className="text-xs font-semibold uppercase text-gray-600">{brandName}.com</p>
                 <p className="text-sm font-bold mt-0" style={{ fontFamily }}>{headline || "Your Captivating Headline"}</p>
             </div>
             <button className="bg-gray-200 text-gray-800 font-bold text-sm px-5 py-2 rounded-md whitespace-nowrap" style={{ fontFamily }}>{cta || 'Learn More'}</button>
        </div>
    </div>
);

const InstagramStoryPreview: React.FC<AdPreviewProps> = ({ baseImage, headline, body, cta, fontFamily, brandName, brandLogoUrl }) => (
    <div className="w-[250px] aspect-[9/16] bg-black border-4 border-black rounded-2xl shadow-2xl overflow-hidden relative flex flex-col">
        <div className="absolute top-2 left-0 right-0 px-2 flex gap-1 z-20">
            <div className="w-full h-0.5 bg-white/50 rounded-full"><div className="h-full w-1/2 bg-white"></div></div>
            <div className="w-full h-0.5 bg-white/50 rounded-full"></div>
        </div>
        <div className="absolute top-4 left-0 right-0 p-3 flex items-center z-10">
            <img src={brandLogoUrl || `https://ui-avatars.com/api/?name=${brandName.charAt(0)}&background=random`} alt="logo" className="w-8 h-8 rounded-full border-2 border-white object-cover" />
            <div className="ml-2">
                 <p className="font-semibold text-xs text-white" style={{ fontFamily: 'sans-serif', textShadow: '1px 1px 2px black' }}>{brandName}</p>
                 <p className="text-xs text-white/80" style={{ fontFamily: 'sans-serif', textShadow: '1px 1px 2px black' }}>Sponsored</p>
            </div>
        </div>
         <div className="relative flex-grow w-full h-full bg-gray-800">
           <MediaDisplay asset={baseImage} altText="9:16 Media" />
           <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30"></div>
        </div>
        <div className="absolute inset-x-0 bottom-16 z-10 px-4 text-white text-center flex flex-col items-center justify-center">
             <h1 className="text-xl font-bold" style={{...{fontFamily}, textShadow: '2px 2px 4px black'}}>{headline}</h1>
             <p className="text-sm mt-1" style={{...{fontFamily}, textShadow: '2px 2px 4px black'}}>{body}</p>
        </div>
        <div className="absolute bottom-4 left-4 right-4 z-10">
            <button className="bg-white/90 text-black font-bold text-sm py-2.5 px-6 rounded-lg w-full backdrop-blur-sm" style={{ fontFamily }}>{cta || 'Shop Now'}</button>
        </div>
    </div>
);

const FacebookMarketplacePreview: React.FC<AdPreviewProps> = ({ baseImage, headline, cta, fontFamily, brandName }) => (
     <div className="w-full max-w-sm">
        <p className="text-sm text-center mb-2 text-dark-text-secondary">Preview in Marketplace</p>
        <div className="grid grid-cols-2 gap-2 p-2 bg-gray-100 rounded-lg">
            {[1,2,3].map(i => (
                <div key={i} className="bg-white rounded-md shadow">
                    <div className="aspect-square bg-gray-300 rounded-t-md"><img src={`https://picsum.photos/seed/mp${i}/200`} className="w-full h-full object-cover rounded-t-md"/></div>
                    <div className="p-1.5 text-xs text-black">
                        <p className="font-bold">₫150.000</p>
                        <p className="line-clamp-2">Authentic Men's Polo Shirt</p>
                        <p className="text-gray-500 text-[10px] mt-0.5">Hanoi</p>
                    </div>
                </div>
            ))}
             <div className="bg-white rounded-md shadow border-2 border-blue-500 relative">
                <div className="absolute top-1 left-1 text-[10px] text-gray-600 font-semibold z-10">Sponsored</div>
                <div className="aspect-square bg-gray-200 rounded-t-md relative overflow-hidden">
                    <MediaDisplay asset={baseImage} altText="1:1 Media" />
                </div>
                <div className="p-1.5 text-xs text-black">
                    <p className="font-bold" style={{ fontFamily }}>{cta || "₫199.000"}</p>
                    <p className="line-clamp-2 font-semibold" style={{ fontFamily }}>{headline || "Your Product Name"}</p>
                    <p className="text-gray-500 text-[10px] mt-0.5">{brandName}</p>
                </div>
            </div>
        </div>
    </div>
);

const FacebookRightColumnPreview: React.FC<AdPreviewProps> = ({ baseImage, headline, body, fontFamily, brandName }) => (
    <div className="w-[280px] bg-white text-black p-3 rounded-lg border border-gray-300 shadow-lg">
        <p className="text-xs text-gray-500 mb-2">Sponsored</p>
        <div className="flex gap-2">
            <div className="w-2/5 flex-shrink-0 aspect-square bg-gray-200 rounded-md relative overflow-hidden">
                <MediaDisplay asset={baseImage} altText="1:1 Media"/>
            </div>
            <div className="flex-1">
                 <p className="font-semibold text-sm line-clamp-2" style={{ fontFamily }}>{headline || "Your Captivating Headline"}</p>
                 <p className="text-xs text-gray-500 line-clamp-1">{brandName}.com</p>
                 <p className="text-xs text-gray-700 mt-1 line-clamp-2" style={{ fontFamily }}>{body || "Brief and enticing description of your product."}</p>
            </div>
        </div>
    </div>
);

const FacebookVideoFeedPreview: React.FC<AdPreviewProps> = ({ baseImage, headline, cta, fontFamily, brandName, brandLogoUrl }) => (
    <div className="w-full max-w-sm bg-white text-black rounded-lg shadow-lg overflow-hidden border border-gray-300">
        <div className="p-3 flex items-center gap-3">
            <Avatar url={brandLogoUrl} name={brandName} />
            <div>
                <p className="font-bold text-sm" style={{ fontFamily }}>{brandName}</p>
                <p className="text-xs text-gray-500">Sponsored · <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 inline-block" fill="currentColor" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M6.271 5.055a.5.5 0 0 1 .52.038l3.5 2.5a.5.5 0 0 1 0 .814l-3.5 2.5A.5.5 0 0 1 6 10.5v-5a.5.5 0 0 1 .271-.445z"/></svg></p>
            </div>
        </div>
        <div className="px-3 pb-2 text-sm" style={{ fontFamily }}>
            <p className="line-clamp-2">{headline || "Your Captivating Video Headline"}</p>
        </div>
        <div className="relative w-full aspect-[4/5] bg-gray-800">
           <MediaDisplay asset={baseImage} altText="4:5 Media" />
           <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <div className="w-16 h-16 rounded-full bg-black/50 flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg>
                </div>
           </div>
        </div>
        <div className="p-2 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
             <p className="text-sm font-bold pl-1" style={{ fontFamily }}>{brandName}</p>
             <button className="bg-blue-500 text-white font-bold text-sm px-5 py-2 rounded-md whitespace-nowrap" style={{ fontFamily }}>{cta || 'Watch More'}</button>
        </div>
    </div>
);


// --- INSTAGRAM PREVIEWS ---

const InstagramExplorePreview: React.FC<AdPreviewProps> = ({ baseImage }) => (
    <div className="w-full max-w-sm">
        <p className="text-sm text-center mb-2 text-dark-text-secondary">Preview in Explore</p>
        <div className="grid grid-cols-3 gap-1 p-1 bg-gray-100 rounded-lg">
            {[1,2,3,5,6].map(i => (
                <div key={i} className={`bg-gray-300 aspect-square ${i === 3 ? 'col-span-2 row-span-2' : ''}`}>
                    <img src={`https://picsum.photos/seed/ig${i}/300`} className="w-full h-full object-cover"/>
                </div>
            ))}
             <div className="bg-gray-200 aspect-square relative overflow-hidden">
                <MediaDisplay asset={baseImage} altText="1:1 Media" />
                 <div className="absolute top-1 right-1">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M10.97 4.97a.235.235 0 0 0-.02.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05z"/></svg>
                 </div>
            </div>
        </div>
    </div>
);

const InstagramReelsPreview: React.FC<AdPreviewProps> = ({ baseImage, cta, fontFamily, brandName, brandLogoUrl, body }) => (
    <div className="w-[250px] aspect-[9/16] bg-black border-4 border-black rounded-2xl shadow-2xl overflow-hidden relative flex flex-col justify-end">
        <div className="absolute inset-0 w-full h-full bg-gray-800">
           <MediaDisplay asset={baseImage} altText="9:16 Media" />
           <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
        </div>
        <div className="absolute top-5 right-2 flex flex-col items-center gap-4 z-10">
            <div className="flex flex-col items-center gap-1 text-white"><svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" /></svg><span className="text-xs font-semibold">1.2M</span></div>
            <div className="flex flex-col items-center gap-1 text-white"><svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" /></svg><span className="text-xs font-semibold">86.4K</span></div>
            <div className="flex flex-col items-center gap-1 text-white"><svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" /></svg><span className="text-xs font-semibold">12.3K</span></div>
        </div>
        <div className="relative z-10 p-3 text-white space-y-2">
            <div className="flex items-center gap-2">
                <Avatar url={brandLogoUrl} name={brandName} size="w-8 h-8"/>
                <p className="font-bold text-sm" style={{fontFamily: 'sans-serif'}}>@{brandName.toLowerCase().replace(/\s/g, '_')}</p>
            </div>
            <p className="text-sm line-clamp-2" style={{ fontFamily }}>{body || "This is where your engaging reel caption goes."}</p>
             <div className="flex justify-between items-center border border-white/30 rounded-lg p-2 mt-2">
                <p className="font-semibold text-sm" style={{fontFamily}}>{cta || "Shop Now"}</p>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16"><path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/></svg>
            </div>
        </div>
    </div>
);


// --- TIKTOK PREVIEWS ---

const TiktokInFeedPreview: React.FC<AdPreviewProps> = ({ baseImage, body, cta, fontFamily, brandName, brandLogoUrl }) => (
    <div className="w-[250px] aspect-[9/16] bg-black border-4 border-black rounded-2xl shadow-2xl overflow-hidden relative flex flex-col justify-end">
         <div className="absolute inset-0 w-full h-full bg-gray-800">
           <MediaDisplay asset={baseImage} altText="9:16 Media" />
           <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
        </div>
        <div className="absolute top-5 right-2 flex flex-col items-center gap-4 z-10">
            <div className="flex flex-col items-center">
                 <img src={brandLogoUrl || `https://ui-avatars.com/api/?name=${brandName.charAt(0)}&background=random`} alt="logo" className="w-10 h-10 rounded-full border-2 border-white object-cover" />
                 <div className="w-5 h-5 -mt-2.5 rounded-full bg-red-500 flex items-center justify-center text-white text-xs font-bold">+</div>
            </div>
            <div className="flex flex-col items-center gap-1 text-white"><svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" /></svg><span className="text-xs font-semibold">1.2M</span></div>
            <div className="flex flex-col items-center gap-1 text-white"><svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" /></svg><span className="text-xs font-semibold">86.4K</span></div>
            <img src="https://static.vecteezy.com/system/resources/previews/010/160/997/original/tiktok-logo-icon-social-media-icon-free-png.png" className="w-10 h-10 rounded-full border-2 border-white animate-[spin_8s_linear_infinite]" />
        </div>
        <div className="relative z-10 p-3 text-white">
            <p className="font-bold text-sm" style={{fontFamily: 'sans-serif'}}>@{brandName.toLowerCase().replace(/\s/g, '_')}</p>
            <p className="text-sm mt-1 line-clamp-2" style={{ fontFamily }}>{body || "Your ad copy goes here, make it snappy!"} <span className="font-bold">#ad #{brandName.toLowerCase()}</span></p>
        </div>
        <div className="relative z-10 p-2 bg-gradient-to-t from-black/50">
            <button className="bg-white text-black font-bold text-sm py-2.5 px-6 rounded-md w-full" style={{ fontFamily }}>{cta || 'Shop Now'}</button>
        </div>
    </div>
);

const TiktokTopViewPreview: React.FC<AdPreviewProps> = ({ baseImage, cta, fontFamily, brandName, brandLogoUrl, body }) => (
    <div className="w-[250px] aspect-[9/16] bg-black border-4 border-black rounded-2xl shadow-2xl overflow-hidden relative flex flex-col justify-end">
        <div className="absolute inset-0 w-full h-full bg-gray-800">
           <MediaDisplay asset={baseImage} altText="9:16 Media" />
        </div>
         <div className="absolute top-4 right-4 text-white text-xs bg-black/50 px-2 py-1 rounded-full">Skip</div>
        <div className="relative z-10 p-4 text-white text-center bg-gradient-to-t from-black/80 via-black/40 to-transparent space-y-3">
             <Avatar url={brandLogoUrl} name={brandName} size="w-16 h-16 mx-auto" />
             <h2 className="text-xl font-bold" style={{fontFamily}}>{brandName}</h2>
            <p className="text-sm line-clamp-2" style={{ fontFamily }}>{body || "This is your engaging TopView ad copy."}</p>
            <button className="bg-red-500 text-white font-bold text-md py-3 px-8 rounded-md w-full" style={{ fontFamily }}>{cta || 'Shop Now'}</button>
        </div>
    </div>
);

// --- SHOPEE PREVIEWS ---
const ShopeeDiscoveryPreview: React.FC<AdPreviewProps> = ({ baseImage, headline, cta, fontFamily, brandName }) => (
    <div className="w-full max-w-sm">
        <p className="text-sm text-center mb-2 text-dark-text-secondary">Preview in Search Results</p>
        <div className="grid grid-cols-2 gap-2 p-2 bg-gray-100 rounded-lg">
            {[1,2,3].map(i => (
                <div key={i} className="bg-white rounded-md shadow">
                    <div className="aspect-square bg-gray-300 rounded-t-md"><img src={`https://picsum.photos/seed/shopee${i}/200`} className="w-full h-full object-cover rounded-t-md"/></div>
                    <div className="p-1.5 text-xs text-black">
                        <p className="line-clamp-2">Authentic Men's Polo Shirt</p>
                        <p className="font-bold text-orange-600 mt-1">₫150.000</p>
                    </div>
                </div>
            ))}
             <div className="bg-white rounded-md shadow border-2 border-orange-500 relative">
                <div className="absolute top-0 left-0 text-[10px] bg-orange-500 text-white font-bold px-1 py-0.5 z-10">Ad</div>
                <div className="aspect-square bg-gray-200 rounded-t-md relative overflow-hidden">
                    <MediaDisplay asset={baseImage} altText="1:1 Media" />
                </div>
                <div className="p-1.5 text-xs text-black">
                    <p className="line-clamp-2 font-semibold" style={{ fontFamily }}>{headline || "Your Product Name"}</p>
                    <p className="font-bold text-orange-600 mt-1" style={{ fontFamily }}>{cta || "₫199.000"}</p>
                    <p className="text-gray-500 text-[10px] mt-0.5">{brandName}</p>
                </div>
            </div>
        </div>
    </div>
);

const ShopeeHomepageBannerPreview: React.FC<AdPreviewProps> = ({ baseImage, headline }) => (
     <div className="w-full max-w-sm bg-gray-100 rounded-lg p-2">
        <p className="text-sm text-center mb-2 text-dark-text-secondary">Homepage Banner</p>
        <div className="aspect-[2/1] bg-gray-300 rounded-md overflow-hidden relative">
            <MediaDisplay asset={baseImage} altText={`2:1 Banner: ${headline}`} />
        </div>
     </div>
);

const ShopeeFlashSalePreview: React.FC<AdPreviewProps> = ({ baseImage, cta, fontFamily }) => (
    <div className="w-full max-w-sm">
        <p className="text-sm text-center mb-2 text-dark-text-secondary">Flash Sale Preview</p>
        <div className="bg-white p-2 rounded-lg">
             <div className="flex justify-between items-center text-orange-500 font-bold">
                <span className="text-lg">FLASH SALE</span>
                <span className="text-sm">ENDS IN 01:23:45</span>
             </div>
             <div className="grid grid-cols-3 gap-2 mt-2">
                {[1,2].map(i => (
                    <div key={i} className="bg-white rounded-md border">
                        <div className="aspect-square bg-gray-300 rounded-t-md"><img src={`https://picsum.photos/seed/fs${i}/200`} className="w-full h-full object-cover rounded-t-md"/></div>
                        <div className="p-1 text-center">
                            <p className="font-bold text-sm text-orange-600">₫150.000</p>
                            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1"><div className="bg-orange-500 h-2.5 rounded-full w-3/4"></div></div>
                        </div>
                    </div>
                ))}
                 <div className="bg-white rounded-md border-2 border-orange-500">
                    <div className="aspect-square bg-gray-200 rounded-t-md relative overflow-hidden">
                        <MediaDisplay asset={baseImage} altText="1:1 Media" />
                    </div>
                    <div className="p-1 text-center">
                        <p className="font-bold text-sm text-orange-600" style={{fontFamily}}>{cta || "₫199.000"}</p>
                         <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1"><div className="bg-orange-500 h-2.5 rounded-full w-1/2"></div></div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);


export const PLATFORM_PLACEMENTS = {
    Facebook: [
        { id: 'fb-feed', name: 'Feed Ad', component: FacebookFeedPreview },
        { id: 'fb-story', name: 'Story Ad', component: InstagramStoryPreview },
        { id: 'fb-marketplace', name: 'Marketplace Ad', component: FacebookMarketplacePreview },
        { id: 'fb-video', name: 'Video Feed Ad', component: FacebookVideoFeedPreview },
        { id: 'fb-right-column', name: 'Right Column (Desktop)', component: FacebookRightColumnPreview },
    ],
    Instagram: [
        { id: 'ig-story', name: 'Story Ad', component: InstagramStoryPreview },
        { id: 'ig-feed', name: 'Feed Ad', component: FacebookFeedPreview },
        { id: 'ig-reels', name: 'Reels Ad', component: InstagramReelsPreview },
        { id: 'ig-explore', name: 'Explore Ad', component: InstagramExplorePreview },
        { id: 'ig-video', name: 'Video Ad', component: FacebookVideoFeedPreview },
    ],
    TikTok: [
        { id: 'tt-infeed', name: 'In-Feed Ad', component: TiktokInFeedPreview },
        { id: 'tt-topview', name: 'TopView Ad', component: TiktokTopViewPreview },
    ],
    Shopee: [
        { id: 'shopee-discovery', name: 'Discovery Ad', component: ShopeeDiscoveryPreview },
        { id: 'shopee-banner', name: 'Homepage Banner', component: ShopeeHomepageBannerPreview },
        { id: 'shopee-flash-sale', name: 'Flash Sale', component: ShopeeFlashSalePreview },
    ]
};