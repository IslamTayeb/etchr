"use client";

import React, { useState, useEffect, useRef, useCallback, MutableRefObject } from "react";
import dynamic from "next/dynamic";
import axios from "axios";
import { useDirectory } from "./directory-context";
// import { Button } from "@/components/ui/button";
// import { FolderUp } from "lucide-react";
// import { DirectorySelector } from "./folder-selection";
import { editor } from "monaco-editor";
// import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  editorRef?: MutableRefObject<editor.IStandaloneCodeEditor | null>;
  repoUrl: string;
}

export function MarkdownEditor({
  value,
  onChange,
  editorRef,
  repoUrl,
}: MarkdownEditorProps) {
  const [showFolderDialog] = useState(false);
  const [, setFiles] = useState([]);
  const { selectedDirectory } = useDirectory();
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const handleEditorDidMount = useCallback(
    (mountedEditor: editor.IStandaloneCodeEditor) => {
      if (editorRef) editorRef.current = mountedEditor;
    },
    [editorRef]
  );

  const getGithubToken = () => {
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem("githubToken") || "";
    }
    return "";
  };

  const handleImageDrop = useCallback(
    async (file: File, mountedEditor: editor.IStandaloneCodeEditor) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const rawFilename = `${Date.now()}-${file.name}`;
          const encodedFilename = encodeURIComponent(rawFilename);
          const token = getGithubToken();
          const [owner, repo] = repoUrl
            .replace("https://github.com/", "")
            .split("/");
          const filePath = selectedDirectory ? `${selectedDirectory}/${encodedFilename}` : encodedFilename;
          const uploadResponse = await axios.put(
            `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
            {
              message: "Add image via README Generator",
              content: (reader.result as string).split(",")[1],
            },
            {
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.github.v3+json",
              },
            }
          );
          if (!uploadResponse.data.content?.sha) throw new Error("Upload failed");

          const imageUrl = `https://github.com/${owner}/${repo}/blob/main/${selectedDirectory ? selectedDirectory + '/' : ''}${encodedFilename}?raw=true`;
          const insertText = `\n<div align="center">\n<img src="${imageUrl}" alt="${rawFilename}" />\n</div>\n`;

          const position = mountedEditor.getPosition();
          if (position) {
            mountedEditor.executeEdits("", [
              {
                range: {
                  startLineNumber: position.lineNumber,
                  startColumn: position.column,
                  endLineNumber: position.lineNumber,
                  endColumn: position.column,
                },
                text: insertText,
                forceMoveMarkers: true,
              },
            ]);
          }
        } catch (error) {
          console.error("Error uploading image:", error);
        }
      };
      reader.readAsDataURL(file);
    },
    [repoUrl, selectedDirectory]
  );

  const fetchRepositoryTree = useCallback(async () => {
    if (typeof window === 'undefined') return;

    try {
      const token = getGithubToken();
      const encodedRepoUrl = encodeURIComponent(repoUrl);
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/github/fetch-tree?repoUrl=${encodedRepoUrl}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }
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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleDragOver = (e: DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer?.types.includes("Files")) {
          setIsDraggingFile(true);
        }
      };

      const handleDragLeave = (e: DragEvent) => {
        e.preventDefault();
        const relatedTarget = e.relatedTarget as Node;
        if (!dropZoneRef.current?.contains(relatedTarget)) {
          setIsDraggingFile(false);
        }
      };

      const handleDrop = async (e: DragEvent) => {
        e.preventDefault();
        setIsDraggingFile(false);
        if (!editorRef?.current) return;

        const mountedEditor = editorRef.current;
        const droppedFiles = Array.from(e.dataTransfer?.files || []);
        const selectedPath = selectedDirectory || '';

        for (const file of droppedFiles) {
          if (file.type.startsWith("image/")) {
            await handleImageDrop(file, mountedEditor);
            continue;
          }

          try {
            const reader = new FileReader();
            reader.onload = async () => {
              const token = getGithubToken();
              const [owner, repo] = repoUrl.replace("https://github.com/", "").split("/");
              const encodedFilename = encodeURIComponent(file.name);
              const filePath = selectedPath ? `${selectedPath}/${encodedFilename}` : encodedFilename;

              const response = await axios.put(
                `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
                {
                  message: "Add file via README Generator",
                  content: (reader.result as string).split(",")[1],
                },
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/vnd.github.v3+json",
                  },
                }
              );

              if (response.data.content?.sha) {
                const fileUrl = `https://github.com/${owner}/${repo}/blob/main/${filePath}`;
                const position = mountedEditor.getPosition();
                if (position) {
                  mountedEditor.executeEdits("", [{
                    range: {
                      startLineNumber: position.lineNumber,
                      startColumn: position.column,
                      endLineNumber: position.lineNumber,
                      endColumn: position.column,
                    },
                    text: `[${file.name}](${fileUrl})`,
                    forceMoveMarkers: true,
                  }]);
                }
              }
            };
            reader.readAsDataURL(file);
          } catch (error) {
            console.error("Error uploading file:", error);
          }
        }
      };
      document.addEventListener("dragover", handleDragOver);
      document.addEventListener("dragleave", handleDragLeave);
      document.addEventListener("drop", handleDrop);

      return () => {
        document.removeEventListener("dragover", handleDragOver);
        document.removeEventListener("dragleave", handleDragLeave);
        document.removeEventListener("drop", handleDrop);
      };
    }
  }, [editorRef, selectedDirectory, handleImageDrop]);

  return (
    <div ref={dropZoneRef} className="h-full flex flex-col relative">
      {/* <div className="flex items-center justify-between p-4 py-3 text-foreground border-b bg-card">
        <h2 className="text-xl font-bold">Markdown Editor</h2>
      </div> */}
      <div className="flex-1 overflow-hidden relative">
        <MonacoEditor
          height="100%"
          defaultLanguage="markdown"
          value={value}
          onChange={(newValue) => onChange(newValue || "")}
          onMount={handleEditorDidMount}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            lineNumbers: "on",
            glyphMargin: true,
            folding: true,
            lineDecorationsWidth: 0,
            lineNumbersMinChars: 0,
            renderLineHighlight: "all",
            scrollBeyondLastLine: false,
            wordWrap: "on",
            wrappingStrategy: "advanced",
            padding: { top: 10, bottom: 10 },
            fontSize: 14,
            automaticLayout: true,
          }}
        />
        {isDraggingFile && (
          <div className="absolute inset-0 z-10 bg-background/80 flex items-center justify-center">
            <div className="text-center p-8 rounded-lg border-2 border-dashed border-border">
              <p className="text-lg font-medium">Drop files here to insert</p>
              <p className="text-sm text-muted-foreground mt-1">
                Supports images and other files
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
