

import { ContentItem, Project, BrandProfile, UploadedFile, Product, VirtualIdol } from '../types';

const DB_NAME = 'ImageForgeEcomDB';
const DB_VERSION = 3; // Incremented version to trigger migration
const PROJECTS_STORE = 'projects';
const CONTENT_STORE = 'contentItems';
const BRAND_PROFILES_STORE = 'brandProfiles';
const USER_PREFS_STORE = 'userPrefs';


let db: IDBDatabase;

const dataURLtoBlob = async (dataurl: string): Promise<Blob> => {
    const res = await fetch(dataurl);
    return res.blob();
}

const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        if (db) return resolve(db);

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject("IndexedDB error: " + request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const dbInstance = (event.target as IDBOpenDBRequest).result;
            const transaction = (event.target as IDBOpenDBRequest).transaction!;
            const oldVersion = event.oldVersion;

            if (oldVersion < 2) {
                if (!dbInstance.objectStoreNames.contains(PROJECTS_STORE)) {
                    const projectStore = dbInstance.createObjectStore(PROJECTS_STORE, { keyPath: 'id' });
                    projectStore.createIndex('by-user', 'userId', { unique: false });
                }
                if (!dbInstance.objectStoreNames.contains(CONTENT_STORE)) {
                    const contentStore = dbInstance.createObjectStore(CONTENT_STORE, { keyPath: 'id' });
                    contentStore.createIndex('by-project', ['userId', 'projectId', 'createdAt'], { unique: false });
                }
            }
            
            if (oldVersion < 3) {
                if (!dbInstance.objectStoreNames.contains(BRAND_PROFILES_STORE)) {
                    const profileStore = dbInstance.createObjectStore(BRAND_PROFILES_STORE, { keyPath: 'id' });
                    profileStore.createIndex('by-user', 'userId', { unique: false });
                }
                if (!dbInstance.objectStoreNames.contains(USER_PREFS_STORE)) {
                    dbInstance.createObjectStore(USER_PREFS_STORE, { keyPath: 'key' });
                }
            }
        };
    });
};

// --- Helper Functions for File Storage ---

const fileToStorable = async (file: UploadedFile | null): Promise<any | null> => {
    if (!file) return null;
    let blob: Blob | undefined;
    if (file.file) {
        blob = file.file;
    } else if (file.base64) {
        blob = await dataURLtoBlob(`data:${file.type};base64,${file.base64}`);
    }
    return { name: file.name, type: file.type, blob };
};

const storableToFile = (storable: any | null): UploadedFile | null => {
    if (!storable || !storable.blob) return null;
    const blob = storable.blob as Blob;
    const url = URL.createObjectURL(blob);
    return {
        name: storable.name,
        type: storable.type,
        url: url,
        file: blob as File,
    };
};


// --- Project Functions ---
export const getProjectsForUserDB = async (userId: string): Promise<Project[]> => {
    const db = await openDB();
    return new Promise<Project[]>((resolve, reject) => {
        const transaction = db.transaction(PROJECTS_STORE, 'readonly');
        const store = transaction.objectStore(PROJECTS_STORE);
        const index = store.index('by-user');
        const request = index.getAll(userId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const addProjectDB = async (project: Project): Promise<void> => {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(PROJECTS_STORE, 'readwrite');
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.objectStore(PROJECTS_STORE).put(project);
    });
};

export const deleteProjectDB = async (projectId: string): Promise<void> => {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([PROJECTS_STORE, CONTENT_STORE], 'readwrite');
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);

        const projectStore = transaction.objectStore(PROJECTS_STORE);
        const contentStore = transaction.objectStore(CONTENT_STORE);
        
        projectStore.delete(projectId);

        const contentIndex = contentStore.index('by-project');
        const range = IDBKeyRange.only([localStorage.getItem('imageforge_current_user'), projectId, '']);
        const cursorReq = contentIndex.openCursor();

        cursorReq.onsuccess = () => {
            const cursor = cursorReq.result;
            if (cursor) {
                if (cursor.value.projectId === projectId) {
                    cursor.delete();
                }
                cursor.continue();
            }
        };
    });
};

// --- Content Item Functions ---
export const getContentForUserDB = async (userId: string): Promise<ContentItem[]> => {
    const db = await openDB();
    const transaction = db.transaction(CONTENT_STORE, 'readonly');
    const store = transaction.objectStore(CONTENT_STORE);
    const index = store.index('by-project');
    const range = IDBKeyRange.bound([userId, ''], [userId, '\uffff']);

    const items: ContentItem[] = [];
    return new Promise((resolve, reject) => {
        const cursorReq = index.openCursor(range, 'prev');
        cursorReq.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
            if (cursor) {
                const { blob, imageBlobs, blobMimeType, ...itemData } = cursor.value;
                if (itemData.type === 'image' && blob) {
                    itemData.url = URL.createObjectURL(blob);
                    if (!itemData.settings) itemData.settings = {};
                    itemData.settings.mimeType = blobMimeType;
                } else if (itemData.type === 'ad' && blob) {
                    itemData.baseImageUrl = URL.createObjectURL(blob);
                    if (!itemData.settings) itemData.settings = {};
                    itemData.settings.baseAssetMimeType = blobMimeType;
                } else if (itemData.type === 'blog' && blob) {
                    itemData.featuredImageUrl = URL.createObjectURL(blob);
                    if (!itemData.settings) itemData.settings = {};
                    itemData.settings.featuredAssetMimeType = blobMimeType;
                } else if (itemData.type === 'video' && blob) {
                    itemData.url = URL.createObjectURL(blob);
                    if (!itemData.settings) itemData.settings = {};
                    itemData.settings.mimeType = blobMimeType;
                }
                items.push(itemData as ContentItem);
                cursor.continue();
            } else {
                resolve(items);
            }
        };
        cursorReq.onerror = () => reject(cursorReq.error);
    });
};

