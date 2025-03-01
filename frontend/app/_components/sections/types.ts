export interface Section {
    id: string;
    title: string;
    level: number; // 1 for #, 2 for ##, etc.
    content: string;
    position: number;
  }
