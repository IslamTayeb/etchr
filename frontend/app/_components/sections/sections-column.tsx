import React, { useCallback, useEffect, useState } from "react"
import { SectionFilter } from "./section-filter"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { PlusCircle, BookOpen, FolderUp } from 'lucide-react'
import axios from "axios"
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import SortableItem from './sortable-item'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { supabase } from "@/lib/supabase"
import { toast } from "@/hooks/use-toast"
import { DirectorySelector } from "../editing/folder-selection"
import { useDirectory } from "../editing/directory-context"

export interface SectionData {
  id: string;
  level: number; // 1 for #, 2 for ##, etc.
  title: string;
  content: string;
  order: number;
}

interface FileData {
  path: string;
  sha: string;
}

interface SectionsColumnProps {
  sections: SectionData[];
  activeSection: SectionData | null;
  onSectionSelect: (section: SectionData) => void;
  onSectionsChange: (sections: SectionData[], updatedMarkdown?: string) => void;
  repoUrl: string;
  currentMarkdown: string;
  selectedFiles: FileData[];
  userId: string | null;
  showExcalidraw: boolean;
  setShowExcalidraw: (show: boolean) => void;
}

interface FileTreeItem {
  path: string;
  mode: string;
  type: "tree" | "blob";
  sha: string;
  size?: number;
  url: string;
}

export const templateSections = [
  { name: 'Features', description: 'List of key features and capabilities' },
  { name: 'Installation', description: 'Step-by-step installation guide' },
  { name: 'Configuration', description: 'Configuration options and setup' },
  { name: 'API Documentation', description: 'API endpoints and usage' },
  { name: 'Contributing', description: 'Guidelines for contributors' },
  { name: 'Testing', description: 'Testing procedures and frameworks' },
  { name: 'Security', description: 'Security features and considerations' },
  { name: 'Troubleshooting', description: 'Common issues and solutions' },
]

