

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { Project, ContentItem } from '../types';
import { 
    getProjectsForUserDB, addProjectDB, deleteProjectDB, 
    getContentForUserDB, addContentItemDB, deleteContentItemDB,
    moveContentItemsDB
} from '../services/dbService';

interface LibraryContextType {
  projects: Project[];
  contentLibrary: ContentItem[];
  addProject: (name: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  updateProject: (project: Project) => Promise<void>;
  addContentItem: (item: Omit<ContentItem, 'userId' | 'id'> & { id?: string }) => Promise<void>;
  updateContentItem: (item: ContentItem) => Promise<void>;
  deleteContentItem: (id: string) => Promise<void>;
  moveContentItems: (itemIds: string[], targetProjectId: string) => Promise<void>;
}

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

const cleanupItemUrls = (item: ContentItem) => {
    if ((item.type === 'image' || item.type === 'video' || item.type === 'audio') && item.url && item.url.startsWith('blob:')) {
        URL.revokeObjectURL(item.url);
    }
    if (item.type === 'ad' && item.baseImageUrl && item.baseImageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(item.baseImageUrl);
    }
    if (item.type === 'blog' && item.featuredImageUrl && item.featuredImageUrl.startsWith('blob:')) {
         URL.revokeObjectURL(item.featuredImageUrl);
    }
};

export const LibraryProvider: React.FC<{ children: ReactNode, user: string | null }> = ({ children, user }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [contentLibrary, setContentLibrary] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadLibraryData = useCallback(async (currentUser: string) => {
    setIsLoading(true);
    try {
        const [userProjects, userContent] = await Promise.all([
            getProjectsForUserDB(currentUser),
            getContentForUserDB(currentUser),
        ]);

        if (userProjects.length === 0) {
            const newProject: Project = {
                id: crypto.randomUUID(),
                userId: currentUser,
                name: "My First Project",
                createdAt: new Date().toISOString(),
            };
            await addProjectDB(newProject);
            setProjects([newProject]);
        } else {
            setProjects(userProjects);
        }

        setContentLibrary(userContent);
    } catch (error) {
        console.error("Failed to load library data from IndexedDB", error);
        setProjects([]);
        setContentLibrary([]);
    } finally {
        setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
        loadLibraryData(user);
    } else {
        setProjects([]);
        setContentLibrary([]);
    }
    // Cleanup blob URLs on user change or unmount
    return () => {
        contentLibrary.forEach(cleanupItemUrls);
    }
  }, [user, loadLibraryData]);

  const addProject = async (name: string) => {
    if (!user) return;
    const newProject: Project = {
        id: crypto.randomUUID(),
        userId: user,
        name,
        createdAt: new Date().toISOString(),
    };
    await addProjectDB(newProject);
    setProjects(prev => [...prev, newProject]);
  };

  const updateProject = async (project: Project) => {
    if (!user) return;
    await addProjectDB(project); // `put` in IndexedDB handles create and update
    setProjects(prev => prev.map(p => p.id === project.id ? project : p));
  };

  const deleteProject = async (id: string) => {
    await deleteProjectDB(id);
    setProjects(prev => prev.filter(p => p.id !== id));
    // Also remove content from that project from the state, cleaning up URLs
    setContentLibrary(prev => {
        const remaining = [];
        for (const item of prev) {
            if (item.projectId === id) {
                cleanupItemUrls(item);
            } else {
                remaining.push(item);
            }
        }
        return remaining;
    });
  };

  const addContentItem = async (item: Omit<ContentItem, 'userId' | 'id'> & { id?: string }) => {
    if (!user) return;
    const newItem: ContentItem = {
        ...item,
        id: item.id || crypto.randomUUID(),
        userId: user,
    } as ContentItem;
    
    await addContentItemDB(newItem);
    
    // The DB service creates new blob URLs on load, so we need to refetch to get the correct state
    // This is a bit inefficient but ensures consistency. A more optimized approach would be to
    // create blobs and URLs here and pass them to the DB service.
    if (user) {
        const userContent = await getContentForUserDB(user);
        setContentLibrary(userContent);
    }
  };
  
  const updateContentItem = async (item: ContentItem) => {
      if (!user) return;
      await addContentItemDB(item); // Re-using because `put` handles updates
      setContentLibrary(prev => prev.map(c => c.id === item.id ? item : c));
  };

  const deleteContentItem = async (id: string) => {
    const itemToDelete = contentLibrary.find(item => item.id === id);
    if(itemToDelete) {
        cleanupItemUrls(itemToDelete);
    }
    await deleteContentItemDB(id);
    setContentLibrary(prev => prev.filter(c => c.id !== id));
  };

  const moveContentItems = async (itemIds: string[], targetProjectId: string) => {
    if (!user) return;
    await moveContentItemsDB(itemIds, targetProjectId);
    setContentLibrary(prev => {
        const movedIds = new Set(itemIds);
        return prev.map(item => {
            if (movedIds.has(item.id)) {
                return { ...item, projectId: targetProjectId };
            }
            return item;
        });
    });
  };

  const contextValue = {
    projects,
    contentLibrary,
    addProject,
    deleteProject,
    updateProject,
    addContentItem,
    updateContentItem,
    deleteContentItem,
    moveContentItems,
  };

  return (
    <LibraryContext.Provider value={contextValue}>
      {children}
    </LibraryContext.Provider>
  );
};

export const useLibrary = (): LibraryContextType => {
  const context = useContext(LibraryContext);
  if (!context) {
    throw new Error('useLibrary must be used within a LibraryProvider');
  }
  return context;
};