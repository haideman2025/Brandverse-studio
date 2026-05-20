
import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { BrandCreativesView } from './views/BrandCreativesView';
import { AssetsView } from './views/AssetsView';
import { LibraryView } from './views/LibraryView';
import { HistoryView } from './views/HistoryView';
import { LoginView } from './views/LoginView';
import { BrandProvider } from './context/BrandContext';
import { LibraryProvider } from './context/LibraryContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { ContentItem, ImageContent } from './types';
import { BottomNav } from './components/BottomNav';

export type View = 'creatives' | 'assets' | 'library' | 'history';
// FIX: Add 'video' to CreationMode to support storyboard and video generation workflows.
export type CreationMode = 'image' | 'content' | 'video';
export type ContentSubMode = 'ad' | 'blog';

export interface EditingHistoryState {
  item: ContentItem;
  initialMode?: CreationMode;
  initialSubMode?: ContentSubMode;
}


const USERS_KEY = 'imageforge_users';

const AppContent: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<string | null>(() => localStorage.getItem('imageforge_current_user'));
  const [activeView, setActiveView] = useState<View>('creatives');
  const [editingHistoryItem, setEditingHistoryItem] = useState<EditingHistoryState | null>(null);
  const { t } = useLanguage();
  
  useEffect(() => {
    if (currentUser) {
        setActiveView('creatives');
    }
  }, [currentUser]);


  const handleLogin = (username: string): string => {
    const storedUsers = localStorage.getItem(USERS_KEY);
    const users = storedUsers ? JSON.parse(storedUsers) : [];
    
    if (users.includes(username)) {
      localStorage.setItem('imageforge_current_user', username);
      setCurrentUser(username);
      return ''; // Success
    }
    // FIX: Argument of type '"error_username_not_found"' is not assignable to parameter of type 'TranslationKey'.
    // Added the key to localization.ts.
    return t('error_username_not_found');
  };
  
  const handleRegister = (username: string): string => {
    const storedUsers = localStorage.getItem(USERS_KEY);
    const users = storedUsers ? JSON.parse(storedUsers) : [];

    if (users.includes(username)) {
        // FIX: Argument of type '"error_username_taken"' is not assignable to parameter of type 'TranslationKey'.
        // Added the key to localization.ts.
        return t('error_username_taken');
    }

    users.push(username);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    handleLogin(username); // Automatically log in after successful registration
    return ''; // Success
  };


  const handleLogout = () => {
    localStorage.removeItem('imageforge_current_user');
    setCurrentUser(null);
    setActiveView('creatives');
  };

  const handleEditFromLibrary = (item: ContentItem, initialMode?: CreationMode, initialSubMode?: ContentSubMode) => {
    if (item.type === 'image') {
      setEditingHistoryItem({ item, initialMode: initialMode || 'image', initialSubMode });
      setActiveView('creatives');
    } else if (item.type === 'video_script') {
      setEditingHistoryItem({ item, initialMode: 'video' });
      setActiveView('creatives');
    } else {
      // Handle editing other content types like scripts if needed
      // FIX: Argument of type '"error_editing_not_implemented"' is not assignable to parameter of type 'TranslationKey'.
      // Added the key to localization.ts.
      alert(t('error_editing_not_implemented'));
    }
  };

  const handleEditComplete = () => {
    setEditingHistoryItem(null);
  }
  
  if (!currentUser) {
      return <LoginView onLogin={handleLogin} onRegister={handleRegister} />;
  }

  const renderContent = () => {
      switch (activeView) {
      case 'creatives':
          return <BrandCreativesView 
                  editingHistoryItem={editingHistoryItem} 
                  onEditComplete={handleEditComplete} 
                  setActiveView={setActiveView}
                  />;
      case 'assets':
          return <AssetsView setActiveView={setActiveView} />;
      case 'history':
          return <HistoryView 
                  onEdit={handleEditFromLibrary}
                  />;
      case 'library':
          return <LibraryView 
                  onEdit={handleEditFromLibrary}
                  />;
      default:
          return <BrandCreativesView 
                  editingHistoryItem={editingHistoryItem} 
                  onEditComplete={handleEditComplete}
                  setActiveView={setActiveView}
                  />;
      }
  };

  return (
      <BrandProvider user={currentUser}>
          <LibraryProvider user={currentUser}>
              <div className="min-h-screen bg-dark-bg text-dark-text font-sans">
                  <Header activeView={activeView} setActiveView={setActiveView} currentUser={currentUser} onLogout={handleLogout} />
                  <main className="container mx-auto p-4 md:p-6 lg:p-8 pb-24 md:pb-8">
                      {renderContent()}
                  </main>
                  <BottomNav activeView={activeView} setActiveView={setActiveView} />
              </div>
          </LibraryProvider>
      </BrandProvider>
  );
}

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
};

export default App;
