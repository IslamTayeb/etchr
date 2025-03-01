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
const dotenv_1 = require("dotenv");
const supabase_1 = require("../middleware/supabase");
(0, dotenv_1.config)();
const router = express_1.default.Router();
router.get("/github/login", (req, res) => {
    const scope = req.query.scope || 'repo';
    const callbackUrl = `${process.env.BACKEND_URL}/auth/github/callback`;
    const redirectUri = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=${scope}&prompt=consent`;
    res.redirect(redirectUri);
});
// In routes/github-auth.ts
router.get("/github/callback", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.query.code) {
            return res.redirect(`${process.env.FRONTEND_URL}/?error=auth`);
        }
        const tokenResponse = yield axios_1.default.post("https://github.com/login/oauth/access_token", {
            client_id: process.env.GITHUB_CLIENT_ID,
            client_secret: process.env.GITHUB_CLIENT_SECRET,
            code: req.query.code,
        }, { headers: { Accept: "application/json" } });
        if (!tokenResponse.data.access_token) {
            return res.redirect(`${process.env.FRONTEND_URL}/auth-error`);
        }
        const accessToken = tokenResponse.data.access_token;
        try {
            const userResponse = yield axios_1.default.get('https://api.github.com/user', {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            const { data: userData, error } = yield supabase_1.supabase
                .from('users')
                .upsert({
                github_id: userResponse.data.id.toString(),
                github_login: userResponse.data.login, // Add this
                created_at: new Date().toISOString()
            }, {
                onConflict: 'github_id'
            })
                .select('*')
                .maybeSingle();
            if (error)
                throw error;
            if (!userData) {
                console.error("No user data returned after upsert");
                return res.redirect(`${process.env.FRONTEND_URL}/?error=user_creation`);
            }
            const redirectUrl = new URL('/generate', process.env.FRONTEND_URL);
            redirectUrl.searchParams.set('token', accessToken);
            redirectUrl.searchParams.set('userId', userData.id);
            return res.redirect(redirectUrl.toString());
        }
        catch (error) {
            console.error("Auth callback error:", error);
            return res.redirect(`${process.env.FRONTEND_URL}/?error=auth`);
        }
    }
    catch (error) {
        console.error("Auth callback error:", error);
        return res.redirect(`${process.env.FRONTEND_URL}/?error=auth`);
    }
}));
// Instead of session, read token from the Authorization header
// In routes/github-auth.ts
router.get("/github/verify", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.replace("Bearer ", "");
        if (!token) {
            return res.status(401).json({ authenticated: false });
        }
        const githubResponse = yield axios_1.default.get('https://api.github.com/user', {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (githubResponse.status !== 200) {
            return res.status(401).json({ authenticated: false });
        }
        return res.json({ authenticated: true });
    }
    catch (error) {
        console.error("Verification error:", error);
        return res.status(401).json({ authenticated: false });
    }
}));
router.get("/github/repos", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const authHeader = req.headers.authorization;
        if (!(authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith("Bearer "))) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const accessToken = authHeader.replace("Bearer ", "");
        const response = yield axios_1.default.get("https://api.github.com/user/repos", {
            headers: {
                Authorization: `token ${accessToken}`,
                Accept: 'application/vnd.github.v3+json'
            },
            params: {
                sort: 'updated',
                direction: 'desc',
                per_page: 100,
                visibility: req.query.scope === 'public_repo' ? 'public' : 'all',
                affiliation: 'owner,collaborator,organization_member'
            }
        });
        const repos = response.data.map((repo) => ({
            id: repo.id,
            name: repo.name,
            html_url: repo.html_url,
            description: repo.description,
            updated_at: repo.updated_at,
            private: repo.private,
            language: repo.language,
            stargazers_count: repo.stargazers_count
        }));
        res.json(repos);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed fetching repos" });
    }
}));
exports.default = router;
