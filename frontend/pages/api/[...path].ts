import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { Base64 } from "js-base64";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  AiProviderConfigError,
  generateAiText,
  getSafeAiErrorMessage,
  validateAiProviderConfig,
} from "@/lib/server-ai-provider";

export const config = {
  maxDuration: 300,
  api: {
    bodyParser: {
      sizeLimit: "4.5mb",
    },
    responseLimit: false,
  },
};

interface FileNode {
  path: string;
  mode: string;
  type: string;
  sha: string;
  size: number;
  url: string;
}

interface SelectedFile {
  path: string;
  sha?: string;
}

interface GitHubRepoResponse {
  id: number;
  name: string;
  html_url: string;
  description: string | null;
  updated_at: string;
  private: boolean;
  language: string | null;
  stargazers_count: number;
}

const getRoutePath = (req: NextApiRequest): string => {
  const path = req.query.path;
  return Array.isArray(path) ? path.join("/") : String(path || "");
};

const getBaseUrl = (req: NextApiRequest): string => {
  if (process.env.FRONTEND_URL) return process.env.FRONTEND_URL.replace(/\/+$/, "");

  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${Array.isArray(proto) ? proto[0] : proto}://${Array.isArray(host) ? host[0] : host}`;
};

const getBearerToken = (req: NextApiRequest): string | null => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.replace("Bearer ", "");
};

const decodeRepoUrl = (repoUrl: string): string => {
  try {
    return decodeURIComponent(repoUrl);
  } catch {
    return repoUrl;
  }
};

const getRepoInfo = (repoUrl: string) => {
  const matches = decodeRepoUrl(repoUrl).match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!matches) {
    throw new Error("Invalid GitHub URL");
  }
  return { owner: matches[1], repo: matches[2].replace(/\.git$/, "") };
};

const sendMethodNotAllowed = (res: NextApiResponse) => {
  res.status(405).json({ error: "Method not allowed" });
};

export function countFileTokens(content: string): number {
  const words = content.split(/\s+/);
  let totalTokens = 0;

  for (const word of words) {
    totalTokens += word.length <= 4 ? 1 : Math.ceil(word.length / 4);
  }

  totalTokens += content.match(/[^a-zA-Z0-9\s]/g)?.length || 0;
  return totalTokens;
}

const fetchRepoTree = async (owner: string, repo: string, githubToken: string): Promise<FileNode[]> => {
  const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`, {
    headers: {
      Authorization: `Bearer ${githubToken}`,
    },
  });
  return response.data.tree;
};

const fetchFileContent = async (owner: string, repo: string, fileSha: string, githubToken: string): Promise<string> => {
  const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/git/blobs/${fileSha}`, {
    headers: {
      Authorization: `Bearer ${githubToken}`,
      Accept: "application/vnd.github.v3.raw",
    },
    responseType: "arraybuffer",
  });

  return Buffer.from(response.data).toString("utf-8");
};

const convertIpynbToMarkdown = (content: string | object, truncateOutputs = false): string => {
  try {
    const notebook = typeof content === "string" ? JSON.parse(content) : content;
    let markdown = "# Jupyter Notebook Conversion\n";

    if (!notebook || typeof notebook !== "object" || !("cells" in notebook) || !Array.isArray(notebook.cells)) {
      return `${markdown}Notebook format not recognized.\n`;
    }

    for (const cell of notebook.cells) {
      if (cell.cell_type === "markdown") {
        markdown += `${Array.isArray(cell.source) ? cell.source.join("") : cell.source}\n\n`;
      } else if (cell.cell_type === "code") {
        markdown += `\`\`\`python\n${Array.isArray(cell.source) ? cell.source.join("") : cell.source}\n\`\`\`\n\n`;

        if (cell.outputs?.length) {
          markdown += "Output:\n```\n";
          for (const output of cell.outputs) {
            const outputText =
              output.output_type === "stream" && output.text
                ? output.text
                : output.output_type === "execute_result" && output.data?.["text/plain"]
                  ? output.data["text/plain"]
                  : null;

            if (!outputText) continue;
            const text = Array.isArray(outputText) ? outputText.join("") : outputText;
            if (truncateOutputs) {
              const lines = text.split("\n");
              markdown += lines.slice(0, 2).join("\n");
              if (lines.length > 2) markdown += "\n... [output truncated]\n";
            } else {
              markdown += text;
            }
          }
          markdown += "\n```\n\n";
        }
      }
    }

    return markdown;
  } catch {
    return "# Error in converting notebook\n";
  }
};

