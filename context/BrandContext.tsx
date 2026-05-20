

import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo } from 'react';
import { BrandProfile, UploadedFile, Product, VirtualIdol } from '../types';
import { INITIAL_BRAND_PROFILES } from '../constants';
import { saveBrandProfileDB, getBrandProfilesDB, deleteBrandProfileDB, getUserPrefDB, setUserPrefDB } from '../services/dbService';


interface BrandContextType {
  profiles: BrandProfile[];
  activeProfile: BrandProfile | null;
  setActiveProfileId: (id: string | null) => void;
  addProfile: (name: string) => Promise<void>;
  updateProfile: (profile: BrandProfile) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;
}

const BrandContext = createContext<BrandContextType | undefined>(undefined);

const getProfilesKey = (user: string) => `imageforge_brand_profiles_${user}`;
const getActiveIdKey = (user: string) => `imageforge_active_profile_id_${user}`;

export const BrandProvider: React.FC<{ children: ReactNode, user: string | null }> = ({ children, user }) => {
  const [profiles, setProfiles] = useState<BrandProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);

  // Load data when user changes
  useEffect(() => {
    if (!user) {
      setProfiles([]);
      setActiveProfileId(null);
      return;
    }
    
    const loadData = async () => {
        try {
            let userProfiles = await getBrandProfilesDB(user);
            
            // Check for migration from localStorage
            const storedProfilesJSON = localStorage.getItem(getProfilesKey(user));
            if (userProfiles.length === 0 && storedProfilesJSON) {
                console.log("Migrating brand profiles from localStorage to IndexedDB...");
                const parsedProfiles = JSON.parse(storedProfilesJSON);

                const base64ToUploadedFile = (fileData: any): UploadedFile | null => {
                    if (!fileData || !fileData.base64) return null;
                    return {
                        name: fileData.name,
                        type: fileData.type,
                        base64: fileData.base64,
                    } as UploadedFile;
                };

                const profilesToMigrate: BrandProfile[] = parsedProfiles.map((p: any) => ({
                    ...p,
                    userId: user,
                    logo: base64ToUploadedFile(p.logo),
                    guidelineFile: base64ToUploadedFile(p.guidelineFile),
                    products: p.products.map((prod: any) => ({
                        ...prod,
                        id: prod.id || crypto.randomUUID(),
                        productImage: base64ToUploadedFile(prod.productImage),
                        productInfoFile: base64ToUploadedFile(prod.productInfoFile),
                    })),
                    virtualIdols: (p.idols || p.faces || []).map((idolFile: any, index: number) => {
                        const uploadedFile = base64ToUploadedFile(idolFile);
                        if (!uploadedFile) return null;
                        return {
                            id: crypto.randomUUID(),
                            name: `Creator ${index + 1}`,
                            username: `creator${index+1}`,
                            avatar: uploadedFile,
                            gender: 'Any',
                            ageRange: '18-24',
                            incomeLevel: 'Medium',
                            archetype: 'Người Bình thường',
                            platforms: [],
                            toneOfVoice: '',
                            nicheMarkets: '',
                            contentPillars: '',
                            usp: '',
                            isActive: index === 0,
                        } as VirtualIdol;
                    }).filter((v: VirtualIdol | null): v is VirtualIdol => v !== null),
                    outfits: (p.outfits || []).map(base64ToUploadedFile).filter((o: UploadedFile | null): o is UploadedFile => o !== null),
                }));

                for (const profile of profilesToMigrate) {
                    await saveBrandProfileDB(profile);
                }

                userProfiles = await getBrandProfilesDB(user);
                localStorage.removeItem(getProfilesKey(user));
                console.log("Migration complete.");
            }

            if (userProfiles.length === 0) {
                console.log("No profiles found, initializing with default.");
                for (const profile of INITIAL_BRAND_PROFILES) {
                    const userProfile = {...profile, userId: user};
                    await saveBrandProfileDB(userProfile);
                }
                userProfiles = await getBrandProfilesDB(user);
            }

            // In-place migration for existing DB users from `idols` to `virtualIdols`
            for (const profile of userProfiles) {
                if ((profile as any).idols && !(profile as any).virtualIdols) {
                    console.log(`Migrating idols for DB profile: ${profile.name}`);
                    const newVirtualIdols: VirtualIdol[] = ((profile as any).idols as UploadedFile[]).map((idolFile, index) => ({
                        id: crypto.randomUUID(),
                        name: `Creator ${index + 1}`,
                        username: `@creator${index + 1}`,
                        avatar: idolFile,
                        gender: 'Any',
                        ageRange: '18-24',
                        incomeLevel: 'Medium',
                        archetype: 'Người Bình thường',
                        platforms: [],
                        toneOfVoice: 'Friendly, authentic, and helpful.',
                        nicheMarkets: 'lifestyle, e-commerce',
                        contentPillars: 'product reviews, tutorials',
                        usp: '',
                        isActive: index === 0,
                    }));
                    profile.virtualIdols = newVirtualIdols;
                    delete (profile as any).idols;
                    await saveBrandProfileDB(profile); // Save the updated profile back
                }
            }


            setProfiles(userProfiles);

            const activeId = await getUserPrefDB(getActiveIdKey(user));
            setActiveProfileId(activeId || (userProfiles[0]?.id || null));

        } catch (error) {
            console.error("Failed to load or migrate brand profiles", error);
            setProfiles(INITIAL_BRAND_PROFILES.map(p => ({ ...p, userId: user })));
            setActiveProfileId(INITIAL_BRAND_PROFILES[0]?.id || null);
        }
    };
    
    loadData();

  }, [user]);


  const activeProfile = useMemo(() => {
    if (!user) return null;
    return profiles.find(p => p.id === activeProfileId) || null;
  }, [profiles, activeProfileId, user]);

  const setActiveProfileIdAndSave = async (id: string | null) => {
    if (!user) return;
    setActiveProfileId(id);
    try {
        await setUserPrefDB(getActiveIdKey(user), id);
    } catch (error) {
        console.error("Failed to save active profile ID to DB", error);
    }
  };

  const addProfile = async (name: string) => {
    if (!user) return;
    const newProfile: BrandProfile = {
      id: crypto.randomUUID(),
      userId: user,
      name,
      colors: ['#FFFFFF', '#000000'],
      logo: null,
      guidelineFile: null,
      products: [{
        id: crypto.randomUUID(),
        sku: "NEW-SKU-001",
        product_name: "New Product Name",
        product_short: "New Product",
        benefits: ["Benefit 1", "Benefit 2"],
        tech_specs: "",
        usp: "",
        productImage: null,
        productInfoFile: null,
        notes: ""
      }],
      virtualIdols: [],
      outfits: [],
    };
    await saveBrandProfileDB(newProfile);
    setProfiles(prev => [...prev, newProfile]);
    await setActiveProfileIdAndSave(newProfile.id);
  };
  
  const updateProfile = async (updatedProfile: BrandProfile) => {
    if (!user) return;
    const profileToSave = { ...updatedProfile, userId: user };
    await saveBrandProfileDB(profileToSave);
    
    // The updatedProfile might have blob URLs. We need to refetch from DB
    // to get the fresh blob URLs for the state to avoid stale URLs.
    const reloadedProfile = (await getBrandProfilesDB(user)).find(p => p.id === updatedProfile.id);

    setProfiles(prev => prev.map(p => p.id === updatedProfile.id ? (reloadedProfile || updatedProfile) : p));
  };
  
  const deleteProfile = async (id: string) => {
    if (!user) return;
    // Find the profile to clean up blob URLs
    const profileToDelete = profiles.find(p => p.id === id);
    if(profileToDelete) {
        // Revoke Object URLs to prevent memory leaks
        [profileToDelete.logo, profileToDelete.guidelineFile, ...profileToDelete.outfits].forEach(f => {
            if (f?.url) URL.revokeObjectURL(f.url);
        });
        profileToDelete.virtualIdols.forEach(idol => {
            if (idol.avatar?.url) URL.revokeObjectURL(idol.avatar.url);
        });
        profileToDelete.products.forEach(p => {
            if(p.productImage?.url) URL.revokeObjectURL(p.productImage.url);
            if(p.productInfoFile?.url) URL.revokeObjectURL(p.productInfoFile.url);
        });
    }

    await deleteBrandProfileDB(id);
    const remainingProfiles = profiles.filter(p => p.id !== id);
    setProfiles(remainingProfiles);
    if (activeProfileId === id) {
        const newActiveId = remainingProfiles.length > 0 ? remainingProfiles[0].id : null;
        await setActiveProfileIdAndSave(newActiveId);
    }
  };

  const contextValue = {
    profiles,
    activeProfile,
    setActiveProfileId: setActiveProfileIdAndSave,
    addProfile,
    updateProfile,
    deleteProfile,
  };

  return (
    <BrandContext.Provider value={contextValue}>
      {children}
    </BrandContext.Provider>
  );
};

export const useBrand = (): BrandContextType => {
  const context = useContext(BrandContext);
  if (!context) {
    throw new Error('useBrand must be used within a BrandProvider');
  }
  return context;
};