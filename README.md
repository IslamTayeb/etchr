# Etchr: Automated GitHub README.md Generator
Etchr is a web application that simplifies the creation of comprehensive and professional README.md files for your GitHub projects. By analyzing your codebase and using your selected AI provider, Etchr generates a detailed README.md while letting you bring your own API key.

## Features
* **Automated README Generation:** Analyzes your GitHub repository and generates a structured README.md file using your selected AI provider.
* **AI-Powered Content Suggestions:**  Provides intelligent suggestions for various README sections, ensuring complete and informative documentation.
* **Customizable Sections:**  Allows you to easily add, edit, reorder, and customize sections (Features, Installation, Usage, etc.) to perfectly match your project's needs.
* **Drag-and-Drop File/Image Upload:**  Supports direct uploading of images and other files, storing them in your GitHub repository and automatically adding them to your README.
* **Excalidraw Integration:**  Seamlessly integrate professional diagrams and sketches created with Excalidraw into your README.
* **GitHub Repository Connection:** Directly connects to your GitHub repositories for seamless file management and version control.
* **Real-time Markdown Preview:** Provides a live preview of your README as you make changes.
* **Intuitive Interface:** User-friendly interface for easy navigation and efficient README creation.
* **Private Repository Support:** Supports both public and private repositories.
* **Bring Your Own API Key:** Use your own OpenAI, Anthropic, Gemini, Azure OpenAI, or AWS Bedrock credentials for AI generation.

## Usage
1. **Authenticate with GitHub:**  Connect your GitHub account to Etchr to access your repositories.
2. **Select a Repository:** Choose the repository for which you want to generate a README.
3. **Select Files/Directories:** Choose the files and directories in your repository that you want Etchr to analyze for README content generation.  Larger projects may take longer to process.
4. **Generate README:** Let Etchr generate a draft README.md using your configured AI provider.
5. **Review and Edit:** Review and customize the generated README.md in the integrated Markdown editor. You can add additional sections, images, files, and edit content directly.
6. **Submit to GitHub:** Once satisfied, submit the generated README.md back to your GitHub repository. You can choose to replace your current README.md or keep both the existing and generated ones.

## Installation
Etchr is a web application; no installation is required. Simply navigate to the application URL in your web browser.

## Technologies Used (Tech Stack)
* **Frontend:** Next.js, React, Tailwind CSS, Monaco Editor, React Markdown, Excalidraw, Framer Motion, @radix-ui components
* **Backend:** Vercel Functions, Next.js API routes, TypeScript, Axios, Vercel AI SDK, Supabase
* **Database:** Supabase (PostgreSQL)

## Deployment
Deploy the `frontend` directory as the Vercel project root. The app now serves both the frontend and backend API from the same Vercel deployment.
The free Vercel function duration is capped at 60 seconds, so large repositories may require selecting fewer files.

Required Vercel environment variables:
* `GITHUB_CLIENT_ID`
* `GITHUB_CLIENT_SECRET`
* `FRONTEND_URL` (for production, `https://www.etchr.dev`)
* `NEXT_PUBLIC_SUPABASE_URL`
* `NEXT_PUBLIC_SUPABASE_ANON_KEY`
* `SUPABASE_SERVICE_ROLE_KEY`

Set the GitHub OAuth callback URL to:
`https://www.etchr.dev/api/auth/github/callback`

## API Documentation
The backend exposes several API endpoints for authentication, README generation, file management, and more.  Detailed documentation is available within the codebase comments and can be provided upon request.

## Dependencies
The Vercel app dependencies are listed in `frontend/package.json`.

## Contributing
Contributions are welcome! Please open an issue or submit a pull request.

*README.md was made with [Etchr](https://etchr.dev)*
