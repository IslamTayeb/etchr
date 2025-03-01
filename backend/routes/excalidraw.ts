import express from 'express';
import axios from 'axios';
import { Base64 } from 'js-base64';

const router = express.Router();

router.post('/upload-image', async (req, res) => {
  try {
    const githubToken = req.headers.authorization?.replace("Bearer ", "");
    if (!githubToken) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { repoUrl, imageData, path, filename } = req.body;
    const [owner, repo] = repoUrl.replace('https://github.com/', '').split('/');
    const base64Data = imageData.split(',')[1];

    const filePath = path ? `${path}/${filename}` : filename;
    await axios.put(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
      {
        message: 'Add image via README Generator',
        content: base64Data,
      },
      {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    const githubUrl = path ? `https://github.com/${owner}/${repo}/blob/main/${path}/${filename}?raw=true` : `https://github.com/${owner}/${repo}/blob/main/${filename}?raw=true`;
    const previewUrl = `${process.env.BACKEND_URL}/api/github/preview-image?repoUrl=${encodeURIComponent(repoUrl)}&path=${encodeURIComponent(path)}&filename=${encodeURIComponent(filename)}`;

    res.json({
      previewUrl,
      markdown: `<img src="${githubUrl}" alt="${filename}" />`
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

router.get('/preview-image', async (req, res) => {
  try {
    const githubToken = req.query.token || req.headers.authorization?.replace("Bearer ", "");
    if (!githubToken) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { repoUrl, path, filename } = req.query;
    if (!repoUrl || typeof repoUrl !== 'string') {
      res.status(400).json({ error: 'Missing or invalid repoUrl' });
      return;
    }

    const [owner, repo] = repoUrl.replace('https://github.com/', '').split('/');
    const finalPath = path || "";
    const githubRawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/${finalPath}${finalPath ? "/" : ""}${filename}`;

    res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    const response = await axios.get(githubRawUrl, {
      headers: { Authorization: `token ${githubToken}` },
      responseType: 'arraybuffer'
    });

    res.setHeader('Content-Type', 'image/png');
    res.send(response.data);
  } catch (error) {
    console.error('Error fetching private image:', error);
    res.status(500).send('Failed to fetch image');
  }
});

router.post('/create-directory', async (req, res) => {
  try {
    const githubToken = req.headers.authorization?.replace("Bearer ", "");
    if (!githubToken) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { repoUrl, path } = req.body;
    if (!repoUrl || typeof repoUrl !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid repoUrl' });
    }

    const [owner, repo] = repoUrl.replace('https://github.com/', '').split('/');

    // First check if .gitkeep already exists
    try {
      const checkRes = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/contents/${path}/.gitkeep`,
        {
          headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: 'application/vnd.github.v3+json',
          }
        }
      );
      // If file exists, get its sha
      if (checkRes.data && checkRes.data.sha) {
        await axios.put(
          `https://api.github.com/repos/${owner}/${repo}/contents/${path}/.gitkeep`,
          {
            message: 'Update directory via README Generator',
            content: Base64.encode(''),
            sha: checkRes.data.sha
          },
          {
            headers: {
              Authorization: `Bearer ${githubToken}`,
              Accept: 'application/vnd.github.v3+json',
            }
          }
        );
      }
    } catch (checkError: any) {
      // If file doesn't exist (404), create it without sha
      if (checkError.response?.status === 404) {
        await axios.put(
          `https://api.github.com/repos/${owner}/${repo}/contents/${path}/.gitkeep`,
          {
            message: 'Create directory via README Generator',
            content: Base64.encode(''),
          },
          {
            headers: {
              Authorization: `Bearer ${githubToken}`,
              Accept: 'application/vnd.github.v3+json',
            }
          }
        );
      } else {
        throw checkError;
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error creating directory:', error);
    res.status(500).json({ error: 'Failed to create directory' });
  }
});

export default router;
