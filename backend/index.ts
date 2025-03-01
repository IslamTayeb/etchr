// index.ts
import express from 'express';
import { config } from "dotenv";
import cors from "cors";
import githubAuthRouter from "./routes/github-auth";
import githubCodeFetchRouter from './routes/github-code-fetch';
import githubSubmitRouter from './routes/github-submit';
import sectionGenerationRouter from './routes/section-generation';
import excalidrawRouter from './routes/excalidraw';

config();
const app = express();

// Move cors config before routes
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'user-id']
}));

app.use(express.json({ limit: "200mb" }));

// Health check endpoint
app.get(['/health', '/'], (_req, res) => {
  res.status(200).send('OK');
});

// Routes
app.use("/auth", githubAuthRouter);
app.use("/api/github", githubCodeFetchRouter);
app.use("/api/github", githubSubmitRouter);
app.use("/api/sections", sectionGenerationRouter);
app.use("/api/github", excalidrawRouter);

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