const shouldIncludeFile = (filePath: string, size: number): boolean => {
  const ignoredExtensions = [
    ".csv",
    ".tsv",
    ".xls",
    ".xlsx",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".svg",
    ".webp",
    ".mp4",
    ".avi",
    ".mkv",
    ".mov",
    ".webm",
    ".wmv",
    ".mp3",
    ".wav",
    ".flac",
    ".log",
    ".DS_Store",
    ".zip",
    ".gz",
    ".tar",
    ".7z",
    ".rar",
    ".mjs",
    ".ico",
    ".txt",
    ".pdf",
    ".gitkeep",
    ".woff",
    ".yaml",
    ".pyc",
    ".css",
    ".scss",
    ".doc",
    ".docx",
    ".ppt",
    ".pptx",
    ".psd",
    ".ai",
    ".indd",
    ".otf",
    ".ttf",
  ];

  const ignoredDirectories = [
    "node_modules/",
    "dist/",
    "venv/",
    "env/",
    ".git/",
    ".vscode/",
    ".gitignore",
    ".env",
    ".gitattributes",
    ".python-version",
    ".venv",
    "yarn.lock",
    "package-lock.json",
    "hooks",
    ".next",
    "resume",
    "ui/",
    "fonts/",
    "font/",
    "icon/",
    "icons/",
    "public/",
    "__pychache__/",
    "__init__",
  ];

  return (
    !ignoredExtensions.some((extension) => filePath.endsWith(extension)) &&
    !ignoredDirectories.some((directory) => filePath.includes(directory)) &&
    size <= 5000000
  );
};

const fetchSelectedFilesContent = async ({
  repoUrl,
  selectedFiles,
  githubToken,
  truncateNotebookOutputs = true,
}: {
  repoUrl: string;
  selectedFiles: Array<string | SelectedFile>;
  githubToken: string;
  truncateNotebookOutputs?: boolean;
}): Promise<string> => {
  const { owner, repo } = getRepoInfo(repoUrl);
  const repoTree = await fetchRepoTree(owner, repo, githubToken);
  let filesContent = "";

  for (const selectedFile of selectedFiles) {
    const filePath = typeof selectedFile === "string" ? selectedFile : selectedFile.path;
    const fileSha = typeof selectedFile === "string" ? repoTree.find((node) => node.path === filePath)?.sha : selectedFile.sha;
    if (!fileSha) continue;

    try {
      let content = await fetchFileContent(owner, repo, fileSha, githubToken);
      if (filePath.endsWith(".ipynb")) {
        content = convertIpynbToMarkdown(content, truncateNotebookOutputs);
      }
      filesContent += `=== File: ${filePath} ===\n${content}\n\n`;
    } catch (error) {
      console.warn(`Failed to fetch selected file: ${filePath}`, error instanceof Error ? error.message : "Unknown error");
    }
  }

  return filesContent;
};

const createFullPrompt = (filesContent: string, projectContext?: string): string => {
  const codebaseSection = filesContent.replace(/\$/g, "\\$");
  const contextSection = projectContext ? projectContext.replace(/\$/g, "\\$") : "";

  return `You are an AI assistant tasked with creating a detailed, comprehensive, and technical README.md file for a software project. Analyze the provided codebase and generate a README suitable for publication on GitHub.

<codebase>
${codebaseSection}
</codebase>

${projectContext ? `If project context is provided, incorporate it where relevant:

<project_context>
${contextSection}
</project_context>
` : ""}

Include relevant sections such as project title, description, features, usage, installation, technologies used, configuration, API documentation, dependencies, contributing, testing, and license only if specified in the codebase or context.

Requirements:
1. Use proper Markdown formatting.
2. Include code blocks where useful.
3. Use headings to organize content.
4. Do not number headings.
5. Start with a level-1 heading for the project title.
6. Output only raw Markdown content.`;
};

