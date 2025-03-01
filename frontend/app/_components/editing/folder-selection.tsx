import React, { useCallback } from 'react';
import { ChevronRight, Folder, Plus, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import axios from 'axios';

interface TreeNode {
    path: string;
    type: string;
    children: Record<string, TreeNode>;
}

interface FileItem {
    path: string;
    type: "tree" | "blob";
}

interface DirectorySelectorProps {
    repoUrl: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    files: FileItem[];
    onSelect: (path: string) => void;
    onUpdate?: (files: FileItem[]) => void;
}

export function DirectorySelector({
    repoUrl,
    open,
    onOpenChange,
    files: initialFiles,
    onSelect,
    onUpdate
}: DirectorySelectorProps) {
    const [expandedFolders, setExpandedFolders] = React.useState<Set<string>>(new Set());
    const [newDirPath, setNewDirPath] = React.useState("");
    const [showNewDirInput, setShowNewDirInput] = React.useState(false);
    const [files, setFiles] = React.useState<FileItem[]>(initialFiles);
    const [searchTerm, setSearchTerm] = React.useState("");

    const createFileTree = (files: FileItem[]): Record<string, TreeNode> => {
        const root: Record<string, TreeNode> = {};
        files.filter(file => file.type === "tree").forEach(file => {
            const parts = file.path.split("/");
            let current = root;
            parts.forEach((part: string, index: number) => {
                if (!current[part]) {
                    current[part] = {
                        path: parts.slice(0, index + 1).join("/"),
                        type: "tree",
                        children: {}
                    };
                }
                current = current[part].children;
            });
        });
        return root;
    };

    const toggleFolder = (path: string) => {
        setExpandedFolders(prev => {
            const newSet = new Set(prev);
            if (newSet.has(path)) newSet.delete(path);
            else newSet.add(path);
            return newSet;
        });
    };

    const handleCreateClick = async () => {
        try {
            const token = localStorage.getItem("githubToken");
            if (!token) throw new Error("No auth token found");

            await axios.post(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/github/create-directory`,
                { repoUrl, path: newDirPath },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const updatedFiles = await fetchRepositoryTree();
            if (updatedFiles) {
                setFiles(updatedFiles);
                onUpdate?.(updatedFiles);
            }

            setNewDirPath("");
            setShowNewDirInput(false);
        } catch (error) {
            console.error('Failed to create directory:', error);
        }
    };

    const fetchRepositoryTree = useCallback(async () => {
        const token = localStorage.getItem("githubToken");
        try {
            const response = await axios.get(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/github/fetch-tree?repoUrl=${encodeURIComponent(repoUrl)}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            return response.data.files;
        } catch (error) {
            console.error('Failed to fetch repository tree:', error);
            return null;
        }
    }, [repoUrl]);

    const filterTree = (node: TreeNode, term: string): boolean => {
        return node.path.toLowerCase().includes(term.toLowerCase()) ||
            Object.values(node.children).some(child => filterTree(child, term));
    };

    React.useEffect(() => {
        setFiles(initialFiles);
    }, [initialFiles]);

    const renderNode = (node: TreeNode, name: string, level: number = 0) => {
        const isExpanded = expandedFolders.has(node.path);
        const hasChildren = Object.keys(node.children).length > 0;

        if (searchTerm && !filterTree(node, searchTerm)) return null;

        return (
            <motion.div
                key={node.path}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
            >
                <div className={cn(
                    "flex items-center gap-1.5 py-1 px-1.5 rounded-sm group hover:bg-secondary/40",
                    level > 0 && "ml-3"
                )}>
                    <button
                        onClick={() => hasChildren && toggleFolder(node.path)}
                        className="flex items-center gap-1.5 text-sm flex-1"
                    >
                        {hasChildren ? (
                            <motion.div
                                animate={{ rotate: isExpanded ? 90 : 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            </motion.div>
                        ) : (
                            <div className="w-3.5 h-3.5" /> /* Spacer for alignment */
                        )}
                        <Folder className="h-3.5 w-3.5 shrink-0 text-accent-foreground" />
                        <span className="truncate text-sm">{name}</span>
                    </button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            onSelect(node.path);
                            onOpenChange(false);
                        }}
                        className="opacity-0 group-hover:opacity-100 h-6 px-2"
                    >
                        Select
                    </Button>
                </div>

                <AnimatePresence>
                    {isExpanded && hasChildren && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="border-l ml-4 border-border/50"
                        >
                            {Object.entries(node.children).map(([childName, childNode]) =>
                                renderNode(childNode, childName, level + 1)
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        );
    };

    const fileTree = React.useMemo(() => createFileTree(files), [files]);

    return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[500px] p-0">
                    <Card className="flex flex-col border-0 h-full">
                        <div className="flex-none p-3 border-b">
                            <DialogHeader className="p-1">
                                <DialogTitle>Select Directory for Images</DialogTitle>
                            </DialogHeader>
                        </div>
                        <div className="flex-none px-3 py-2 border-b">
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="text"
                                        placeholder="Search directories..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-8 h-8"
                                    />
                                </div>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setShowNewDirInput(true)}
                                    className="h-8 w-8"
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                            <AnimatePresence>
                                {showNewDirInput && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="flex gap-2 mt-2">
                                            <Input
                                                value={newDirPath}
                                                onChange={(e) => setNewDirPath(e.target.value)}
                                                placeholder="directory/path"
                                                className="h-8"
                                            />
                                            <Button
                                                onClick={handleCreateClick}
                                                className="h-8"
                                            >
                                                Create
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                onClick={() => setShowNewDirInput(false)}
                                                className="h-8"
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        <ScrollArea className="flex-1 max-h-[55vh]">
                            <div className="p-3">
                                {Object.entries(fileTree).map(([name, node]) =>
                                    renderNode(node, name)
                                )}
                            </div>
                        </ScrollArea>
                    </Card>
                </DialogContent>
            </Dialog>
    );
}
