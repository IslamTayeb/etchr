'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface DirectoryContextType {
  selectedDirectory: string;
  setSelectedDirectory: (directory: string) => void;
}

interface CustomWindow extends Window {
  selectedDirectory?: string;
}

const DirectoryContext = createContext<DirectoryContextType | undefined>(undefined);

const getSelectedDirectory = () => {
  if (typeof window === 'undefined') return '';
  return ((window as CustomWindow).selectedDirectory) || '';
};


export function DirectoryProvider({ children }: { children: React.ReactNode }) {
  const [selectedDirectory, setSelectedDirectory] = useState<string>(getSelectedDirectory());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    (window as CustomWindow).selectedDirectory = selectedDirectory;
  }, [selectedDirectory]);

  return (
    <DirectoryContext.Provider value={{ selectedDirectory, setSelectedDirectory }}>
      {children}
    </DirectoryContext.Provider>
  );
}

export function useDirectory() {
  const context = useContext(DirectoryContext);
  if (context === undefined) {
    throw new Error('useDirectory must be used within a DirectoryProvider');
  }
  return context;
}
