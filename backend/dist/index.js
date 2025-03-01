"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// index.ts
const express_1 = __importDefault(require("express"));
const dotenv_1 = require("dotenv");
const cors_1 = __importDefault(require("cors"));
const github_auth_1 = __importDefault(require("./routes/github-auth"));
const github_code_fetch_1 = __importDefault(require("./routes/github-code-fetch"));
const github_submit_1 = __importDefault(require("./routes/github-submit"));
const section_generation_1 = __importDefault(require("./routes/section-generation"));
const excalidraw_1 = __importDefault(require("./routes/excalidraw"));
(0, dotenv_1.config)();
const app = (0, express_1.default)();
// Move cors config before routes
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'user-id']
}));
app.use(express_1.default.json({ limit: "200mb" }));
// Health check endpoint
app.get(['/health', '/'], (_req, res) => {
    res.status(200).send('OK');
});
// Routes
app.use("/auth", github_auth_1.default);
app.use("/api/github", github_code_fetch_1.default);
app.use("/api/github", github_submit_1.default);
app.use("/api/sections", section_generation_1.default);
app.use("/api/github", excalidraw_1.default);
// Use process.env.PORT with a default and proper error handling
const port = Number(process.env.PORT) || 8080;
const server = app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
}).on('error', (err) => {
    console.error('Server failed to start:', err);
    process.exit(1);
});
// Proper shutdown handling
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down...');
    server.close(() => {
        console.log('Server shutdown complete');
        process.exit(0);
    });
});
