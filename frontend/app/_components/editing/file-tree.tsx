"use client";

import * as React from "react";
import { ChevronRight, Folder, Info, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { countFileTokens } from '@/lib/token-counter';
import { toast } from "@/hooks/use-toast";
import axios from "axios";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Constants
const MAX_FILES = 30;
const MAX_TOKENS = 65000;

const ignoredExtensions = [
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.mp4', '.avi', '.mkv', '.mov', '.webm', '.wmv', '.mp3', '.wav', '.flac', '.log', '.zip', '.gz', '.tar', '.7z', '.rar', '.ico', '.pdf', '.woff', '.yaml', '.tar.gz', '.pyc', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.psd', '.ai', '.indd', '.otf', '.ttf', '.woff'
];

const ignoredDirectories = [
  'node_modules/', 'venv/', 'env/', '.vscode/', '.env', '.python-version', '.venv', 'lock', 'package-lock.json', 'resume', 'fonts/', 'font/', 'icon/', 'icons/', '__pycache__/'
];

const lockedExtensions = [
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.mp4',
  '.avi', '.mkv', '.mov', '.webm', '.wmv', '.mp3', '.wav',
  '.flac', '.woff', '.ico', 'package-lock.json', '.pdf',
  '.zip', '.gz', '.tar', '.7z', '.rar', '.yaml', '.tar.gz', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.psd', '.ai', '.indd', '.otf', '.ttf', '.woff'
];

const lockedDirectories = [
  'node_modules/', 'fonts/', 'font/', '__pycache__/', 'venv/', 'env/',
];

const maxFileSize = 1000000;

// Types
interface FileTreeItem {
  path: string;
  mode: string;
  type: string;
  sha: string;
  size?: number;
  url: string;
}

interface FileSelectionParams {
  selectedFiles: string[];
  selectedDirectories: string[];
  projectContext: string;
}

interface FileTreeProps {
  files: FileTreeItem[];
  onNext: (params: FileSelectionParams) => void;
  preCheckedFiles?: string[];
  onClose: () => void;
  autoCollapse?: boolean;
  onTokenCountChange?: (count: number) => void;
  repoUrl: string;
}

interface TreeNode {
  isFile: boolean;
  type: string;
  path: string;
  children: Record<string, TreeNode>;
}

const createFileTree = (files: FileTreeItem[]): Record<string, TreeNode> => {
  // Filter out files in locked directories first
  files = files.filter(file => {
    return !lockedDirectories.some(dir => {
      const filePathParts = file.path.split('/');
      return filePathParts[0] === dir.replace('/', '');
    });
  });

  // files = files.filter(file => !lockedExtensions.some(ext => file.path.endsWith(ext)));

  const root: Record<string, TreeNode> = {};

  // Handle directories
  files.filter(file => file.type === "tree").forEach(file => {
    const parts = file.path.split("/");
    let current = root;
    parts.forEach((part, index) => {
      if (!current[part]) {
        current[part] = {
          isFile: false,
          type: "tree",
          path: parts.slice(0, index + 1).join("/"),
          children: {},
        };
      }
      current = current[part].children;
    });
  });

  // Handle files
  files.filter(file => file.type === "blob").forEach(file => {
    const parts = file.path.split("/");
    let current = root;

    if (parts.length === 1) {
      current[parts[0]] = {
        isFile: true,
        type: file.type,
        path: file.path,
        children: {},
      };
      return;
    }

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === parts.length - 1) {
        current[part] = {
          isFile: true,
          type: file.type,
          path: file.path,
          children: {},
        };
      } else {
        if (!current[part]) {
          current[part] = {
            isFile: false,
            type: "tree",
            path: parts.slice(0, i + 1).join("/"),
            children: {},
          };
        }
        current = current[part].children;
      }
    }
  });

  return root;
};

