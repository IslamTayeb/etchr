"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import { MarkdownEditor } from "./editing/markdown-editor"
import { MarkdownViewer } from "./editing/markdown-viewer"
import { FileTree } from "./editing/file-tree"
import { SectionsColumn } from "./sections/sections-column"
import axios from "axios"
import { debounce } from 'lodash';
import LoadingIndicator from "./editing/loading-indicator"
import Excalidraw from "./editing/excalidraw"
import { DirectoryProvider } from "./editing/directory-context"
import { editor } from "monaco-editor"
import { SectionData } from "./sections/sections-column"
import { compileSections } from "@/lib/section-manager"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils";

interface FileTreeItem {
  path: string;
  mode: string;
  type: string;
  sha: string;
  size?: number;
  url: string;
}

interface EditorViewProps {
  repoUrl: string;
  markdown: string;
  setMarkdown: (markdown: string) => void;
  userId: string | null;
  onLimitReached: () => void;  // Add this
}

interface FileSelectionParams {
  selectedFiles: string[];
  selectedDirectories: string[];
  projectContext: string;
}


export function EditorView({ repoUrl, markdown, setMarkdown, userId, onLimitReached }: EditorViewProps) {
  const [loading, setLoading] = useState(false);
  const [showFileTree, setShowFileTree] = useState(true);
  const [files, setFiles] = useState<FileTreeItem[]>([]);
  const [preSelectedFiles, setPreSelectedFiles] = useState<string[]>([]);
  const [sections, setSections] = useState<SectionData[]>([]);
  const [activeSection, setActiveSection] = useState<SectionData | null>(null);
  const [activeSectionContent, setActiveSectionContent] = useState('');
  const [fullMarkdown, setFullMarkdown] = useState(markdown);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const [loadingMessages, setLoadingMessages] = useState<string[]>([]);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [tokenCount, setTokenCount] = useState<number>(0);
  const [isComplete] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileTreeItem[]>([]);
  const [showExcalidraw, setShowExcalidraw] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('showExcalidraw') !== 'false';
    }
    return true;
  });

  const extractSections = (content: string): SectionData[] => {
    const lines = content.split('\n');
    const sections: SectionData[] = [];
    let currentSection: Partial<SectionData> | null = null;
    let contentLines: string[] = [];
    let inCodeBlock = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        if (currentSection) {
          contentLines.push(line);
        }
        continue;
      }

      if (!inCodeBlock && !line.includes('`')) {
        const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
        if (headingMatch && (!currentSection || headingMatch[1].length <= 2)) {
          if (currentSection) {
            sections.push({
              ...currentSection,
              content: contentLines.join('\n').trim()
            } as SectionData);
          }

          currentSection = {
            id: `section-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            level: headingMatch[1].length,
            title: headingMatch[2],
            order: sections.length,
          };
          contentLines = [];  // Don't include the heading line
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
      } as SectionData);
    }

    return sections;
  };

  const mergeSections = (sections: SectionData[]): string => {
    return sections
      .sort((a, b) => a.order - b.order)
      .map(section => `${'#'.repeat(section.level)} ${section.title}\n${section.content}`)
      .join('\n\n');
  };


  // const debouncedUpdateSection = useCallback(
  //   debounce((newContent: string) => {
  //     if (activeSection) {
  //       const updatedSections = sections.map(section => {
  //         if (section.id === activeSection.id) {
  //           return {
  //             ...section,
  //             markdown: newContent
  //           };
  //         }
  //         return section;
  //       });

  //       const newFullMarkdown = updatedSections.map(s => s.content).join('\n\n');
  //       setFullMarkdown(newFullMarkdown);
  //       setMarkdown(newFullMarkdown);
  //       setSections(updatedSections);
  //     }
  //   }, 300),
  //   [activeSection, sections, setMarkdown]
  // );

  const handleSectionSelect = (section: SectionData) => {
    setActiveSection(section);
    setActiveSectionContent(section.content);
  };

  const debouncedUpdate = useCallback(
    debounce((newValue: string) => {
      if (!activeSection) return;

      setSections(prev => {
        const newSections = prev.map(section => {
          if (section.id === activeSection.id) {
            return {
              ...section,
              content: newValue
            };
          }
          return section;
        });

        const newMarkdown = mergeSections(newSections);
        setFullMarkdown(newMarkdown);
        setMarkdown(newMarkdown);
        return newSections;
      });
    }, 300),
    [activeSection, setMarkdown]
  );

  // In markdown-editor.tsx
  const handleMarkdownChange = (newValue: string) => {
    if (!activeSection) return;

    const lines = newValue.split('\n');
    let inCodeBlock = false;
    const validLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        validLines.push(line);
        continue;
      }

      if (!inCodeBlock && !line.includes('`')) {
        if (line.match(/^#{1,3}\s+.+$/)) {
          toast({
            title: "Invalid Content",
            description: "Headers can only be added through the sections panel",
            variant: "destructive"
          });
          continue; // Skip header lines
        }
      }
      validLines.push(line);
    }

    const cleanContent = validLines.join('\n');
    if (cleanContent !== newValue && editorRef.current) {
      // Set cursor position
      const position = editorRef.current.getPosition();
      editorRef.current.setValue(cleanContent);
      if (position) {
        editorRef.current.setPosition(position);
      }
    }

    setActiveSectionContent(cleanContent);
    debouncedUpdate(cleanContent);
  };

  const handleSectionsChange = (newSections: SectionData[], updatedMarkdown?: string) => {
    const newFullMarkdown = updatedMarkdown || compileSections(newSections);
    setFullMarkdown(newFullMarkdown);
    setMarkdown(newFullMarkdown);
    setSections(newSections);
  };

  const fetchRepositoryTree = async () => {
    try {
      setLoading(true);
      setLoadingMessages([
        "Connecting to repository...",
        "Fetching file structure...",
        "Analyzing repository contents..."
      ]);

      let messageIndex = 0;
      const messageInterval = setInterval(() => {
        setCurrentMessageIndex(prev => {
          messageIndex = (prev + 1) % loadingMessages.length;
          return messageIndex;
        });
      }, 3000);

      const token = localStorage.getItem("githubToken") || "";
      const encodedRepoUrl = encodeURIComponent(repoUrl);
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/github/fetch-tree?repoUrl=${encodedRepoUrl}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json"
          },
          withCredentials: true
        }
      );

      clearInterval(messageInterval);

      if (response.data.files && response.data.preSelectedFiles) {
        setFiles(response.data.files);
        setPreSelectedFiles(response.data.preSelectedFiles);
      }
    } catch (error) {
      console.error("Failed to fetch repository tree:", error);
    } finally {
      setLoading(false);
      setLoadingMessages([]);
      setCurrentMessageIndex(0);
    }
  };

  const handleFileSelection = async ({ selectedFiles: newSelectedFiles, projectContext }: FileSelectionParams) => {
    const selectedFileItems = files.filter(file => newSelectedFiles.includes(file.path));
    setSelectedFiles(selectedFileItems);

    try {
      setLoading(true);
      const token = localStorage.getItem("githubToken") || "";
      const userId = localStorage.getItem("userId");
      const encodedRepoUrl = encodeURIComponent(repoUrl);

      await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/github/generate-readme`,
        {
          repoUrl: encodedRepoUrl,
          selectedFiles: newSelectedFiles,
          projectContext,
          userId
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'user-id': userId
          },
          withCredentials: true,
          onDownloadProgress: (progressEvent) => {
            const content = progressEvent.event.target.responseText;
            const lines = content.split('\n').filter(Boolean);

            lines.forEach((line: string) => {
              try {
                const update = JSON.parse(line);
                if (update.status === 'complete') {
                  setTimeout(() => {
                    setMarkdown(update.readme);
                    setFullMarkdown(update.readme);
                    localStorage.setItem('currentReadmeId', update.readmeId);
                    const extractedSections = extractSections(update.readme);
                    setSections(extractedSections);
                    if (extractedSections.length > 0) {
                      setActiveSection(extractedSections[0]);
                      setActiveSectionContent(extractedSections[0].content);
                    }
                    setShowFileTree(false);
                    setLoading(false);
                  }, 200);
                } else if (update.status === 'error') {
                  throw new Error(update.message);
                } else {
                  setLoadingMessages([update.message]);
                  if (update.tokenCount) {
                    setTokenCount(update.tokenCount);
                  }
                }
              } catch (e) {
                console.error('Error parsing update:', e);
              }
            });
          },
        }
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 429) {
          const errorMessage = error.response.data.error;
          toast({
            title: "Limit Reached",
            description: errorMessage,
            variant: "destructive"
          });

          if (errorMessage.includes("Weekly README generation limit reached")) {
            onLimitReached();
          }
          return;
        }
      }
      console.error('Error generating README:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (repoUrl) {
      fetchRepositoryTree();
    }
  }, [repoUrl]);

  useEffect(() => {
    if (markdown && !sections.length) {
      const extractedSections = extractSections(markdown);
      setSections(extractedSections);
      setFullMarkdown(markdown);
      if (extractedSections.length > 0) {
        setActiveSection(extractedSections[0]);
        setActiveSectionContent(extractedSections[0].content);
      }
    }
  }, [markdown, sections.length]);

  const handleSvgExport = (svgString: string) => {
    const imageMarkdown = `\n<div align="center">\n${svgString}\n</div>\n`;
    const newMarkdown = activeSectionContent + imageMarkdown;
    handleMarkdownChange(newMarkdown);
  };

  useEffect(() => {
    if (activeSection && editorRef.current) {
      const text = editorRef.current.getValue();
      const lines = text.split('\n');
      const sectionStart = lines.findIndex(line =>
        line.includes(`${'#'.repeat(activeSection.level)} ${activeSection.title}`)
      );

      if (sectionStart !== -1) {
        editorRef.current.revealLineInCenter(sectionStart + 1);
      }
    }
  }, [activeSection]);


  return (
    <DirectoryProvider>
      <div className="h-full flex flex-col">
        {loading && (
          <LoadingIndicator
            messages={loadingMessages}
            currentIndex={currentMessageIndex}
            tokenCount={tokenCount}
            isComplete={isComplete}
          />
        )}

        {showFileTree && (
          <div className="grid-pattern absolute inset-0 pointer-events-none" />
        )}
        {/* TODO (KEEP NO MATTER WHAT): THIS IS A BODGE. I'm supposed to move file-tree to page.tsx so it's not inside the isEditorView boolean that lets grid-pattern dissappear*/}

        {showFileTree ? (
          <div className="flex-1 flex justify-center items-center p-4 overflow-auto">
            <FileTree
              files={files}
              preCheckedFiles={preSelectedFiles}
              onNext={handleFileSelection} // This will now work since types match
              onClose={() => setShowFileTree(false)}
              repoUrl={repoUrl}
            />
          </div>
        ) : (
          <div className="flex flex-1 overflow-hidden">
            <div className="w-[20%] overflow-auto bg-card border-r border-border
            [&::-webkit-scrollbar]:w-[0px]"
            >
              <SectionsColumn
                sections={sections}
                activeSection={activeSection}
                onSectionSelect={handleSectionSelect}
                onSectionsChange={handleSectionsChange}
                repoUrl={repoUrl}
                currentMarkdown={fullMarkdown}
                selectedFiles={selectedFiles}
                userId={userId}
                showExcalidraw={showExcalidraw}
                setShowExcalidraw={setShowExcalidraw}
              />
            </div>
            <div className="w-[40%] h-full overflow-hidden border-r border-border">
              <div className="h-[100%] min-h-0 border-border overflow-hidden">
                <MarkdownEditor
                  value={activeSectionContent}
                  onChange={handleMarkdownChange}
                  editorRef={editorRef}
                  repoUrl={repoUrl}
                />
              </div>
              {/* <div className="h-[40%] min-h-0 overflow-hidden">
              </div> */}
            </div>
            <div className="w-[40%] h-full flex flex-col overflow-hidden">
              <div className={cn(
                "transition-[height] duration-200 ease-in-out overflow-hidden",
                showExcalidraw ? "h-[60%] border-b border-border" : "h-full border-none"
              )}>
                <MarkdownViewer markdown={fullMarkdown} repoUrl={repoUrl} />
              </div>
              {showExcalidraw && (
                <div className="h-[40%] min-h-0 overflow-hidden">
                  <Excalidraw
                    onExport={handleSvgExport}
                    repoUrl={repoUrl}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DirectoryProvider>

  );
}