export const addContentItemDB = async (item: ContentItem): Promise<void> => {
    const db = await openDB();
    let itemToStore: any = JSON.parse(JSON.stringify(item));
    let blob: Blob | undefined;

    if ((item.type === 'image' || item.type === 'video') && item.url) {
        blob = await dataURLtoBlob(item.url);
        delete itemToStore.url;
    } else if (item.type === 'ad' && item.baseImageUrl) {
        blob = await dataURLtoBlob(item.baseImageUrl);
        delete itemToStore.baseImageUrl;
    } else if (item.type === 'blog' && item.featuredImageUrl) {
        blob = await dataURLtoBlob(item.featuredImageUrl);
        delete itemToStore.featuredImageUrl;
    }

    if (blob) {
        itemToStore.blob = blob;
        itemToStore.blobMimeType = blob.type;
    }
    
    return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(CONTENT_STORE, 'readwrite');
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.objectStore(CONTENT_STORE).put(itemToStore);
    });
};

export const deleteContentItemDB = async (id: string): Promise<void> => {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(CONTENT_STORE, 'readwrite');
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.objectStore(CONTENT_STORE).delete(id);
    });
};

export const moveContentItemsDB = async (itemIds: string[], targetProjectId: string): Promise<void> => {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(CONTENT_STORE, 'readwrite');
        const store = transaction.objectStore(CONTENT_STORE);
        
        let processedCount = 0;
        const totalItems = itemIds.length;
        if (totalItems === 0) {
            resolve();
            return;
        }

        const processNext = () => {
            if (processedCount >= totalItems) return;

            const id = itemIds[processedCount];
            const request = store.get(id);
            request.onerror = () => reject(transaction.error);
            request.onsuccess = () => {
                const item = request.result;
                if (item) {
                    item.projectId = targetProjectId;
                    const updateRequest = store.put(item);
                    updateRequest.onerror = () => reject(transaction.error);
                    updateRequest.onsuccess = () => {
                        processedCount++;
                        if(processedCount < totalItems) {
                           processNext();
                        }
                    };
                } else {
                    processedCount++;
                    if(processedCount < totalItems) {
                       processNext();
                    }
                }
            };
        };

        processNext();

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};

// --- Brand Profile Functions ---
export const saveBrandProfileDB = async (profile: BrandProfile): Promise<void> => {
    const db = await openDB();
    
    const storableProfile = JSON.parse(JSON.stringify(profile));
    
    storableProfile.logo = await fileToStorable(profile.logo);
    storableProfile.guidelineFile = await fileToStorable(profile.guidelineFile);

    storableProfile.products = await Promise.all(profile.products.map(async (p: Product) => ({
        ...p,
        productImage: await fileToStorable(p.productImage),
        productInfoFile: await fileToStorable(p.productInfoFile),
    })));

    // FIX: Property 'idols' does not exist on type 'BrandProfile'. Updated to use 'virtualIdols' and process VirtualIdol objects correctly.
    storableProfile.virtualIdols = await Promise.all((profile.virtualIdols || []).map(async (idol: VirtualIdol) => ({
        ...idol,
        avatar: await fileToStorable(idol.avatar),
    })));
    storableProfile.outfits = await Promise.all((profile.outfits || []).map(fileToStorable));

    return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(BRAND_PROFILES_STORE, 'readwrite');
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.objectStore(BRAND_PROFILES_STORE).put(storableProfile);
    });
};

export const getBrandProfilesDB = async (userId: string): Promise<BrandProfile[]> => {
    const db = await openDB();
    return new Promise<BrandProfile[]>((resolve, reject) => {
        const transaction = db.transaction(BRAND_PROFILES_STORE, 'readonly');
        const store = transaction.objectStore(BRAND_PROFILES_STORE);
        const index = store.index('by-user');
        const request = index.getAll(userId);

        request.onsuccess = () => {
            const storableProfiles = request.result;
            const profiles: BrandProfile[] = storableProfiles.map((p: any) => ({
                ...p,
                logo: storableToFile(p.logo),
                guidelineFile: storableToFile(p.guidelineFile),
                products: p.products.map((prod: any) => ({
                    ...prod,
                    productImage: storableToFile(prod.productImage),
                    productInfoFile: storableToFile(prod.productInfoFile),
                })),
                virtualIdols: (p.virtualIdols || []).map((idol: any) => ({ ...idol, avatar: storableToFile(idol.avatar) })),
                outfits: (p.outfits || []).map(storableToFile).filter((o: UploadedFile | null): o is UploadedFile => o !== null),
            }));
            resolve(profiles);
        };
        request.onerror = () => reject(request.error);
    });
};

// FIX: Added missing deleteBrandProfileDB function
export const deleteBrandProfileDB = async (id: string): Promise<void> => {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(BRAND_PROFILES_STORE, 'readwrite');
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.objectStore(BRAND_PROFILES_STORE).delete(id);
    });
};


// FIX: Added missing User Preferences Functions
// --- User Preferences Functions ---
export const setUserPrefDB = async (key: string, value: any): Promise<void> => {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(USER_PREFS_STORE, 'readwrite');
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.objectStore(USER_PREFS_STORE).put({ key, value });
    });
};

export const getUserPrefDB = async (key: string): Promise<any> => {
    const db = await openDB();
    return new Promise<any>((resolve, reject) => {
        const transaction = db.transaction(USER_PREFS_STORE, 'readonly');
        const store = transaction.objectStore(USER_PREFS_STORE);
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result?.value);
        request.onerror = () => reject(request.error);
    });
};