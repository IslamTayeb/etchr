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
const generative_ai_1 = require("@google/generative-ai");
const supabase_1 = require("../middleware/supabase");
const router = express_1.default.Router();
const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
router.post('/generate-section', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.headers['user-id'];
    const readmeId = req.body.readmeId;
    const { title, level, description, useAI } = req.body;
    if (!useAI) {
        return res.json({
            section: ''
        });
    }
    try {
        const { title, level, description, repoUrl, currentMarkdown, codebaseContent, useAI } = req.body;
        const { data: user } = yield supabase_1.supabase
            .from('users')
            .select('is_admin')
            .eq('id', userId)
            .single();
        if (!(user === null || user === void 0 ? void 0 : user.is_admin)) {
            const { count: sectionCount } = yield supabase_1.supabase
                .from('section_generations')
                .select('id', { count: 'exact' })
                .eq('readme_id', readmeId)
                .eq('user_id', userId);
            if (sectionCount && sectionCount >= 3) {
                return res.status(429).json({
                    error: 'Section generation limit reached for this README (3 per README)'
                });
            }
        }
        const { error: sectionError } = yield supabase_1.supabase
            .from('section_generations')
            .insert([{
                readme_id: readmeId,
                user_id: userId,
                // created_at: new Date().toISOString()
            }]);
        if (sectionError)
            throw sectionError;
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `Generate a section titled "${title}" for a GitHub README.md file.
      ${description ? `The section should address: ${description}` : ''}

      Current README content:
      ${currentMarkdown}

      Codebase content:
      ${codebaseContent}

      Requirements:
      1. Do NOT include any section headings (#, ##, ###) AT ALL IN YOUR RESPONSE. THIS IS A VERY STRICT RULE. MAKE SURE THE RESPONSE DOES NOT CONTAIN ANY HEADINGS, AGAIN.
      2. Make the content specific to this project based on the codebase
      3. Keep the content concise but informative
      4. Use proper markdown formatting
      5. Don't repeat information from other sections

      Generate only the section content in markdown format.`;
        console.log('Prompt sent to Gemini:', prompt);
        const result = yield model.generateContent(prompt);
        const sectionContent = result.response.text();
        res.json({ section: sectionContent });
    }
    catch (error) {
        console.error('Error generating section:', error);
        res.status(500).json({ error: 'Failed to generate section' });
    }
}));
router.post('/generate-template-section', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.headers['user-id'];
    const readmeId = req.body.readmeId;
    try {
        yield supabase_1.supabase
            .from('section_generations')
            .insert([{ readme_id: readmeId, user_id: userId }]);
        const { template, repoUrl, currentMarkdown, codebaseContent } = req.body;
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const templatePrompts = {
            'Features': 'List and describe the key features and capabilities of this project. Focus on unique selling points and core functionality.',
            'Installation': 'Provide step-by-step installation instructions for this project. Include prerequisites, commands, and any specific setup requirements.',
            'Configuration': 'Explain configuration options and setup instructions. Include environment variables, config files, and customization options.',
            'API Documentation': 'Document the API endpoints and usage. Include request/response examples, parameters, and authentication if applicable.',
            'Contributing': 'Outline contribution guidelines. Include setup instructions, coding standards, and pull request process.',
            'Testing': 'Describe testing procedures and frameworks. Include how to run tests and write new ones.',
            'Security': 'Detail security features and considerations. Include authentication, data protection, and known security measures.',
            'Troubleshooting': 'List common issues and their solutions. Include debugging tips and error resolution steps.'
        };
        const prompt = `Generate content for the "${template}" section of a GitHub README.md file.

      Instructions: ${templatePrompts[template]}

      Current README content:
      ${currentMarkdown}

      Codebase content:
      ${codebaseContent}

      Requirements:
      1. Do NOT include any section headings (#, ##, ###) AT ALL IN YOUR RESPONSE. THIS IS A VERY STRICT RULE. MAKE SURE THE RESPONSE DOES NOT CONTAIN ANY HEADINGS, AGAIN.
      2. Make content specific to this project
      3. Keep content concise but informative
      4. Use proper markdown formatting
      5. Don't repeat information from other sections

      Generate only the section content in markdown format.`;
        const result = yield model.generateContent(prompt);
        const sectionContent = result.response.text();
        res.json({ section: sectionContent });
    }
    catch (error) {
        console.error('Error generating template section:', error);
        res.status(500).json({ error: 'Failed to generate template section' });
    }
}));
exports.default = router;
