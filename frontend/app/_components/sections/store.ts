import { create } from 'zustand';
import { Section } from './types';

interface SectionStore {
  sections: Section[];
  activeSection: Section | null;
  setSections: (sections: Section[]) => void;
  updateSection: (id: string, updates: Partial<Section>) => void;
  reorderSections: (startIndex: number, endIndex: number) => void;
}

export const useSectionStore = create<SectionStore>((set) => ({
  sections: [],
  activeSection: null,
  setSections: (sections) => set({ sections }),
  updateSection: (id, updates) =>
    set((state) => ({
      sections: state.sections.map((section) =>
        section.id === id ? { ...section, ...updates } : section
      ),
    })),
  reorderSections: (startIndex, endIndex) =>
    set((state) => {
      const newSections = [...state.sections];
      const [removed] = newSections.splice(startIndex, 1);
      newSections.splice(endIndex, 0, removed);
      return { sections: newSections };
    }),
}));