const retryGenerateAiText = async (aiProviderConfig: unknown, prompt: string, retries = 3, interval = 5000): Promise<string | null> => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const readmeContent = await generateAiText(aiProviderConfig, prompt);
      if (readmeContent) return readmeContent;
    } catch (error) {
      if (error instanceof AiProviderConfigError) throw error;
      console.error(`Generation attempt ${attempt} failed:`, getSafeAiErrorMessage(error));
    }

    if (attempt < retries) {
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
  }

  return null;
};

const handleAuthLogin = (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "GET") return sendMethodNotAllowed(res);
  const scope = typeof req.query.scope === "string" ? req.query.scope : "repo";
  const callbackUrl = `${getBaseUrl(req)}/api/auth/github/callback`;
  const redirectUri = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=${encodeURIComponent(scope)}&prompt=consent`;
  res.redirect(redirectUri);
};

const handleAuthCallback = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "GET") return sendMethodNotAllowed(res);
  const baseUrl = getBaseUrl(req);

  try {
    if (!req.query.code) {
      res.redirect(`${baseUrl}/?error=auth`);
      return;
    }

    const tokenResponse = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code: req.query.code,
      },
      { headers: { Accept: "application/json" } }
    );

    if (!tokenResponse.data.access_token) {
      res.redirect(`${baseUrl}/?error=auth`);
      return;
    }

    const accessToken = tokenResponse.data.access_token;
    const userResponse = await axios.get("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const { data: userData, error } = await getSupabaseAdmin()
      .from("users")
      .upsert(
        {
          github_id: userResponse.data.id.toString(),
          github_login: userResponse.data.login,
          created_at: new Date().toISOString(),
        },
        { onConflict: "github_id" }
      )
      .select("*")
      .maybeSingle();

    if (error || !userData) {
      res.redirect(`${baseUrl}/?error=user_creation`);
      return;
    }

    const redirectUrl = new URL("/generate", baseUrl);
    redirectUrl.searchParams.set("token", accessToken);
    redirectUrl.searchParams.set("userId", String(userData.id));
    res.redirect(redirectUrl.toString());
  } catch (error) {
    console.error("GitHub auth callback failed:", error instanceof Error ? error.message : "Unknown error");
    res.redirect(`${baseUrl}/?error=auth`);
  }
};

const handleAuthVerify = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "GET") return sendMethodNotAllowed(res);
  const token = getBearerToken(req);
  if (!token) return res.status(401).json({ authenticated: false });

  try {
    const githubResponse = await axios.get("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${token}` },
    });
    res.json({ authenticated: githubResponse.status === 200 });
  } catch {
    res.status(401).json({ authenticated: false });
  }
};

const handleAuthRepos = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "GET") return sendMethodNotAllowed(res);
  const token = getBearerToken(req);
  if (!token) return res.status(401).json({ error: "User not authenticated" });

  try {
    const response = await axios.get("https://api.github.com/user/repos", {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
      params: {
        sort: "updated",
        direction: "desc",
        per_page: 100,
        visibility: req.query.scope === "public_repo" ? "public" : "all",
        affiliation: "owner,collaborator,organization_member",
      },
    });

    res.json(
      response.data.map((repo: GitHubRepoResponse) => ({
        id: repo.id,
        name: repo.name,
        html_url: repo.html_url,
        description: repo.description,
        updated_at: repo.updated_at,
        private: repo.private,
        language: repo.language,
        stargazers_count: repo.stargazers_count,
      }))
    );
  } catch {
    res.status(500).json({ error: "Failed fetching repos" });
  }
};

const handleFetchTree = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "GET") return sendMethodNotAllowed(res);
  const repoUrl = typeof req.query.repoUrl === "string" ? req.query.repoUrl : "";
  const githubToken = getBearerToken(req);
  if (!repoUrl) return res.status(400).json({ error: "Missing repository URL" });
  if (!githubToken) return res.status(401).json({ error: "User not authenticated" });

  try {
    const { owner, repo } = getRepoInfo(repoUrl);
    const repoTree = await fetchRepoTree(owner, repo, githubToken);
    const preSelectedFiles = repoTree
      .filter((node) => node.type === "blob" && shouldIncludeFile(node.path, node.size))
      .map((file) => file.path);

    res.json({ files: repoTree, preSelectedFiles });
  } catch {
    res.status(500).json({ error: "Failed to fetch repository tree" });
  }
};

