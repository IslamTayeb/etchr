// frontend/lib/section-manager.ts

interface Section {
  id: string;
  level: number;
  title: string;
  content: string;
  order: number;
}

interface CodebaseCache {
  repoUrl: string;
  content: string;
  timestamp: number;
}

const REPO_CACHE_KEY = 'repo-content-cache';

export function setCachedCodebase(repoUrl: string, content: string) {
  localStorage.setItem(REPO_CACHE_KEY, JSON.stringify({
    repoUrl,
    content,
    timestamp: Date.now()
  }));
}

export function getCachedCodebase(): CodebaseCache | null {
  const cached = localStorage.getItem(REPO_CACHE_KEY);
  return cached ? JSON.parse(cached) : null;
}

export function extractSections(markdown: string): Section[] {
  const lines = markdown.split('\n');
  const sections: Section[] = [];
  let currentSection: Partial<Section> | null = null;
  let contentLines: string[] = [];
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      if (currentSection) contentLines.push(line);
      continue;
    }

    if (!inCodeBlock && !line.includes('`')) {
      const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
      if (headingMatch) {
        if (currentSection) {
          sections.push({
            ...currentSection,
            content: contentLines.join('\n').trim()
          } as Section);
        }

        currentSection = {
          id: `section-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          level: headingMatch[1].length,
          title: headingMatch[2],
          order: sections.length,
        };
        contentLines = [];
        continue;
      }
    }

    if (currentSection) {
      contentLines.push(line);
    }
  }

  if (currentSection) {
    sections.push({
      ...currentSection,
      content: contentLines.join('\n').trim()
    } as Section);
  }

  return sections;
}

export function compileSections(sections: Section[]): string {
  return sections
    .sort((a, b) => a.order - b.order)
    .map(section => `${'#'.repeat(section.level)} ${section.title}\n${section.content}`)
    .join('\n\n');
}

export function validateSectionContent(content: string): boolean {
  const lines = content.split('\n');
  let inCodeBlock = false;

  for (const line of lines) {
    if (line.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }

    if (!inCodeBlock && !line.includes('`')) {
      if (line.match(/^#{1,3}\s+.+$/)) {
        return false;
      }
    }
  }

  return true;
}
