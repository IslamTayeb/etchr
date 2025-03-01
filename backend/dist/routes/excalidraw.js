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
router.post('/upload-image', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const githubToken = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.replace("Bearer ", "");
        if (!githubToken) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }
        const { repoUrl, imageData, path, filename } = req.body;
        const [owner, repo] = repoUrl.replace('https://github.com/', '').split('/');
        const base64Data = imageData.split(',')[1];
        const filePath = path ? `${path}/${filename}` : filename;
        yield axios_1.default.put(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
            message: 'Add image via README Generator',
            content: base64Data,
        }, {
            headers: {
                Authorization: `Bearer ${githubToken}`,
                Accept: 'application/vnd.github.v3+json',
            },
        });
        const githubUrl = path ? `https://github.com/${owner}/${repo}/blob/main/${path}/${filename}?raw=true` : `https://github.com/${owner}/${repo}/blob/main/${filename}?raw=true`;
        const previewUrl = `${process.env.BACKEND_URL}/api/github/preview-image?repoUrl=${encodeURIComponent(repoUrl)}&path=${encodeURIComponent(path)}&filename=${encodeURIComponent(filename)}`;
        res.json({
            previewUrl,
            markdown: `<img src="${githubUrl}" alt="${filename}" />`
        });
    }
    catch (error) {
        console.error('Error uploading image:', error);
        res.status(500).json({ error: 'Failed to upload image' });
    }
}));
router.get('/preview-image', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const githubToken = req.query.token || ((_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.replace("Bearer ", ""));
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
        const response = yield axios_1.default.get(githubRawUrl, {
            headers: { Authorization: `token ${githubToken}` },
            responseType: 'arraybuffer'
        });
        res.setHeader('Content-Type', 'image/png');
        res.send(response.data);
    }
    catch (error) {
        console.error('Error fetching private image:', error);
        res.status(500).send('Failed to fetch image');
    }
}));
router.post('/create-directory', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const githubToken = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.replace("Bearer ", "");
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
            const checkRes = yield axios_1.default.get(`https://api.github.com/repos/${owner}/${repo}/contents/${path}/.gitkeep`, {
                headers: {
                    Authorization: `Bearer ${githubToken}`,
                    Accept: 'application/vnd.github.v3+json',
                }
            });
            // If file exists, get its sha
            if (checkRes.data && checkRes.data.sha) {
                yield axios_1.default.put(`https://api.github.com/repos/${owner}/${repo}/contents/${path}/.gitkeep`, {
                    message: 'Update directory via README Generator',
                    content: js_base64_1.Base64.encode(''),
                    sha: checkRes.data.sha
                }, {
                    headers: {
                        Authorization: `Bearer ${githubToken}`,
                        Accept: 'application/vnd.github.v3+json',
                    }
                });
            }
        }
        catch (checkError) {
            // If file doesn't exist (404), create it without sha
            if (((_b = checkError.response) === null || _b === void 0 ? void 0 : _b.status) === 404) {
                yield axios_1.default.put(`https://api.github.com/repos/${owner}/${repo}/contents/${path}/.gitkeep`, {
                    message: 'Create directory via README Generator',
                    content: js_base64_1.Base64.encode(''),
                }, {
                    headers: {
                        Authorization: `Bearer ${githubToken}`,
                        Accept: 'application/vnd.github.v3+json',
                    }
                });
            }
            else {
                throw checkError;
            }
        }
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error creating directory:', error);
        res.status(500).json({ error: 'Failed to create directory' });
    }
}));
exports.default = router;