const handleGenerateReadme = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") return sendMethodNotAllowed(res);
  const userId = req.headers["user-id"] as string;
  const githubToken = getBearerToken(req);
  if (!githubToken) return res.status(401).json({ error: "User not authenticated" });

  try {
    const { repoUrl, selectedFiles, projectContext, truncateNotebookOutputs = true, aiProviderConfig } = req.body;
    validateAiProviderConfig(aiProviderConfig);

    const { data: readmeGen, error: readmeError } = await getSupabaseAdmin()
      .from("readme_generations")
      .insert([{ user_id: userId }])
      .select()
      .single();

    if (readmeError) throw readmeError;
    const readmeGenId = String(readmeGen.id);

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Transfer-Encoding", "chunked");
    res.write(JSON.stringify({ status: "fetching", message: "Fetching codebase content...", readmeId: readmeGenId }) + "\n");

    const filesContent = await fetchSelectedFilesContent({
      repoUrl,
      selectedFiles,
      githubToken,
      truncateNotebookOutputs,
    });

    res.write(JSON.stringify({ status: "analyzing", message: "Analyzing codebase..." }) + "\n");
    const fullPrompt = createFullPrompt(filesContent, projectContext);
    const tokenEstimate = countFileTokens(fullPrompt);

    res.write(
      JSON.stringify({
        status: "tokens",
        message: `Token count: ${tokenEstimate.toLocaleString()} tokens`,
        tokenCount: tokenEstimate,
      }) + "\n"
    );

    if (tokenEstimate > 75000) {
      res.write(JSON.stringify({ status: "error", message: "Token limit exceeded. Please select fewer files." }) + "\n");
      res.end();
      return;
    }

    res.write(JSON.stringify({ status: "generating", message: "Generating README..." }) + "\n");
    const readmeContent = await retryGenerateAiText(aiProviderConfig, fullPrompt);

    if (!readmeContent) {
      await getSupabaseAdmin().from("readme_generations").delete().eq("id", readmeGenId);
      res.write(JSON.stringify({ status: "error", message: "Failed to generate README content." }) + "\n");
      res.end();
      return;
    }

    const readmeMatch = readmeContent.match(/<readme>([\s\S]*?)<\/readme>/);
    const finalReadme = readmeMatch ? readmeMatch[1].trim() : readmeContent;
    await getSupabaseAdmin().from("readme_generations").update({ content: finalReadme }).eq("id", readmeGenId);

    res.write(JSON.stringify({ status: "complete", readme: finalReadme, readmeId: readmeGenId }) + "\n");
    res.end();
  } catch (error) {
    console.error("README generation failed:", getSafeAiErrorMessage(error));
    if (!res.headersSent && error instanceof AiProviderConfigError) {
      res.status(error.statusCode).json({ error: getSafeAiErrorMessage(error) });
      return;
    }

    res.write(JSON.stringify({ status: "error", message: getSafeAiErrorMessage(error) }) + "\n");
    res.end();
  }
};

const getReadmeSha = async (owner: string, repo: string, githubToken: string): Promise<string | null> => {
  try {
    const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/contents/README.md`, {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    });
    return response.data.sha;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) return null;
    throw error;
  }
};

const handleSubmit = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") return sendMethodNotAllowed(res);
  const githubToken = getBearerToken(req);
  if (!githubToken) return res.status(401).json({ error: "Unauthorized" });

  try {
    const { repoUrl, content, mode } = req.body;
    if (!repoUrl || !content) return res.status(400).json({ error: "Missing required parameters" });

    const { owner, repo } = getRepoInfo(repoUrl);
    const currentSha = await getReadmeSha(owner, repo, githubToken);

    if (mode === "keep-both" && currentSha) {
      const existingContent = await axios.get(`https://raw.githubusercontent.com/${owner}/${repo}/main/README.md`, {
        headers: { Authorization: `Bearer ${githubToken}` },
      });

      let oldReadmeSha: string | null = null;
      try {
        const oldResponse = await axios.get(`https://api.github.com/repos/${owner}/${repo}/contents/OLD-README.md`, {
          headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: "application/vnd.github.v3+json",
          },
        });
        oldReadmeSha = oldResponse.data.sha;
      } catch {
        oldReadmeSha = null;
      }

      await axios.put(
        `https://api.github.com/repos/${owner}/${repo}/contents/OLD-README.md`,
        {
          message: "Backup existing README.md",
          content: Base64.encode(existingContent.data),
          ...(oldReadmeSha && { sha: oldReadmeSha }),
        },
        {
          headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      );
    }

    const response = await axios.put(
      `https://api.github.com/repos/${owner}/${repo}/contents/README.md`,
      {
        message: "Update README.md via README Generator",
        content: Base64.encode(content),
        ...(currentSha && { sha: currentSha }),
      },
      {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    res.json({ success: true, data: response.data });
  } catch {
    res.status(500).json({ error: "Failed to update README" });
  }
};