export function FileTree({ files, onNext, preCheckedFiles = [], onClose, repoUrl }: FileTreeProps) {
  const [selectedFiles, setSelectedFiles] = React.useState<Set<string>>(
    () => new Set(preCheckedFiles)
  );
  const [expandedFolders, setExpandedFolders] = React.useState<Set<string>>(() => {
    if (preCheckedFiles.length === 0) return new Set();
    const expanded = new Set<string>();
    preCheckedFiles.forEach((filePath) => {
      const parts = filePath.split("/");
      let currentPath = "";
      for (let i = 0; i < parts.length - 1; i++) {
        currentPath += (currentPath ? "/" : "") + parts[i];
        expanded.add(currentPath);
      }
    });
    return expanded;
  });
  const [searchTerm, setSearchTerm] = React.useState("");
  const [isClosing, setIsClosing] = React.useState(false);
  const [projectContext, setProjectContext] = React.useState("");
  const [isContextDialogOpen, setIsContextDialogOpen] = React.useState(false);
  const [tokenCounts] = React.useState<Record<string, number>>({});

  const [fileTokens, setFileTokens] = React.useState<Record<string, number>>({});
  // Selected file tokens for the warning
  const totalSelectedTokens = React.useMemo(() => {
    return Array.from(selectedFiles).reduce((sum, path) => sum + (fileTokens[path] || 0), 0);
  }, [selectedFiles, fileTokens]);

  const [owner, repo] = React.useMemo(() => repoUrl.replace("https://github.com/", "").split("/"), [repoUrl]);
  const githubToken = React.useMemo(() => (typeof window !== "undefined" ? localStorage.getItem("githubToken") || "" : ""), []);

  const fileTree = React.useMemo(() => createFileTree(files), [files]);

  const totalTokens = React.useMemo(() =>
    Object.values(tokenCounts).reduce((sum, count) => sum + count, 0),
    [tokenCounts]
  );

  // Helper functions

  const filterTree = React.useCallback((node: TreeNode, term: string): boolean => {
    if (node.isFile) return node.path.toLowerCase().includes(term.toLowerCase());
    return Object.values(node.children).some(child => filterTree(child, term));
  }, []);

  const getNodeState = React.useCallback(
    (node: TreeNode): "checked" | "unchecked" | "indeterminate" => {
      if (node.isFile) {
        return selectedFiles.has(node.path) ? "checked" : "unchecked";
      }

      const selectableChildren = Object.values(node.children).filter(child => !isNodeLocked(child));
      const childStates = selectableChildren.map(getNodeState);

      if (selectableChildren.length === 0) return "unchecked";

      const hasChecked = childStates.includes("checked");
      const hasUnchecked = childStates.includes("unchecked");
      const hasIndeterminate = childStates.includes("indeterminate");

      if (hasIndeterminate) return "indeterminate";
      if (hasChecked && hasUnchecked) return "indeterminate";
      if (hasChecked) return "checked";
      return "unchecked";
    },
    [selectedFiles]
  );

  const handleCheckboxChange = async (node: TreeNode, checked: boolean, event?: React.MouseEvent) => {
    const newSelection = new Set(selectedFiles);
    const nodeState = getNodeState(node);
    const isRightClick = event?.button === 2;

    const updateSelection = async (n: TreeNode) => {
      if (isNodeLocked(n)) return;

      if (!n.isFile && nodeState === "indeterminate" && isRightClick) {
        const deselectRecursive = (node: TreeNode) => {
          if (node.isFile) {
            newSelection.delete(node.path);
          } else {
            Object.values(node.children).forEach(child => deselectRecursive(child));
          }
        };
        deselectRecursive(n);
        return;
      }

      if (n.isFile) {
        if (checked) {
          const fileItem = files.find((f) => f.path === n.path);
          if (fileItem && (fileItem.size ?? 0) <= maxFileSize) {
            try {
              let content = await fetchFileContent(owner, repo, fileItem.sha, githubToken);

              // Handle ipynb files
              if (fileItem.path.endsWith('.ipynb')) {
                const notebookContent = typeof content === 'string' ? JSON.parse(content) : content;
                content = convertIpynbToMarkdown(notebookContent);
              }

              // Only count tokens if content is string
              if (typeof content === 'string') {
                const countVal = await countFileTokens(content);
                newSelection.add(n.path);
                setFileTokens((prev) => ({ ...prev, [fileItem.path]: countVal }));
              }
            } catch (err) {
              console.error(`Error processing ${fileItem.path}:`, err);
            }
          }
        } else {
          newSelection.delete(n.path);
        }
      } else {
        for (const child of Object.values(n.children)) {
          await updateSelection(child);
        }
      }
    };

    updateSelection(node).then(() => setSelectedFiles(newSelection));
  };

  const preProcessTokens = async () => {
    const selectedFilesArray = Array.from(selectedFiles);

    // Priority 1: Selected files
    for (const filePath of selectedFilesArray) {
      const fileItem = files.find((f) => f.path === filePath);
      if (fileItem && (fileItem.size ?? 0) <= maxFileSize) {
        try {
          const content = await fetchFileContent(owner, repo, fileItem.sha, githubToken);
          const countVal = await countFileTokens(content);
          setFileTokens((prev) => ({ ...prev, [fileItem.path]: countVal }));
        } catch (err) {
          console.error(`Error counting tokens for ${fileItem.path}:`, err);
        }
      }
    }

    // Priority 2: Non-ignored files
    for (const file of files) {
      if (!selectedFilesArray.includes(file.path)) {
        const isIgnored = ignoredExtensions.some(ext => file.path.endsWith(ext)) ||
          ignoredDirectories.some(dir => file.path.includes(dir));

        if (!isIgnored && (file.size ?? 0) <= maxFileSize) {
          try {
            const content = await fetchFileContent(owner, repo, file.sha, githubToken);
            const countVal = await countFileTokens(content);
            setFileTokens((prev) => ({ ...prev, [file.path]: countVal }));
          } catch (err) {
            console.error(`Error counting tokens for ${file.path}:`, err);
          }
        }
      }
    }
  };

  React.useEffect(() => {
    preProcessTokens();
  }, [files, owner, repo, githubToken]);

  const toggleFolder = React.useCallback(
    (path: string) => {
      const newExpanded = new Set(expandedFolders);
      if (newExpanded.has(path)) {
        newExpanded.delete(path);
      } else {
        newExpanded.add(path);
      }
      setExpandedFolders(newExpanded);
    },
    [expandedFolders]
  );

  const handleNext = () => {
    if (totalSelectedTokens > MAX_TOKENS) {
      toast({
        title: "Token limit exceeded",
        description: `You have selected ${totalSelectedTokens.toLocaleString()} tokens, which exceeds the limit of ${MAX_TOKENS.toLocaleString()} tokens.`,
        variant: "destructive"
      });
      return;
    }

    setIsClosing(true);
    setTimeout(() => {
      const selectedFilesList = Array.from(selectedFiles).filter((path) => {
        const node = files.find((file) => file.path === path);
        return node && node.type === "blob";
      });
      const selectedDirectories = Array.from(selectedFiles).filter((path) => {
        const node = files.find((file) => file.path === path);
        return node && node.type !== "blob";
      });
      onNext({
        selectedFiles: selectedFilesList,
        selectedDirectories,
        projectContext
      });
      onClose();
    }, 300);
  };

  // Effects
  React.useEffect(() => {
    const fetchTokensForPreSelectedFiles = async () => {
      const newTokens: Record<string, number> = {};
      for (const filePath of preCheckedFiles) {
        const fileItem = files.find((f) => f.path === filePath);
        if (fileItem) {
          try {
            const content = await fetchFileContent(owner, repo, fileItem.sha, githubToken);
            const countVal = await countFileTokens(content);
            newTokens[filePath] = countVal;
          } catch (err) {
            console.error(`Error counting tokens for ${filePath}:`, err);
          }
        }
      }
      setFileTokens((prev) => ({ ...prev, ...newTokens }));
    };

    fetchTokensForPreSelectedFiles();
  }, [preCheckedFiles, files, owner, repo, githubToken]);

  React.useEffect(() => {
    if (totalTokens > 65000) {
      toast({
        title: "Token limit warning",
        description: "Selected files exceed 65,000 tokens. Some content may be truncated.",
        variant: "destructive"
      });
    }
  }, [totalTokens]);

  // Search effect
  React.useEffect(() => {
    if (!searchTerm) return;
    const expandMatchingFolders = (node: TreeNode) => {
      if (node.isFile) return node.path.toLowerCase().includes(searchTerm.toLowerCase());
      const shouldExpand = Object.values(node.children).some(child => expandMatchingFolders(child));
      if (shouldExpand) setExpandedFolders(prev => new Set(prev).add(node.path));
      return shouldExpand;
    };
    Object.values(fileTree).forEach(expandMatchingFolders);
  }, [searchTerm, fileTree]);

  const calculateDirectoryTokens = (node: TreeNode): number => {
    if (node.isFile) {
      return selectedFiles.has(node.path) ? fileTokens[node.path] || 0 : 0;
    }
    return Object.values(node.children).reduce((sum, child) => sum + calculateDirectoryTokens(child), 0);
  };

  function isNodeLocked(node: TreeNode) {
    const lastPart = node.path.split('/').pop() || "";
    return lockedExtensions.some(ext => node.path.endsWith(ext))
      || lockedDirectories.some(dir => node.path.includes(dir))
      || lockedDirectories.some(dir => lastPart === dir.replace('/', ''));
  }

  // Tree rendering logic
  const renderTreeNode = React.useCallback(
    (node: TreeNode, name: string) => {
      if (searchTerm && !filterTree(node, searchTerm)) return null;
      const isFolder = !node.isFile;
      const isExpanded = expandedFolders.has(node.path);
      const nodeState = getNodeState(node);
      const directoryTokens = isFolder ? calculateDirectoryTokens(node) : 0;

      const isLocked = lockedExtensions.some(ext => node.path.endsWith(ext))
        || lockedDirectories.some(dir => node.path.includes(dir))
        || lockedDirectories.some(dir => {
          const lastPart = node.path.split('/').pop() || "";
          return lastPart === dir.replace('/', '');
        });
      const isIgnored = !isLocked && (
        ignoredExtensions.some(ext => node.path.endsWith(ext)) ||
        ignoredDirectories.some(dir => node.path.includes(dir))
      );

      return (
        <motion.div
          key={node.path}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          <div className={cn(
            "flex items-center gap-2 py-1 px-2 rounded-sm group hover:bg-secondary/40 ",
            isLocked && "opacity-50"
          )}>
            <div className="relative flex items-center justify-center ">

              <Checkbox
                checked={nodeState === "checked"}
                onCheckedChange={checked => !isLocked && handleCheckboxChange(node, checked === true)}
                disabled={isLocked}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (!isLocked) handleCheckboxChange(node, false, e);
                }}
                className={cn(
                  "rounded-sm border border-primary",
                  nodeState === "checked" && "bg-primary text-primary-foreground",
                  nodeState === "indeterminate" && "bg-transparent",
                  isLocked && "cursor-not-allowed opacity-50"
                )}
              />
              {nodeState === "indeterminate" && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="h-0.5 w-2/3 bg-primary rounded-full" />
                </div>
              )}
            </div>
            {isFolder ? (
              <button onClick={() => toggleFolder(node.path)} className="flex flex-1 items-center gap-2 text-sm max-w-2xl truncate">
                <motion.div animate={{ rotate: isExpanded ? 90 : 0 }}>
                  <ChevronRight className="h-4 w-4 shrink-0" />
                </motion.div>
                <Folder className="h-4 w-4 shrink-0 text-accent-foreground" />
                <span className={cn("truncate", isLocked && "text-muted-foreground")}>
                  {name}
                </span>
                <span className="ml-auto text-xs text-secondary-foreground/85">
                  {directoryTokens ? `${directoryTokens.toLocaleString()} tokens` : "–"}
                </span>
              </button>
            ) : (
              <button
                onClick={() => !isLocked && handleCheckboxChange(node, nodeState !== "checked")}
                className={cn("flex flex-1 items-center gap-2 text-sm max-w-2xl truncate", isLocked && "cursor-not-allowed")}
              >
                <span className={cn("truncate", isLocked && "text-muted-foreground")}>
                  {name}
                </span>
                <div className="ml-auto flex items-center gap-2 text-xs">
                  {isIgnored}
                  <span className={cn(
                    "text-muted-foreground",
                    // fileTokens[node.path] > 10000 && "text-destructive"
                  )}>
                    {fileTokens[node.path] !== undefined
                      ? `${fileTokens[node.path].toLocaleString()} tokens`
                      : "–"}
                  </span>
                </div>
              </button>
            )}
          </div>

          <AnimatePresence>
            {isFolder && isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="border-l ml-[15px] pl-[6px] mt-1"
              >
                {Object.entries(node.children).map(([childName, childNode]) =>
                  renderTreeNode(childNode, childName)
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      );
    },
    [expandedFolders, searchTerm, fileTokens, filterTree, getNodeState, handleCheckboxChange, toggleFolder]
  );

  // Selected files count
  const selectedCount = React.useMemo(() =>
    Array.from(selectedFiles).filter(path => {
      const node = files.find(file => file.path === path);
      return node && node.type === "blob";
    }).length,
    [selectedFiles, files]
  );

  // In frontend/app/_components/editing/file-tree.tsx

  // Add this helper function
  const convertIpynbToMarkdown = (content: string, truncateOutputs: boolean = true): string => {
    try {
      const notebook = JSON.parse(content);
      let markdown = '';

      if (notebook.cells) {
        for (const cell of notebook.cells) {
          if (cell.cell_type === 'markdown') {
            markdown += cell.source.join('') + '\n\n';
          }
          else if (cell.cell_type === 'code') {
            markdown += '```python\n' + cell.source.join('') + '\n```\n\n';
            if (cell.outputs && cell.outputs.length > 0) {
              markdown += 'Output:\n```\n';
              for (const output of cell.outputs) {
                if (output.output_type === 'stream' && output.text) {
                  const text = output.text.join('');
                  if (truncateOutputs) {
                    const lines = text.split('\n').slice(0, 2);
                    markdown += lines.join('\n');
                    if (text.split('\n').length > 2) {
                      markdown += '\n... [output truncated]\n';
                    }
                  }
                }
              }
              markdown += '\n```\n\n';
            }
          }
        }
      }
      return markdown;
    } catch (err) {
      console.error('Failed to convert .ipynb file:', err);
      return '';
    }
  };

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

  React.useEffect(() => {
    setSelectedFiles(new Set(preCheckedFiles));
  }, [preCheckedFiles]);

  // Render
  return (
    <AnimatePresence>
      {!isClosing && (
        <motion.div
          key="landing"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="w-full h-full flex items-center justify-center p-4"
        >
          <Card className="w-full max-w-2xl h-[80vh] flex flex-col border bg-card z-10">
            <div className="flex flex-row border-b w-full justify-between">
              <div className="flex-none p-4">
                <h2 className="font-semibold">Select Files for README</h2>
                <p className="text-sm text-muted-foreground">
                  Choose which files to include in the documentation
                </p>
              </div>
              <div className="content-center p-4 px-5">
                <TooltipProvider delayDuration={20}>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="mt-1.5 h-5 w-5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className=" bg-secondary border-border border w-64 p-2.5 my-1.5">
                      <p className="mb-1.5">
                        Prioritize files containing backend and frontend routes, pre-existing README.md files, coding and sample data files.
                      </p>
                      <p>
                        Don&apos;t include images, videos, and other binary files.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            <div className="flex-none p-4 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search files..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                    }
                  }}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="flex-1 min-h-0">
              <ScrollArea className="h-full">
                <div className="p-4 max-w-2xl">
                  {Object.entries(fileTree).map(([name, node]) =>
                    renderTreeNode(node, name)
                  )}
                </div>
              </ScrollArea>
            </div>

            <div className="flex-none p-4 border-t">
              <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground space-y-1">
                  {totalTokens > 0 && (
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "font-medium",
                        totalTokens > 65000 ? "text-destructive" : "text-primary"
                      )}>
                        {totalTokens.toLocaleString()} total tokens
                        {totalTokens > 65000 && (
                          <span className="text-destructive ml-2">
                            Warning: {(totalTokens - 65000).toLocaleString()} tokens over limit
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                  <div className="flex flex-col text-xs">
                    <div>
                      {selectedCount > MAX_FILES && (
                        <span className="text-destructive">
                          Warning: {selectedCount - MAX_FILES} files over limit
                        </span>
                      )}
                      {selectedCount <= MAX_FILES && (
                        <span>{MAX_FILES - selectedCount} files remaining</span>
                      )}
                    </div>
                    <div>
                      {totalSelectedTokens > MAX_TOKENS && (
                        <span className="text-destructive">
                          Warning: {(totalSelectedTokens - MAX_TOKENS).toLocaleString()} tokens over limit
                        </span>
                      )}
                      {totalSelectedTokens <= MAX_TOKENS && (
                        <span>{(MAX_TOKENS - totalSelectedTokens).toLocaleString()} tokens remaining</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex flex-col text-right">
                    <span className="text-xs text-muted-foreground">
                      {selectedCount} file{selectedCount !== 1 ? "s" : ""} selected
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {totalSelectedTokens.toLocaleString()} token{totalSelectedTokens !== 1 ? "s" : ""} selected
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setIsContextDialogOpen(true)}
                  >
                    Add Context
                  </Button>
                  <Button
                    onClick={handleNext}
                    disabled={selectedCount > MAX_FILES || totalSelectedTokens > MAX_TOKENS}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>

            <Dialog open={isContextDialogOpen} onOpenChange={setIsContextDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Project Context</DialogTitle>
                  <DialogDescription>
                    Provide additional context about your project to help generate better documentation.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Textarea
                    value={projectContext}
                    onChange={(e) => setProjectContext(e.target.value)}
                    placeholder="Example: This project was created for DataFest 2024. It's a data visualization tool that helps analyze climate change patterns..."
                    className="min-h-[150px]"
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsContextDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => setIsContextDialogOpen(false)}>Save Context</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
