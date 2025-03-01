# Etchr: Automated GitHub README.md Generator
Etchr is a web application that simplifies the creation of comprehensive and professional README.md files for your GitHub projects.  By analyzing your codebase and leveraging the power of Google's Gemini AI, Etchr generates a detailed README.md, saving you time and effort.

## Features
* **Automated README Generation:** Analyzes your GitHub repository and generates a structured README.md file using Google's Gemini AI.
* **AI-Powered Content Suggestions:**  Provides intelligent suggestions for various README sections, ensuring complete and informative documentation.
* **Customizable Sections:**  Allows you to easily add, edit, reorder, and customize sections (Features, Installation, Usage, etc.) to perfectly match your project's needs.
* **Drag-and-Drop File/Image Upload:**  Supports direct uploading of images and other files, storing them in your GitHub repository and automatically adding them to your README.
* **Excalidraw Integration:**  Seamlessly integrate professional diagrams and sketches created with Excalidraw into your README.
* **GitHub Repository Connection:** Directly connects to your GitHub repositories for seamless file management and version control.
* **Real-time Markdown Preview:** Provides a live preview of your README as you make changes.
* **Intuitive Interface:** User-friendly interface for easy navigation and efficient README creation.
* **Private Repository Support:** Supports both public and private repositories.
* **Weekly Usage Limits:**  To ensure fair access to the AI, usage is capped.

## Usage
1. **Authenticate with GitHub:**  Connect your GitHub account to Etchr to access your repositories.
2. **Select a Repository:** Choose the repository for which you want to generate a README.
3. **Select Files/Directories:** Choose the files and directories in your repository that you want Etchr to analyze for README content generation.  Larger projects may take longer to process.
4. **Generate README:** Let Etchr generate a draft README.md using the power of Google's Gemini.
5. **Review and Edit:** Review and customize the generated README.md in the integrated Markdown editor. You can add additional sections, images, files, and edit content directly.
6. **Submit to GitHub:** Once satisfied, submit the generated README.md back to your GitHub repository. You can choose to replace your current README.md or keep both the existing and generated ones.

## Installation
Etchr is a web application; no installation is required. Simply navigate to the application URL in your web browser.

## Technologies Used (Tech Stack)
* **Frontend:** Next.js, React, Tailwind CSS, Monaco Editor, React Markdown, Excalidraw, Framer Motion, @radix-ui components
* **Backend:** Node.js, TypeScript, Express.js, Axios, Google Generative AI (@google/generative-ai), Supabase
* **Database:** Supabase (PostgreSQL)

## Configuration
No server-side configuration is needed.  The backend is deployed and managed; all configuration is handled through environment variables.

## API Documentation
The backend exposes several API endpoints for authentication, README generation, file management, and more.  Detailed documentation is available within the codebase comments and can be provided upon request.

## Dependencies
The project dependencies are listed in the `frontend/package.json` and `backend/package.json` files.

## Contributing
Contributions are welcome! Please open an issue or submit a pull request.

*README.md was made with [Etchr](https://etchr.dev)*