const handleCheckReadme = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") return sendMethodNotAllowed(res);
  const githubToken = getBearerToken(req);
  if (!githubToken) return res.status(401).json({ error: "Unauthorized" });

  try {
    const { owner, repo } = getRepoInfo(req.body.repoUrl);
    const sha = await getReadmeSha(owner, repo, githubToken);
    res.json({ exists: Boolean(sha) });
  } catch {
    res.status(500).json({ error: "Failed to check README status" });
  }
};

const buildSectionPrompt = ({
  title,
  description,
  currentMarkdown,
  codebaseContent,
}: {
  title: string;
  description?: string;
  currentMarkdown: string;
  codebaseContent: string;
}) => `Generate a section titled "${title}" for a GitHub README.md file.
${description ? `The section should address: ${description}` : ""}

Current README content:
${currentMarkdown}

Codebase content:
${codebaseContent}

Requirements:
1. Do NOT include any section headings (#, ##, ###) AT ALL IN YOUR RESPONSE.
2. Make the content specific to this project based on the codebase.
3. Keep the content concise but informative.
4. Use proper markdown formatting.
5. Don't repeat information from other sections.

Generate only the section content in markdown format.`;

const handleGenerateSection = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") return sendMethodNotAllowed(res);
  const githubToken = getBearerToken(req);
  if (!githubToken) return res.status(401).json({ error: "User not authenticated" });

  const userId = req.headers["user-id"] as string;
  const { title, description, repoUrl, currentMarkdown, selectedFiles = [], useAI, readmeId, aiProviderConfig } = req.body;
  if (!useAI) return res.json({ section: "" });

  try {
    validateAiProviderConfig(aiProviderConfig);
    await getSupabaseAdmin().from("section_generations").insert([{ readme_id: readmeId, user_id: userId }]);

    const codebaseContent = await fetchSelectedFilesContent({ repoUrl, selectedFiles, githubToken });
    const section = await generateAiText(
      aiProviderConfig,
      buildSectionPrompt({ title, description, currentMarkdown, codebaseContent })
    );

    res.json({ section });
  } catch (error) {
    console.error("Section generation failed:", getSafeAiErrorMessage(error));
    const status = error instanceof AiProviderConfigError ? error.statusCode : 500;
    res.status(status).json({ error: getSafeAiErrorMessage(error) });
  }
};

const handleGenerateTemplateSection = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") return sendMethodNotAllowed(res);
  const githubToken = getBearerToken(req);
  if (!githubToken) return res.status(401).json({ error: "User not authenticated" });

  const userId = req.headers["user-id"] as string;
  const { template, repoUrl, currentMarkdown, selectedFiles = [], readmeId, aiProviderConfig } = req.body;

  try {
    validateAiProviderConfig(aiProviderConfig);
    await getSupabaseAdmin().from("section_generations").insert([{ readme_id: readmeId, user_id: userId }]);

    const templatePrompts: Record<string, string> = {
      Features: "List and describe the key features and capabilities of this project.",
      Installation: "Provide step-by-step installation instructions for this project.",
      Configuration: "Explain configuration options and setup instructions.",
      "API Documentation": "Document the API endpoints and usage.",
      Contributing: "Outline contribution guidelines.",
      Testing: "Describe testing procedures and frameworks.",
      Security: "Detail security features and considerations.",
      Troubleshooting: "List common issues and their solutions.",
    };

    const codebaseContent = await fetchSelectedFilesContent({ repoUrl, selectedFiles, githubToken });
    const section = await generateAiText(
      aiProviderConfig,
      buildSectionPrompt({
        title: template,
        description: templatePrompts[template],
        currentMarkdown,
        codebaseContent,
      })
    );

    res.json({ section });
  } catch (error) {
    console.error("Template section generation failed:", getSafeAiErrorMessage(error));
    const status = error instanceof AiProviderConfigError ? error.statusCode : 500;
    res.status(status).json({ error: getSafeAiErrorMessage(error) });
  }
};

