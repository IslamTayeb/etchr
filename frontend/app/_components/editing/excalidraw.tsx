'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import type { Theme } from '@excalidraw/excalidraw/types/element/types';
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types/types';
import { Button } from '@/components/ui/button';
import axios from 'axios';
import { useDirectory } from './directory-context';
import { Upload } from 'lucide-react';

const Excalidraw = dynamic(
  async () => {
    const mod = await import('@excalidraw/excalidraw');
    return mod.Excalidraw;
  },
  {
    ssr: false,
    loading: () => <div className='flex justify-center items-center h-full'>Loading...</div>
  }
);

interface Props {
  onExport?: (markdownImageLink: string) => void;
  repoUrl: string;
}

export default function ExcalidrawWrapper({ onExport, repoUrl }: Props) {
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);
  const { selectedDirectory } = useDirectory();


  const handleExport = async () => {
    if (!excalidrawAPI?.getSceneElements().length) return;

    // const selectedPath = selectedDirectory || ''; // Empty string = root

    const elements = excalidrawAPI.getSceneElements();
    const { exportToBlob } = await import("@excalidraw/excalidraw");
    const blob = await exportToBlob({
      elements,
      mimeType: 'image/png',
      appState: {
        exportWithDarkMode: true,
        exportBackground: false,
      },
      files: excalidrawAPI?.getFiles(),
    });

    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = async () => {
      try {
        const filename = `image-${Date.now()}.png`;
        const githubToken = localStorage.getItem("githubToken") || "";
        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/github/upload-image`,
          {
            repoUrl,
            imageData: reader.result,
            path: selectedDirectory || '',
            filename
          },
          {
            headers: { Authorization: `Bearer ${githubToken}` },
            withCredentials: true
          }
        );

        // Only add the img tag to the markdown
        if (onExport && response.data.markdown) {
          onExport(response.data.markdown);
        }
      } catch (error) {
        console.error('Failed to upload image:', error);
      }
    };
  };

  return (
    <div className="h-full w-full relative custom-styles">
      <Excalidraw
        excalidrawAPI={(api) => setExcalidrawAPI(api)}
        initialData={{
          elements: [],
          appState: {
            viewBackgroundColor: "transparent",
            theme: 'dark' as Theme,
          },
        }}
        theme="dark"
        gridModeEnabled
        zenModeEnabled
        renderTopRightUI={() => (
          <div className="flex flex-row gap-2">
            <Button
              variant="secondary"
              className="h-[44px] bg-card ml-2"
              onClick={handleExport}
            >
              <Upload />
            </Button>
          </div>
        )}
      />
    </div>
  );
}
