import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { fetchRepoTree, fetchFileContent, convertIpynbToMarkdown } from './github-code-fetch'; // Import necessary functions
import { supabase } from '../middleware/supabase';

const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

router.post('/generate-section', async (req, res) => {
    const userId = req.headers['user-id'] as string;
    const readmeId = req.body.readmeId;
    const { title, level, description, useAI } = req.body;

    if (!useAI) {
        return res.json({
            section: ''
        });
    }

    try {
        const { title, level, description, repoUrl, currentMarkdown, codebaseContent, useAI } = req.body;

        const { data: user } = await supabase
            .from('users')
            .select('is_admin')
            .eq('id', userId)
            .single();

        if (!user?.is_admin) {
            const { count: sectionCount } = await supabase
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

        const { error: sectionError } = await supabase
            .from('section_generations')
            .insert([{
                readme_id: readmeId,
                user_id: userId,
                // created_at: new Date().toISOString()
            }]);

        if (sectionError) throw sectionError;


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

        const result = await model.generateContent(prompt);
        const sectionContent = result.response.text();

        res.json({ section: sectionContent });
    } catch (error) {
        console.error('Error generating section:', error);
        res.status(500).json({ error: 'Failed to generate section' });
    }
});

router.post('/generate-template-section', async (req, res) => {
    const userId = req.headers['user-id'] as string;
    const readmeId = req.body.readmeId;

    try {
        await supabase
            .from('section_generations')
            .insert([{ readme_id: readmeId, user_id: userId }]);

        const { template, repoUrl, currentMarkdown, codebaseContent } = req.body;
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const templatePrompts: { [key: string]: string } = {
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

        const result = await model.generateContent(prompt);
        const sectionContent = result.response.text();

        res.json({ section: sectionContent });
    } catch (error) {
        console.error('Error generating template section:', error);
        res.status(500).json({ error: 'Failed to generate template section' });
    }
});

export default router;