const handleUploadImage = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") return sendMethodNotAllowed(res);
  const githubToken = getBearerToken(req);
  if (!githubToken) return res.status(401).json({ error: "Not authenticated" });

  try {
    const { repoUrl, imageData, path, filename } = req.body;
    const { owner, repo } = getRepoInfo(repoUrl);
    const base64Data = imageData.split(",")[1];
    const filePath = path ? `${path}/${filename}` : filename;

    await axios.put(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
      {
        message: "Add image via README Generator",
        content: base64Data,
      },
      {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    const githubUrl = path
      ? `https://github.com/${owner}/${repo}/blob/main/${path}/${filename}?raw=true`
      : `https://github.com/${owner}/${repo}/blob/main/${filename}?raw=true`;

    res.json({
      previewUrl: `/api/github/preview-image?repoUrl=${encodeURIComponent(repoUrl)}&path=${encodeURIComponent(path || "")}&filename=${encodeURIComponent(filename)}`,
      markdown: `<img src="${githubUrl}" alt="${filename}" />`,
    });
  } catch {
    res.status(500).json({ error: "Failed to upload image" });
  }
};

const handlePreviewImage = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "GET") return sendMethodNotAllowed(res);
  const githubToken = typeof req.query.token === "string" ? req.query.token : getBearerToken(req);
  if (!githubToken) return res.status(401).json({ error: "Not authenticated" });

  try {
    const repoUrl = typeof req.query.repoUrl === "string" ? req.query.repoUrl : "";
    const path = typeof req.query.path === "string" ? req.query.path : "";
    const filename = typeof req.query.filename === "string" ? req.query.filename : "";
    const { owner, repo } = getRepoInfo(repoUrl);
    const githubRawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/${path}${path ? "/" : ""}${filename}`;

    const response = await axios.get(githubRawUrl, {
      headers: { Authorization: `token ${githubToken}` },
      responseType: "arraybuffer",
    });

    res.setHeader("Content-Type", "image/png");
    res.send(response.data);
  } catch {
    res.status(500).send("Failed to fetch image");
  }
};

const handleCreateDirectory = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") return sendMethodNotAllowed(res);
  const githubToken = getBearerToken(req);
  if (!githubToken) return res.status(401).json({ error: "Not authenticated" });

  try {
    const { repoUrl, path } = req.body;
    const { owner, repo } = getRepoInfo(repoUrl);
    let sha: string | undefined;

    try {
      const checkRes = await axios.get(`https://api.github.com/repos/${owner}/${repo}/contents/${path}/.gitkeep`, {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      });
      sha = checkRes.data?.sha;
    } catch (error) {
      if (!axios.isAxiosError(error) || error.response?.status !== 404) throw error;
    }

    await axios.put(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}/.gitkeep`,
      {
        message: sha ? "Update directory via README Generator" : "Create directory via README Generator",
        content: Base64.encode(""),
        ...(sha && { sha }),
      },
      {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to create directory" });
  }
};

const routes: Record<string, (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void> = {
  "auth/github/login": handleAuthLogin,
  "auth/github/callback": handleAuthCallback,
  "auth/github/verify": handleAuthVerify,
  "auth/github/repos": handleAuthRepos,
  "github/fetch-tree": handleFetchTree,
  "github/generate-readme": handleGenerateReadme,
  "github/submit": handleSubmit,
  "github/check-readme": handleCheckReadme,
  "github/upload-image": handleUploadImage,
  "github/preview-image": handlePreviewImage,
  "github/create-directory": handleCreateDirectory,
  "sections/generate-section": handleGenerateSection,
  "sections/generate-template-section": handleGenerateTemplateSection,
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const route = routes[getRoutePath(req)];
  if (!route) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  await route(req, res);
}
