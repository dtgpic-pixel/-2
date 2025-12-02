import React, { createContext, useContext, useState, useCallback } from 'react';
import { AppState, TreeState, Language, GestureData } from './types';

interface StoreContextType {
  appState: AppState;
  setAppState: (state: AppState) => void;
  treeState: TreeState;
  setTreeState: (state: TreeState) => void;
  language: Language;
  toggleLanguage: () => void;
  gestureData: GestureData;
  updateGestureData: (data: Partial<GestureData>) => void;
}

const StoreContext = createContext<StoreContextType | null>(null);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [appState, setAppState] = useState<AppState>(AppState.INITIALIZING);
  const [treeState, setTreeState] = useState<TreeState>(TreeState.FORMED);
  const [language, setLanguage] = useState<Language>('EN');
  const [gestureData, setGestureData] = useState<GestureData>({ isOpen: false, x: 0.5, y: 0.5 });

  const toggleLanguage = useCallback(() => {
    setLanguage(prev => prev === 'EN' ? 'CN' : 'EN');
  }, []);

  const updateGestureData = useCallback((data: Partial<GestureData>) => {
    setGestureData(prev => ({ ...prev, ...data }));
    // Direct logic mapping: Gesture controls Tree State
    if (data.isOpen !== undefined) {
        setTreeState(data.isOpen ? TreeState.CHAOS : TreeState.FORMED);
    }
  }, []);

  return (
    <StoreContext.Provider value={{
      appState,
      setAppState,
      treeState,
      setTreeState,
      language,
      toggleLanguage,
      gestureData,
      updateGestureData
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used within StoreProvider");
  return context;
};