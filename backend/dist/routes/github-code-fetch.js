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
exports.fetchFileContent = exports.convertIpynbToMarkdown = exports.fetchRepoTree = void 0;
exports.countFileTokens = countFileTokens;
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = require("dotenv");
const generative_ai_1 = require("@google/generative-ai");
const supabase_1 = require("../middleware/supabase");
(0, dotenv_1.config)();
const router = express_1.default.Router();
const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
function countFileTokens(content) {
    var _a;
    // Simple estimation based on GPT tokenization rules
    const words = content.split(/\s+/);
    let totalTokens = 0;
    for (const word of words) {
        // Average tokens per word based on GPT tokenization patterns
        if (word.length <= 4) {
            totalTokens += 1;
        }
        else {
            totalTokens += Math.ceil(word.length / 4);
        }
    }
    // Add padding for special characters and formatting
    const specialChars = ((_a = content.match(/[^a-zA-Z0-9\s]/g)) === null || _a === void 0 ? void 0 : _a.length) || 0;
    totalTokens += specialChars;
    return totalTokens;
}
const fetchRepoTree = (owner, repo, githubToken) => __awaiter(void 0, void 0, void 0, function* () {
    const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`;
    console.log(`Fetching repository tree from URL: ${url}`);
    const response = yield axios_1.default.get(url, {
        headers: {
            Authorization: `Bearer ${githubToken}`,
        },
    });
    return response.data.tree;
});
exports.fetchRepoTree = fetchRepoTree;
const convertIpynbToMarkdown = (content, truncateOutputs = false) => {
    try {
        let notebook;
        if (typeof content === 'string') {
            notebook = JSON.parse(content);
        }
        else {
            notebook = content;
        }
        let markdown = '# Jupyter Notebook Conversion\n';
        if (notebook.cells) {
            for (const cell of notebook.cells) {
                // Handle markdown cells
                if (cell.cell_type === 'markdown') {
                    markdown += cell.source.join('') + '\n\n';
                }
                // Handle code cells
                else if (cell.cell_type === 'code') {
                    markdown += '```python\n' + cell.source.join('') + '\n```\n\n';
                    if (cell.outputs && cell.outputs.length > 0) {
                        markdown += 'Output:\n```\n';
                        for (const output of cell.outputs) {
                            if (output.output_type === 'stream' && output.text) {
                                const text = output.text.join('');
                                if (truncateOutputs) {
                                    const lines = text.split('\n').slice(0, 2);
                                    markdown += lines.join('\n');
                                    if (text.split('\n').length > 2) {
                                        markdown += '\n... [output truncated]\n';
                                    }
                                }
                                else {
                                    markdown += text;
                                }
                            }
                            else if (output.output_type === 'execute_result' && output.data && output.data['text/plain']) {
                                const text = Array.isArray(output.data['text/plain'])
                                    ? output.data['text/plain'].join('')
                                    : output.data['text/plain'];
                                if (truncateOutputs) {
                                    const lines = text.split('\n').slice(0, 2);
                                    markdown += lines.join('\n');
                                    if (text.split('\n').length > 2) {
                                        markdown += '\n... [output truncated]\n';
                                    }
                                }
                                else {
                                    markdown += text;
                                }
                            }
                        }
                        markdown += '\n```\n\n';
                    }
                }
            }
        }
        else {
            markdown += 'Notebook format not recognized.\n';
        }
        return markdown;
    }
    catch (err) {
        console.error('Failed to convert .ipynb file:', err);
        return '# Error in converting notebook\n';
    }
};
exports.convertIpynbToMarkdown = convertIpynbToMarkdown;
const fetchFileContent = (owner, repo, fileSha, githubToken) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const url = `https://api.github.com/repos/${owner}/${repo}/git/blobs/${fileSha}`;
    const response = yield axios_1.default.get(url, {
        headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: 'application/vnd.github.v3.raw'
        },
        responseType: 'arraybuffer'
    });
    const content = Buffer.from(response.data).toString('utf-8');
    if (content.includes('"nbformat"') || content.includes('"cells"')) {
        try {
            const notebook = JSON.parse(content);
            if (!notebook.cells)
                return content;
            let markdown = '';
            for (const cell of notebook.cells) {
                if (cell.cell_type === 'markdown') {
                    markdown += Array.isArray(cell.source) ? cell.source.join('') : cell.source;
                    markdown += '\n\n';
                }
                else if (cell.cell_type === 'code') {
                    markdown += '```python\n';
                    markdown += Array.isArray(cell.source) ? cell.source.join('') : cell.source;
                    markdown += '\n```\n\n';
                    if ((_a = cell.outputs) === null || _a === void 0 ? void 0 : _a.length) {
                        markdown += 'Output:\n```\n';
                        for (const output of cell.outputs) {
                            if (output.output_type === 'stream' && output.text) {
                                const text = Array.isArray(output.text) ? output.text.join('') : output.text;
                                const lines = text.split('\n');
                                markdown += lines.slice(0, 2).join('\n');
                                if (lines.length > 2)
                                    markdown += '\n... [output truncated]\n';
                            }
                            else if (output.output_type === 'execute_result' && output.data && output.data['text/plain']) {
                                const text = Array.isArray(output.data['text/plain']) ?
                                    output.data['text/plain'].join('') : output.data['text/plain'];
                                const lines = text.split('\n');
                                markdown += lines.slice(0, 2).join('\n');
                                if (lines.length > 2)
                                    markdown += '\n... [output truncated]\n';
                            }
                        }
                        markdown += '\n```\n\n';
                    }
                }
            }
            return markdown;
        }
        catch (err) {
            console.error('Failed to parse notebook:', err);
            return content;
        }
    }
    return content;
});
exports.fetchFileContent = fetchFileContent;
const shouldIncludeFile = (filePath, size) => {
    const ignoredExtensions = [
        '.csv', '.tsv', '.xls', '.xlsx', '.png', '.jpg', '.jpeg', '.gif', '.svg',
        '.webp', '.mp4', '.avi', '.mkv', '.mov', '.webm', '.wmv', '.mp3', '.wav',
        '.flac', '.log', '.DS_Store', '.zip', '.gz', '.tar', '.7z', '.rar', '.mjs',
        '.ico', '.txt', '.pdf', '.gitkeep', '.woff', '.yaml', '.pyc', '.css', '.scss',
        '.doc', '.docx', '.ppt', '.pptx', '.psd', '.ai', '.indd', '.otf', '.ttf'
    ];
    // Remove .ipynb and .js from ignored extensions
    const ignoredDirectories = [
        'node_modules/', 'dist/', 'venv/', 'env/', '.git/', '.vscode/', '.gitignore',
        '.env', '.gitattributes', '.python-version', '.venv', 'yarn.lock',
        'package-lock.json', 'hooks', '.next', 'resume', 'ui/', 'fonts/', 'font/',
        'icon/', 'icons/', 'public/', "__pychache__/", "__init__"
    ];
    // Increase max file size to accommodate larger files
    const maxFileSize = 5000000; // Increased to 2MB
    if (ignoredExtensions.some(ext => filePath.endsWith(ext))) {
        console.log(`File excluded based on extension: ${filePath}`);
        return false;
    }
    if (ignoredDirectories.some(dir => filePath.includes(dir))) {
        console.log(`File excluded based on directory: ${filePath}`);
        return false;
    }
    if (size > maxFileSize) {
        console.log(`File excluded based on size (>10MB): ${filePath}`);
        return false;
    }
    return true;
};
const retryGemini = (prompt_1, ...args_1) => __awaiter(void 0, [prompt_1, ...args_1], void 0, function* (prompt, retries = 5, interval = 30000) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            console.log(`Attempt ${attempt} to generate README...`);
            const result = yield model.generateContent(prompt);
            const readmeContent = yield result.response.text();
            if (readmeContent) {
                return readmeContent;
            }
        }
        catch (error) {
            console.error(`Attempt ${attempt} failed:`, error);
        }
        if (attempt < retries) {
            yield new Promise((resolve) => setTimeout(resolve, interval));
        }
    }
    return null;
});
const createFullPrompt = (filesContent, projectContext) => {
    const codebaseSection = filesContent.replace(/\$/g, '\\$');
    const contextSection = projectContext ? projectContext.replace(/\$/g, '\\$') : '';
    return `You are an AI assistant tasked with creating a detailed, comprehensive, and technical README.md file for a software project. Make sure to highlight all the features, tech stack, and relevant components in the README.md file. Your goal is to analyze the provided codebase and generate a comprehensive README that would be suitable for publication on GitHub.

First, carefully review the following codebase:

<codebase>
${codebaseSection}
</codebase>

${projectContext ? `If project context is provided, incorporate it into the documentation where relevant:

<project_context>
${contextSection}
</project_context>
` : ''}

Based on your analysis of the codebase and any provided project context, create a README.md file that includes the following sections (only where relevant to the project) (ignore the parenthesis and the text within them, they are just comments and descriptions):

1. Project Title (and detailed Description)
2. Features
3. Usage
4. Installation
5. Technologies Used (also called tech stack, include all the technologies used within the repository/project + a simple, concise description of what they are used for in the context of the project)
6. Statistical Analysis (if applicable, include any statistical analysis or data processing methods used. This is especially relevant for data science projects and common in jupyter-notebook-based projects, but not always)
7. Configuration
8. API Documentation
9. Dependencies
10. Contributing
11. Testing
12. License (ONLY USE IF SPECIFIED IN THE CODEBASE OR CONTEXT)

Follow these guidelines when creating the README:

1. Use proper Markdown formatting throughout the document.
2. Include code blocks where appropriate, using the correct language syntax highlighting.
3. Provide detailed explanations for each section, ensuring clarity and completeness.
4. Use headings (#, ##, ###, etc.) to organize the content hierarchically.
5. Include examples where necessary to illustrate usage or configuration.
6. If the project has a command-line interface, provide example commands.
7. For API documentation, include request/response examples if applicable.
8. Ensure that all links (internal and external) are functional and relevant.
9. Use bullet points or numbered lists for better readability when appropriate.
10. Include any badges relevant to the project (e.g., build status, version, license).
11. Don't number headings (#, ##, ###, etc.).
12. Always start with a level-1 heading (#) for the project title, never start with a level-2 (##) or lower heading.

List of common licenses ONLY IF THE USER SOMEHOW TELLS YOU THEY'D LIKE IT IN THERE (separated with ===):

<licenses>
MIT License

Copyright (c) [year] [fullname]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

===

Unilicense:
This is free and unencumbered software released into the public domain.

Anyone is free to copy, modify, publish, use, compile, sell, or
distribute this software, either in source code form or as a compiled
binary, for any purpose, commercial or non-commercial, and by any
means.

In jurisdictions that recognize copyright laws, the author or authors
of this software dedicate any and all copyright interest in the
software to the public domain. We make this dedication for the benefit
of the public at large and to the detriment of our heirs and
successors. We intend this dedication to be an overt act of
relinquishment in perpetuity of all present and future rights to this
software under copyright law.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR
OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.

For more information, please refer to <https://unlicense.org>

===

Boost Software License - Version 1.0 - August 17th, 2003

Permission is hereby granted, free of charge, to any person or organization
obtaining a copy of the software and accompanying documentation covered by
this license (the "Software") to use, reproduce, display, distribute,
execute, and transmit the Software, and to prepare derivative works of the
Software, and to permit third-parties to whom the Software is furnished to
do so, all subject to the following:

The copyright notices in the Software and this entire statement, including
the above license grant, this restriction and the following disclaimer,
must be included in all copies of the Software, in whole or in part, and
all derivative works of the Software, unless such copies or derivative
works are solely in the form of machine-executable object code generated by
a source language processor.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE, TITLE AND NON-INFRINGEMENT. IN NO EVENT
SHALL THE COPYRIGHT HOLDERS OR ANYONE DISTRIBUTING THE SOFTWARE BE LIABLE
FOR ANY DAMAGES OR OTHER LIABILITY, WHETHER IN CONTRACT, TORT OR OTHERWISE,
ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
DEALINGS IN THE SOFTWARE.
</licenses>

IMPORTANT: Output ONLY the raw markdown content. Do not include any additional greetings, explanations, or XML tags in your response.

`;
};
router.get('/fetch-tree', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const repoUrl = req.query.repoUrl;
        if (!repoUrl) {
            res.status(400).json({ error: 'Missing repository URL' });
            return;
        }
        const authHeader = req.headers.authorization;
        if (!(authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith("Bearer "))) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const githubToken = authHeader.replace("Bearer ", "");
        const [owner, repo] = repoUrl.replace('https://github.com/', '').split('/');
        if (!owner || !repo) {
            res.status(400).json({ error: 'Invalid repository URL format' });
            return;
        }
        const repoTree = yield (0, exports.fetchRepoTree)(owner, repo, githubToken);
        const preSelectedFiles = repoTree
            .filter((node) => {
            const shouldInclude = shouldIncludeFile(node.path, node.size);
            console.log(`File ${node.path}: should include = ${shouldInclude}`);
            return node.type === "blob" && shouldInclude;
        })
            .map(file => file.path);
        console.log('Pre-selected files:', preSelectedFiles);
        res.json({
            files: repoTree,
            preSelectedFiles
        });
    }
    catch (error) {
        console.error('Error fetching repository tree:', error);
        res.status(500).json({ error: 'Failed to fetch repository tree' });
    }
}));
const readmeRouter = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = req.headers['user-id'];
    try {
        // Create readme generation record first
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        const { data: user } = yield supabase_1.supabase
            .from('users')
            .select('is_admin')
            .eq('id', userId)
            .single();
        if (!(user === null || user === void 0 ? void 0 : user.is_admin)) {
            const { count: readmeCount } = yield supabase_1.supabase
                .from('readme_generations')
                .select('id', { count: 'exact' })
                .eq('user_id', userId)
                .gte('created_at', startOfWeek.toISOString())
                .lte('created_at', endOfWeek.toISOString());
            if (readmeCount && readmeCount >= 5) {
                return res.status(429).json({
                    error: 'Weekly README generation limit reached (5 per week). Please try again next week.'
                });
            }
        }
        const { data: readmeGen, error: readmeError } = yield supabase_1.supabase
            .from('readme_generations')
            .insert([{
                user_id: userId,
            }])
            .select()
            .single();
        if (readmeError)
            throw readmeError;
        const { repoUrl, selectedFiles, projectContext, truncateNotebookOutputs = true } = req.body;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Transfer-Encoding', 'chunked');
        const githubToken = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.replace("Bearer ", "");
        if (!githubToken) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const [owner, repo] = decodeURIComponent(repoUrl).replace('https://github.com/', '').split('/');
        res.write(JSON.stringify({
            status: 'fetching',
            message: 'Fetching codebase content...',
            readmeId: readmeGen.id
        }) + '\n');
        let filesContent = '';
        for (const filePath of selectedFiles) {
            try {
                const fileNode = (yield (0, exports.fetchRepoTree)(owner, repo, githubToken))
                    .find(node => node.path === filePath);
                if (fileNode) {
                    let content = yield (0, exports.fetchFileContent)(owner, repo, fileNode.sha, githubToken);
                    if (filePath.endsWith('.ipynb')) {
                        content = (0, exports.convertIpynbToMarkdown)(content, truncateNotebookOutputs);
                    }
                    filesContent += `=== File: ${filePath} ===\n${content}\n\n`;
                }
            }
            catch (err) {
                console.warn(`Failed to fetch content for file ${filePath}:`, err);
            }
        }
        res.write(JSON.stringify({ status: 'analyzing', message: 'Analyzing codebase...' }) + '\n');
        const fullPrompt = createFullPrompt(filesContent, projectContext);
        const tokenEstimate = countFileTokens(fullPrompt);
        res.write(JSON.stringify({
            status: 'tokens',
            message: `Token count: ${tokenEstimate.toLocaleString()} tokens`,
            tokenCount: tokenEstimate
        }) + '\n');
        if (tokenEstimate > 75000) {
            res.write(JSON.stringify({
                status: 'error',
                message: 'Token limit exceeded. Please select fewer files.'
            }) + '\n');
            res.end();
            return;
        }
        res.write(JSON.stringify({ status: 'generating', message: 'Generating README...' }) + '\n');
        const readmeContent = yield retryGemini(fullPrompt);
        if (!readmeContent) {
            yield supabase_1.supabase
                .from('readme_generations')
                .delete()
                .eq('id', readmeGen.id);
            res.write(JSON.stringify({
                status: 'error',
                message: 'Failed to generate README content.'
            }) + '\n');
            res.end();
            return;
        }
        const readmeMatch = readmeContent.match(/<readme>([\s\S]*?)<\/readme>/);
        const finalReadme = readmeMatch ? readmeMatch[1].trim() : readmeContent;
        // Update readme generation with success
        yield supabase_1.supabase
            .from('readme_generations')
            .update({ content: finalReadme })
            .eq('id', readmeGen.id);
        res.write(JSON.stringify({
            status: 'complete',
            readme: finalReadme,
            readmeId: readmeGen.id
        }) + '\n');
        res.end();
    }
    catch (error) {
        console.error('Error generating README:', error);
        res.write(JSON.stringify({
            status: 'error',
            message: 'Failed to generate README'
        }) + '\n');
        res.end();
    }
});
router.post('/generate-readme', readmeRouter);
exports.default = router;
