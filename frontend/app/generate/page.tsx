"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Github,
  ArrowLeft,
  Search,
  Coffee,
  LogOut
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EditorView } from "@/app/_components/editor-view";
import { useToast } from "@/hooks/use-toast";
import { RepositoryList } from "../_components/editing/repository-list";
import { EtchrLogo } from "@/public/EtchrLogo";
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton component
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { SuccessNotification } from "../_components/editing/success-notification";
import { ReadmeNotification } from "../_components/editing/readme-notification";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface Project {
  id: string;
  name: string;
  url: string;
  lastAccessed: string;
  description: string;
  updatedAt: string;
  isPrivate: boolean;
  language: string;
  stars: number;
}

export default function Dashboard() {
  const { toast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [repoUrl, setRepoUrl] = React.useState("");
  const [isEditorMode, setIsEditorMode] = React.useState(false);
  const [repositories, setRepositories] = React.useState<Project[]>([]);
  const [reposLoading, setReposLoading] = React.useState(false); // Add reposLoading state
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [markdown, setMarkdown] = React.useState("");
  const [authError, setAuthError] = React.useState(false);
  const [showSuccess, setShowSuccess] = React.useState(false);
  const [showReadmeNotification, setShowReadmeNotification] = React.useState(false)
  const [userId, setUserId] = React.useState<string | null>(null);
  const [includePrivate, setIncludePrivate] = React.useState(true);

  const supabase = createClientComponentClient();

  const handleGithubAuth = () => {
    if (typeof window !== "undefined") {
      const scope = includePrivate ? 'repo' : 'public_repo';
      window.location.href = `${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/github/login?scope=${scope}`;
    }
  };

  const fetchRepositories = async () => {
    const token = localStorage.getItem("githubToken") || "";
    setReposLoading(true); // Set reposLoading to true when fetching starts
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/github/repos`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        type Repo = {
          id: string;
          name: string;
          html_url: string;
          description: string;
          updated_at: string;
          private: boolean;
          language: string;
          stargazers_count: number;
        };

        const repos = data.map((repo: Repo) => ({
          id: repo.id,
          name: repo.name,
          url: repo.html_url,
          description: repo.description || "",
          lastAccessed: new Date().toISOString(),
          updatedAt: repo.updated_at,
          isPrivate: repo.private,
          language: repo.language || "Unknown",
          stars: repo.stargazers_count
        }));

        setRepositories(repos);
      } else {
        console.error("Failed to fetch repositories");
      }
    } catch (error) {
      console.error("Failed to fetch repositories", error);
    } finally {
      setReposLoading(false); // Set reposLoading to false when fetching ends
    }
  };

  // In generate/page.tsx

  const verifyAuthentication = React.useCallback(async () => {
    try {
      const token = localStorage.getItem("githubToken");
      const savedUserId = localStorage.getItem("userId");
      if (!token || !savedUserId) throw new Error("Missing credentials");

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/github/verify`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) throw new Error("Invalid token");

      setIsAuthenticated(true);
      setUserId(savedUserId);
      await fetchRepositories();
    } catch (error) {
      console.error('Auth error:', error);
      localStorage.removeItem("githubToken");
      localStorage.removeItem("userId");
      setIsAuthenticated(false);
      setAuthError(true);
    } finally {
      setReposLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");
      const userId = params.get("userId");

      if (token && userId) {
        localStorage.setItem("githubToken", token);
        localStorage.setItem("userId", userId);
        verifyAuthentication();
      } else if (localStorage.getItem("githubToken")) {
        verifyAuthentication();
      } else {
        setReposLoading(false);
        setIsAuthenticated(false);
      }
    }
  }, [verifyAuthentication]);

  const handleSubmit = async () => {
    if (!markdown) {
      toast({ title: "Error", description: "No content to submit.", variant: "destructive" });
      return;
    }

    try {
      const token = localStorage.getItem("githubToken") || "";
      const checkResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/github/check-readme`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ repoUrl }),
      });

      const { exists } = await checkResponse.json();

      if (exists) {
        setShowReadmeNotification(true);
        return;
      } else {
        await submitReadme('replace');
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to check README status.",
        variant: "destructive",
      });
    }
  };

  const submitReadme = async (mode: 'replace' | 'keep-both') => {
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("githubToken") || "";
      await supabase
        .from('readme_generations')
        .insert([{ user_id: userId }]);
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/github/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          repoUrl,
          content: markdown + '\n\n*README.md was made with [Etchr](https://etchr.dev)*',
          mode
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          const data = await response.json()
          toast({
            title: "Section Limit Reached",
            description: data.error,
            variant: "destructive"
          });
          return
        }
        throw new Error('Failed to generate README.')
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit');
      }

      setShowSuccess(true);
    } catch (error) {
      console.error('Submission error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit content",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNavigateToEditor = (repoUrl: string) => {
    setRepoUrl(repoUrl);
    setIsEditorMode(true);
  };

  const navigateToLandingPage = () => {
    setIsEditorMode(false);
    setRepoUrl("");
  };

  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isEditorMode) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isEditorMode]);

  return (
    <div
      className="flex h-screen bg-background text-foreground overflow-hidden"
      data-editor-mode={isEditorMode}
    >
      {!isEditorMode && (
        <div className="grid-pattern absolute inset-0 pointer-events-none" />
      )}

      <main className="flex flex-col flex-1 h-full overflow-hidden">

        <header className="flex items-center border-b border-border px-6 py-3 bg-card z-50">
          <div className="flex-1 flex items-center ">
            <AnimatePresence>
              {isEditorMode && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={navigateToLandingPage}
                    className="gap-2 h-8"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to File Selection
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <h1 className="text-2xl font-bold text-foreground text-center flex flex-row">
            <a href="/" className="flex items-center">
              <EtchrLogo className="h-8" />
            </a>
          </h1>

          <div className="flex-1 flex justify-end">
            <AnimatePresence>
              {isEditorMode && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="gap-2 h-8"
                  >
                    <Github className="h-4 w-4" />
                    {isSubmitting ? "Submitting..." : "Submit to GitHub"}
                  </Button>

                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>

        <div className="flex-1 overflow-hidden">
          {!isEditorMode ? (
            <div
              className="flex flex-col h-full items-center justify-center px-6 overflow-auto"
            >

              <form
                className="max-w-3xl z-10 mt-9"
              >
                <h2 className="text-3xl font-bold mb-2 text-primary text-center">Generate Your README</h2>
                <h2 className="text-lg font-medium mb-6 text-muted-foreground text-center">Select a repository to begin crafting your documentation</h2>
                {authError ? (
                  <div className="text-center">
                    <p className="text-sm text-destructive">Session expired. Redirecting to login...</p>
                  </div>
                ) : isAuthenticated ? (
                  reposLoading ? (
                    <div className="w-[700px]">
                      <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="text"
                          placeholder="Search repositories..."
                          className="pl-9" />
                      </div>

                      <ScrollArea className="h-[60vh] pr-4">
                        <div className="grid gap-3">
                          {Array.from({ length: 20 }).map((_, index) => (
                            <Skeleton key={index} className="w-full h-[110px] gap-2" />
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  ) : (
                    <div className="w-[700px] justify-self-center">
                      <RepositoryList
                        repositories={repositories.map(repo => ({
                          id: Number(repo.id),
                          name: repo.name,
                          description: repo.description || "",
                          url: repo.url,
                          updatedAt: repo.updatedAt,
                          isPrivate: repo.isPrivate,
                          language: repo.language,
                          stars: repo.stars
                        }))}
                        onSelect={(repo) => handleNavigateToEditor(repo.url)}
                        isLoading={reposLoading}
                      />
                    </div>
                  )
                ) : (
                  <Card className="w-full max-w-lg border-dashed z-10">
                    <CardContent className="p-4">
                      <Button
                        onClick={handleGithubAuth}
                        type="button"
                        variant="outline"
                        className="w-full gap-2 bg-secondary text-secondary-foreground"
                      >
                        <Github className="h-4 w-4" />
                        Authenticate with GitHub
                      </Button>
                      <div className="flex items-center gap-2 mt-3 justify-center">
                        <Checkbox
                          id="private-repos"
                          checked={includePrivate}
                          onCheckedChange={(checked) => setIncludePrivate(checked === true)}
                        />
                        <Label htmlFor="private-repos" className="text-sm text-muted-foreground">
                          Include private repositories
                        </Label>
                      </div>
                    </CardContent>
                  </Card>
                )
                }
              </form>

            </div>

          ) : (
            <motion.div
              key="editor"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              <EditorView
                repoUrl={repoUrl}
                markdown={markdown}
                setMarkdown={setMarkdown}
                userId={userId}
                onLimitReached={() => {
                  setIsEditorMode(false);
                  setMarkdown("");
                  setRepoUrl("");
                }}
              />
            </motion.div>
          )}
          {/* </AnimatePresence> */}
        </div>
        <div className="flex flex-row">
          {!isEditorMode && (
            <Button
              variant="ghost"
              className="gap-2.5 h-8 z-50 flex m-4 w-fit bg-card border border-dashed mr-auto px-3" onClick={() => window.open("https://buymeacoffee.com/islamtayeb", "_blank")}
            >
              <Coffee className="h-4 w-4" />
              Buy me an API call!
            </Button>
          )}
          {!isEditorMode && isAuthenticated && (
            <Button
              variant="ghost"
              className="gap-2 h-8 z-50 flex m-4 w-fit bg-card border border-dashed ml-auto px-3"
              onClick={() => {
                localStorage.removeItem("githubToken");
                localStorage.removeItem("userId");
                setIsAuthenticated(false);
                setRepositories([]);
              }}
            >
              <LogOut className="h-4 w-4" />
              Log out
            </Button>
          )}
        </div>

      </main>

      <ReadmeNotification
        isOpen={showReadmeNotification}
        isSubmitting={isSubmitting}
        onClose={() => setShowReadmeNotification(false)}
        onReplace={async () => {
          await submitReadme('replace');
          setShowReadmeNotification(false);
        }}
        onKeepBoth={async () => {
          await submitReadme('keep-both');
          setShowReadmeNotification(false);
        }}
      />

      <SuccessNotification
        isOpen={showSuccess}
        onClose={() => setShowSuccess(false)}
        onGenerateAnother={() => {
          setShowSuccess(false);
          setIsEditorMode(false);
          setMarkdown("");
        }}
        repoUrl={repoUrl}
      />


    </div>
  );
}