export function SectionsColumn({
  sections,
  activeSection,
  onSectionSelect,
  onSectionsChange,
  repoUrl,
  currentMarkdown,
  selectedFiles,
  showExcalidraw,
  setShowExcalidraw,
}: SectionsColumnProps) {
  const [searchFilter, setSearchFilter] = useState('')
  const [newSectionTitle, setNewSectionTitle] = useState('')
  const [newSectionDescription, setNewSectionDescription] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [level, setLevel] = useState('2')
  const [useAI, setUseAI] = useState(true);
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [files, setFiles] = useState<FileTreeItem[]>([]);
  const { setSelectedDirectory } = useDirectory();


  const fetchRepositoryTree = useCallback(async () => {
    try {
      const token = localStorage.getItem("githubToken");
      const encodedRepoUrl = encodeURIComponent(repoUrl);
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/github/fetch-tree?repoUrl=${encodedRepoUrl}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setFiles(response.data.files);
    } catch (error) {
      console.error("Failed to fetch repository tree:", error);
    }
  }, [repoUrl]);

  useEffect(() => {
    if (showFolderDialog) {
      fetchRepositoryTree();
    }
  }, [showFolderDialog, fetchRepositoryTree]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // const convertIpynbToMarkdown = (content: string, truncateOutputs: boolean = true): string => {
  //   try {
  //     const notebook = JSON.parse(content);
  //     let markdown = '';

  //     if (notebook.cells) {
  //       for (const cell of notebook.cells) {
  //         if (cell.cell_type === 'markdown') {
  //           markdown += cell.source.join('') + '\n\n';
  //         }
  //         else if (cell.cell_type === 'code') {
  //           markdown += '```python\n' + cell.source.join('') + '\n```\n\n';
  //           if (cell.outputs && cell.outputs.length > 0) {
  //             markdown += 'Output:\n```\n';
  //             for (const output of cell.outputs) {
  //               if (output.output_type === 'stream' && output.text) {
  //                 const text = output.text.join('');
  //                 if (truncateOutputs) {
  //                   const lines = text.split('\n').slice(0, 2);
  //                   markdown += lines.join('\n');
  //                   if (text.split('\n').length > 2) {
  //                     markdown += '\n... [output truncated]\n';
  //                   }
  //                 }
  //               }
  //             }
  //             markdown += '\n```\n\n';
  //           }
  //         }
  //       }
  //     }
  //     return markdown;
  //   } catch (err) {
  //     console.error('Failed to convert .ipynb file:', err);
  //     return '';
  //   }
  // };

  const fetchFileContent = async (owner: string, repo: string, fileSha: string, githubToken: string): Promise<string> => {
    const url = `https://api.github.com/repos/${owner}/${repo}/git/blobs/${fileSha}`;

    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: 'application/vnd.github.v3.raw'
      },
      responseType: 'arraybuffer'
    });

    const content = Buffer.from(response.data).toString('utf-8');

    if (content.includes('"nbformat"') || content.includes('"cells"')) {
      try {
        const notebook = JSON.parse(content);
        if (!notebook.cells) return content;

        let markdown = '';
        for (const cell of notebook.cells) {
          if (cell.cell_type === 'markdown') {
            markdown += Array.isArray(cell.source) ? cell.source.join('') : cell.source;
            markdown += '\n\n';
          } else if (cell.cell_type === 'code') {
            markdown += '```python\n';
            markdown += Array.isArray(cell.source) ? cell.source.join('') : cell.source;
            markdown += '\n```\n\n';

            if (cell.outputs?.length) {
              markdown += 'Output:\n```\n';
              for (const output of cell.outputs) {
                if (output.output_type === 'stream' && output.text) {
                  const text = Array.isArray(output.text) ? output.text.join('') : output.text;
                  const lines = text.split('\n');
                  markdown += lines.slice(0, 2).join('\n');
                  if (lines.length > 2) markdown += '\n... [output truncated]\n';
                } else if (output.output_type === 'execute_result' && output.data && output.data['text/plain']) {
                  const text = Array.isArray(output.data['text/plain']) ?
                    output.data['text/plain'].join('') : output.data['text/plain'];
                  const lines = text.split('\n');
                  markdown += lines.slice(0, 2).join('\n');
                  if (lines.length > 2) markdown += '\n... [output truncated]\n';
                }
              }
              markdown += '\n```\n\n';
            }
          }
        }
        return markdown;
      } catch (err) {
        console.error('Failed to parse notebook:', err);
        return content;
      }
    }

    return content;
  };

  const mergeSections = (sections: SectionData[]): string => {
    return sections
      .sort((a, b) => a.order - b.order)
      .map(section => `${'#'.repeat(section.level)} ${section.title}\n${section.content}`)
      .join('\n\n');
  };

  // In SectionsColumn component
  // const handleRenameSection = (section: SectionData, newName: string, newLevel: number) => {
  //   const updatedSections = sections.map(s => {
  //     if (s.id === section.id) {
  //       // Create proper section with header line
  //       const newContent = s.content.split('\n').slice(1).join('\n'); // Remove old header
  //       return {
  //         ...s,
  //         level: newLevel,
  //         title: newName,
  //         content: `${'#'.repeat(newLevel)} ${newName}\n${newContent}`,
  //         id: `section-${newName.toLowerCase().replace(/[^\w]+/g, '-')}`,
  //       };
  //     }
  //     return s;
  //   });

  //   onSectionsChange(updatedSections);
  //   // Also select the renamed section
  //   const renamedSection = updatedSections.find(s => s.title === newName);
  //   if (renamedSection) {
  //     onSectionSelect(renamedSection);
  //   }
  // };

  const handleRenameSection = (section: SectionData, newName: string, newLevel: number) => {
    const updatedSections = sections.map(s => {
      if (s.id === section.id) {
        const contentLines = s.content.split('\n');
        // Skip the first line if it's a header
        const contentWithoutHeader = contentLines.filter(line => !line.match(/^#{1,3}\s+/)).join('\n');

        return {
          ...s,
          level: newLevel,
          title: newName,
          content: contentWithoutHeader,
          id: `section-${newName.toLowerCase().replace(/[^\w]+/g, '-')}`,
        };
      }
      return s;
    });

    onSectionsChange(updatedSections);
    const renamedSection = updatedSections.find(s => s.title === newName);
    if (renamedSection) {
      onSectionSelect(renamedSection);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sections.findIndex(section => section.id === active.id);
    const newIndex = sections.findIndex(section => section.id === over.id);

    const newSections = arrayMove(sections, oldIndex, newIndex).map((section, idx) => ({
      ...section,
      order: idx
    }));

    const newMarkdown = mergeSections(newSections);
    onSectionsChange(newSections, newMarkdown);
    onSectionSelect(newSections[newIndex]); // Auto-select dropped section
  };

  const onDeleteSection = (sectionSlug: string) => {
    const newSections = sections.filter(s => s.id !== sectionSlug);
    onSectionsChange(newSections);
    if (newSections.length > 0) {
      onSectionSelect(newSections[0]);
    }
  };


  const handleGenerateNewSection = async () => {
    if (!newSectionTitle.trim()) return;
    setIsGenerating(true);

    try {

      const token = localStorage.getItem("githubToken") || "";
      const readmeId = localStorage.getItem('currentReadmeId');
      const userId = localStorage.getItem("userId");

      if (!useAI) {
        const newSection = {
          id: `section-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          level: parseInt(level),
          title: newSectionTitle,
          content: '',  // Empty content for manual sections
          order: sections.length
        };

        onSectionsChange([...sections, newSection]);
        onSectionSelect(newSection);
        setNewSectionTitle('');
        setIsGenerating(false);
        return;
      }

      if (!readmeId) {
        console.error('No readme ID found');
        return;
      }

      const { data: readmeGen } = await supabase
        .from('readme_generations')
        .select()
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      let codebaseContent = '';


      if (useAI) {
        console.log("Fetching codebase content for AI...");
        const [owner, repo] = repoUrl.replace("https://github.com/", "").split("/");

        for (const file of selectedFiles) {
          try {
            const fileContent = await fetchFileContent(owner, repo, file.sha, token);
            codebaseContent += `=== File: ${file.path} ===\n${fileContent}\n\n`;
          } catch (err) {
            console.error(`Failed to fetch content for ${file.path}:`, err);
          }
        }

        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/sections/generate-section`,
          {
            title: newSectionTitle,
            level: parseInt(level),
            description: newSectionDescription,
            repoUrl,
            currentMarkdown,
            codebaseContent: useAI ? codebaseContent : '',
            useAI,
            readmeId
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'user-id': userId
            }
          }
        );

        if (response.status !== 200) {
          if (response.status === 429) {
            toast({
              title: "Section Limit Reached",
              description: response.data.error,
              variant: "destructive"
            });
            return;
          }
          throw new Error('Failed to generate section.');
        }

        await supabase
          .from('section_generations')
          .insert([{
            readme_id: readmeGen?.id,
            user_id: userId
          }]);

        if (response?.data?.section) {
          const newContent = response.data.section;
          const contentWithHeader = newContent.trim();

          const newSection = {
            id: `section-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            level: parseInt(level),
            title: newSectionTitle,
            content: contentWithHeader,
            order: sections.length
          };

          const updatedSections = [...sections, newSection];
          onSectionsChange(updatedSections);
          onSectionSelect(newSection);
        }
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        toast({
          title: "Section Limit Reached",
          description: error.response.data.error,
          variant: "destructive"
        });
        return;
      }
      console.error('Failed to generate section:', error);
    } finally {
      setIsGenerating(false);
    }
  };


  // In frontend/app/_components/sections/sections-column.tsx

  const handleAddTemplateSection = async (template: typeof templateSections[0]) => {
    setIsGenerating(true);
    try {
      const token = localStorage.getItem("githubToken") || "";
      const readmeId = localStorage.getItem('currentReadmeId');
      const userId = localStorage.getItem("userId");

      const { data: readmeGen } = await supabase
        .from('readme_generations')
        .select()
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const [owner, repo] = repoUrl.replace("https://github.com/", "").split("/");
      let codebaseContent = '';

      console.log("Fetching codebase content for template section...");
      for (const file of selectedFiles) {
        try {
          const fileContent = await fetchFileContent(owner, repo, file.sha, token);
          codebaseContent += `=== File: ${file.path} ===\n${fileContent}\n\n`;
        } catch (err) {
          console.error(`Failed to fetch content for ${file.path}:`, err);
        }
      }

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/sections/generate-template-section`,
        {
          template: template.name,
          repoUrl,
          currentMarkdown,
          codebaseContent,
          readmeId
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'user-id': userId
          },
          withCredentials: true
        }
      );

      await supabase
        .from('section_generations')
        .insert([{
          readme_id: readmeGen?.id,
          user_id: userId
        }]);

      if (response?.data?.section) {
        const newSection: SectionData = {
          id: `section-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          level: 2,
          title: template.name,
          content: response.data.section.trim(),
          order: sections.length
        };
        onSectionsChange([...sections, newSection]);
        onSectionSelect(newSection);
      }
    } catch (error) {
      console.error('Failed to generate template section:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const filteredSections = sections.filter(section =>
    section.title.toLowerCase().includes(searchFilter.toLowerCase())
  )

  const availableTemplates = templateSections.filter(template => {
    // Convert template name to lowercase for case-insensitive comparison
    const templateName = template.name.toLowerCase();

    // Check if this template's name appears in any section's name
    return !sections.some(section =>
      // Convert section name to lowercase and check if it includes the template name
      section.title.toLowerCase().includes(templateName)
    );
  });

  return (
    <div className="flex flex-col w-full overflow-x-hidden">
      {/* <div className="flex-none overflow-y-hidden text-xl font-bold p-4 text-foreground bg-card border-b ">
        <h3 className="">Sections</h3>
      </div> */}

      <div className="p-3 py-4 space-y-4 overflow-auto">
        <h4 className="text-sm font-medium text-muted-foreground mb-4">
          Document Sections
        </h4>
        <SectionFilter
          searchFilter={searchFilter}
          setSearchFilter={setSearchFilter}
        />
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToVerticalAxis]} // ← Restricts dragging to vertical axis
        >
          <SortableContext
            items={filteredSections.map(section => section.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="space-y-1.5 relative">
              {filteredSections.map((section) => (
                <SortableItem
                  key={section.id}
                  section={section}
                  isActive={activeSection?.id === section.id}
                  onSelect={() => onSectionSelect(section)}
                  onDelete={() => onDeleteSection(section.id)}
                  onRename={(newName, newLevel) => handleRenameSection(section, newName, newLevel ?? 2)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>

        <Separator />

        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-4">
            Create Custom Section
          </h4>
          <div className="space-y-2">
            <Input
              placeholder="Section title"
              value={newSectionTitle}
              onChange={(e) => setNewSectionTitle(e.target.value)}
            />
            <div className="flex items-center gap-3 mb-2">
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select heading level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Level 1 (#)</SelectItem>
                  <SelectItem value="2">Level 2 (##)</SelectItem>
                  <SelectItem value="3">Level 3 (###)</SelectItem>
                </SelectContent>
              </Select>
              <TooltipProvider delayDuration={20}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="ai-toggle"
                        checked={useAI}
                        onCheckedChange={setUseAI}
                        className=""
                      />
                      <Label htmlFor="ai-toggle">
                        <span className="font-semibold">AI</span>
                      </Label>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="mb-1.5">
                    <p>Uses your repository&apos;s context</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {useAI && (
              <Textarea
                placeholder="Description (optional)"
                value={newSectionDescription}
                rows={3}
                onChange={(e) => setNewSectionDescription(e.target.value)}
              />
            )}
            <Button
              className="w-full"
              onClick={handleGenerateNewSection}
              disabled={isGenerating || !newSectionTitle.trim()}
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              {isGenerating ? (
                <span className="truncate">Generating...</span>
              ) : (
                <span className="truncate">Generate Section</span>
              )}
            </Button>
          </div>
        </div>

        {availableTemplates.length > 0 && (
          <>
            <Separator className="" />
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-4">
                Template Sections
              </h4>
              <div className="space-y-1.5">
                {availableTemplates.map((template) => (
                  <Button
                    key={template.name}
                    variant="secondary"
                    className="w-full justify-start h-auto py-2"
                    onClick={() => handleAddTemplateSection(template)}
                    disabled={isGenerating}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <BookOpen className="h-4 w-4 flex-none" />
                      <div className="flex-1 min-w-0 text-left">
                        <div className="font-medium truncate">{template.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {template.description}
                        </div>
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          </>
        )}
        <Separator className="mt-4" />
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-4 mt-4">
            Workspace Settings
          </h4>
          <div className="space-y-3.5">
            <TooltipProvider>
              <Tooltip delayDuration={20}>
                <TooltipTrigger asChild>
                  <Button
                    variant="secondary"
                    className="h-9 px-3 w-full"
                    onClick={() => setShowFolderDialog(true)}
                  >
                    <FolderUp />
                    <p>Export Folder</p>
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="mb-3.5">
                  <p>Where should uploaded images and files go?</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <div className="flex items-center justify-between">
              <Label htmlFor="excalidraw-toggle" className="text-sm">
                Show Excalidraw
              </Label>
              <Switch
                id="excalidraw-toggle"
                checked={showExcalidraw}
                onCheckedChange={(checked) => {
                  setShowExcalidraw(checked);
                  localStorage.setItem('showExcalidraw', checked.toString());
                }}
              />
            </div>
          </div>
        </div>

      </div>
      <DirectorySelector
        repoUrl={repoUrl}
        open={showFolderDialog}
        onOpenChange={setShowFolderDialog}
        files={files}
        onSelect={(path: string) => {
          setSelectedDirectory(path);
          setShowFolderDialog(false);
        }}
      />
    </div>
  )
}
