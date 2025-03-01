import express, { Request, Response } from 'express';
import axios from 'axios';
import { Base64 } from 'js-base64';

const router = express.Router();

const getRepoInfo = (repoUrl: string) => {
  console.log('Parsing repo URL:', repoUrl);
  const matches = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!matches) {
    console.error('Invalid GitHub URL format:', repoUrl);
    throw new Error('Invalid GitHub URL');
  }
  const result = { owner: matches[1], repo: matches[2] };
  console.log('Extracted repo info:', result);
  return result;
};

const getReadmeSha = async (owner: string, repo: string, githubToken: string): Promise<string | null> => {
  console.log(`Fetching README SHA for ${owner}/${repo}`);
  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/README.md`;
    console.log('Making GitHub API request to:', url);
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    console.log('GitHub API response:', response.data);
    return response.data.sha;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.log('GitHub API Error Response:', error.response?.data);
      if (error.response?.status === 404) {
        console.log('README not found, will create new one');
        return null;
      }
    }
    console.error('Error fetching README SHA:', error);
    throw error;
  }
};

interface SubmitRequestBody {
  repoUrl: string;
  content: string;
  mode?: 'replace' | 'keep-both';
}

interface AxiosError {
  response?: {
    data?: any;
    status?: number;
  };
}

router.post('/submit', async (req: Request<object, object, SubmitRequestBody>, res: Response): Promise<void> => {
  try {
    const { repoUrl, content } = req.body;
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const githubToken = authHeader.replace("Bearer ", "");

    if (!repoUrl || !content) {
      res.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    const { owner, repo } = getRepoInfo(repoUrl);
    const currentSha = await getReadmeSha(owner, repo, githubToken);

    if (req.body.mode === 'keep-both' && currentSha) {
      try {
        // Fetch existing README
        const existingContent = await axios.get(
          `https://raw.githubusercontent.com/${owner}/${repo}/main/README.md`,
          {
            headers: { Authorization: `Bearer ${githubToken}` },
          }
        );

        // Check if OLD-README.md already exists
        let oldReadmeSha: string | null = null;
        try {
          const oldResponse = await axios.get(
            `https://api.github.com/repos/${owner}/${repo}/contents/OLD-README.md`,
            {
              headers: {
                Authorization: `Bearer ${githubToken}`,
                Accept: 'application/vnd.github.v3+json',
              },
            }
          );
          oldReadmeSha = oldResponse.data.sha;
        } catch {
          oldReadmeSha = null; // file doesn't exist
        }

        const backupData: any = {
          message: 'Backup existing README.md',
          content: Base64.encode(existingContent.data),
        };
        if (oldReadmeSha) backupData.sha = oldReadmeSha;

        // Create or update OLD-README.md
        await axios.put(
          `https://api.github.com/repos/${owner}/${repo}/contents/OLD-README.md`,
          backupData,
          {
            headers: {
              Authorization: `Bearer ${githubToken}`,
              Accept: 'application/vnd.github.v3+json',
            },
          }
        );
      } catch (error) {
        console.error('Backup error:', error);
        res.status(500).json({ error: 'Failed to backup existing README' });
        return;
      }
    }

    const newReadmeData = {
      message: 'Update README.md via README Generator',
      content: Base64.encode(content),
      ...(currentSha && { sha: currentSha })
    };

    const response = await axios.put(
      `https://api.github.com/repos/${owner}/${repo}/contents/README.md`,
      newReadmeData,
      {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    res.json({ success: true, data: response.data });
  } catch (error) {
    const axiosError = error as AxiosError;
    console.error('Error updating README:', axiosError.response?.data || error);
    res.status(500).json({ error: 'Failed to update README' });
  }
});

router.post('/check-readme', async (req: Request, res: Response): Promise<void> => {
  try {
    const { repoUrl } = req.body;
    const githubToken = req.headers.authorization?.replace("Bearer ", "");
    if (!githubToken) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { owner, repo } = getRepoInfo(repoUrl);

    try {
      await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/contents/README.md`,
        {
          headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );
      res.json({ exists: true });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        res.json({ exists: false });
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error checking README existence:', error);
    res.status(500).json({ error: 'Failed to check README status' });
  }
});

export default router;
