"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const js_base64_1 = require("js-base64");
const router = express_1.default.Router();
const getRepoInfo = (repoUrl) => {
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
const getReadmeSha = (owner, repo, githubToken) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    console.log(`Fetching README SHA for ${owner}/${repo}`);
    try {
        const url = `https://api.github.com/repos/${owner}/${repo}/contents/README.md`;
        console.log('Making GitHub API request to:', url);
        const response = yield axios_1.default.get(url, {
            headers: {
                Authorization: `Bearer ${githubToken}`,
                Accept: 'application/vnd.github.v3+json',
            },
        });
        console.log('GitHub API response:', response.data);
        return response.data.sha;
    }
    catch (error) {
        if (axios_1.default.isAxiosError(error)) {
            console.log('GitHub API Error Response:', (_a = error.response) === null || _a === void 0 ? void 0 : _a.data);
            if (((_b = error.response) === null || _b === void 0 ? void 0 : _b.status) === 404) {
                console.log('README not found, will create new one');
                return null;
            }
        }
        console.error('Error fetching README SHA:', error);
        throw error;
    }
});
router.post('/submit', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { repoUrl, content } = req.body;
        const authHeader = req.headers.authorization;
        if (!(authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith("Bearer "))) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const githubToken = authHeader.replace("Bearer ", "");
        if (!repoUrl || !content) {
            res.status(400).json({ error: 'Missing required parameters' });
            return;
        }
        const { owner, repo } = getRepoInfo(repoUrl);
        const currentSha = yield getReadmeSha(owner, repo, githubToken);
        if (req.body.mode === 'keep-both' && currentSha) {
            try {
                // Fetch existing README
                const existingContent = yield axios_1.default.get(`https://raw.githubusercontent.com/${owner}/${repo}/main/README.md`, {
                    headers: { Authorization: `Bearer ${githubToken}` },
                });
                // Check if OLD-README.md already exists
                let oldReadmeSha = null;
                try {
                    const oldResponse = yield axios_1.default.get(`https://api.github.com/repos/${owner}/${repo}/contents/OLD-README.md`, {
                        headers: {
                            Authorization: `Bearer ${githubToken}`,
                            Accept: 'application/vnd.github.v3+json',
                        },
                    });
                    oldReadmeSha = oldResponse.data.sha;
                }
                catch (_b) {
                    oldReadmeSha = null; // file doesn't exist
                }
                const backupData = {
                    message: 'Backup existing README.md',
                    content: js_base64_1.Base64.encode(existingContent.data),
                };
                if (oldReadmeSha)
                    backupData.sha = oldReadmeSha;
                // Create or update OLD-README.md
                yield axios_1.default.put(`https://api.github.com/repos/${owner}/${repo}/contents/OLD-README.md`, backupData, {
                    headers: {
                        Authorization: `Bearer ${githubToken}`,
                        Accept: 'application/vnd.github.v3+json',
                    },
                });
            }
            catch (error) {
                console.error('Backup error:', error);
                res.status(500).json({ error: 'Failed to backup existing README' });
                return;
            }
        }
        const newReadmeData = Object.assign({ message: 'Update README.md via README Generator', content: js_base64_1.Base64.encode(content) }, (currentSha && { sha: currentSha }));
        const response = yield axios_1.default.put(`https://api.github.com/repos/${owner}/${repo}/contents/README.md`, newReadmeData, {
            headers: {
                Authorization: `Bearer ${githubToken}`,
                Accept: 'application/vnd.github.v3+json',
            },
        });
        res.json({ success: true, data: response.data });
    }
    catch (error) {
        const axiosError = error;
        console.error('Error updating README:', ((_a = axiosError.response) === null || _a === void 0 ? void 0 : _a.data) || error);
        res.status(500).json({ error: 'Failed to update README' });
    }
}));
router.post('/check-readme', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { repoUrl } = req.body;
        const githubToken = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.replace("Bearer ", "");
        if (!githubToken) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const { owner, repo } = getRepoInfo(repoUrl);
        try {
            yield axios_1.default.get(`https://api.github.com/repos/${owner}/${repo}/contents/README.md`, {
                headers: {
                    Authorization: `Bearer ${githubToken}`,
                    Accept: 'application/vnd.github.v3+json',
                },
            });
            res.json({ exists: true });
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error) && ((_b = error.response) === null || _b === void 0 ? void 0 : _b.status) === 404) {
                res.json({ exists: false });
            }
            else {
                throw error;
            }
        }
    }
    catch (error) {
        console.error('Error checking README existence:', error);
        res.status(500).json({ error: 'Failed to check README status' });
    }
}));
exports.default = router;
