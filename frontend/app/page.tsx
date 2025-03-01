'use client'

import { Button } from "@/components/ui/button"
import { Sparkles, ArrowRight, LucideIcon, Github, Pen, Upload, PlusCircle, Boxes } from 'lucide-react'
import { motion } from "framer-motion"
import InfiniteFeedbackCarousel from "./_components/landing/InfiniteFeedbackCarousel"
import { EtchrLogo } from "@/public/EtchrLogo"
import { ImageHighlighter } from "./_components/landing/image-highlights"
import { UserStats } from "./_components/landing/user-stats"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col overflow-hidden">
      <motion.div
        className="grid-pattern absolute inset-0 pointer-events-none"
        initial={{ opacity: 0, scale: 1.1 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
      />
      <motion.div
        className="soft-light"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2, ease: "easeOut" }}
      />
      <header className="container mx-auto py-6 px-6 flex justify-between items-center relative z-10">
        <div className="flex items-center text-primary">
          <EtchrLogo className="h-8 mb-0.5 mr-1" />
          <span className="text-2xl font-bold ml-2">Etchr</span>

        </div>
        <motion.div
          className="flex items-center space-x-4"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay:0.25, ease: "easeOut" }}
        >
          <UserStats />
        </motion.div>
      </header>

      <main className="flex-grow container mx-auto px-6 py-11 relative z-10">
        <motion.section
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
        >
          <h1 className="text-5xl md:text-6xl font-extrabold mb-5 text-primary">
            Craft Perfect README.md Files
          </h1>
          <p className="text-2xl text-secondary-foreground mb-8 max-w-2xl mx-auto">
            Etchr is an <span className="font-semibold text-accent-foreground">automated GitHub README.md generator</span> that creates professional documentation in <span className="font-semibold text-accent-foreground">5 clicks</span>.
          </p>
          <Button
            size="lg"
            variant={"default"}
            className="bg-primary px-6 py-6 text-primary-foreground button-hover"
            onClick={() => window.location.href = '/generate'}
          >
            <Sparkles className="mr-2 h-8 w-8 stroke-[2.2]" />
            <span className="text-base font-medium">Try Etchr</span>
            <ArrowRight className="ml-2 h-7 w-7 stroke-[2.2] transition-transform duration-300 transform group-hover:translate-x-1" />
          </Button>
          <p className="text-sm text-muted-foreground mt-3">No sign up or payment required</p>
        </motion.section>

        {/* <section className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 + index * 0.1 }}
            >
              <Card className="bg-card dashed-border h-full">
                <CardContent className="p-6">
                  <feature.icon className={`h-12 w-12 text-primary mb-4 ${feature.icon === ExcalidrawLogo ? 'p-[0.28rem]' : ''}`} />
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-base text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </section> */}

        {/* <motion.section
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.9 }}
        > */}
        {/* <h2 className="text-3xl font-bold mb-6">How It Works</h2> */}
        <div className="flex justify-center mb-14">
          <ImageHighlighter imageSrc="/screenshot.png" highlights={highlights} />
        </div>
        {/* </motion.section> */}

        <motion.section
          className="mb-14"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.1 }}
        >
          <h2 className="text-xl font-medium mb-3 text-center text-muted-foreground">User Testimonials</h2>
          <InfiniteFeedbackCarousel />
        </motion.section>

        <motion.section
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.5 }}
        >
          <h2 className="text-3xl font-bold mb-6">Ready to elevate your documentation?</h2>
          <Button
            size="lg"
            variant={"default"}
            className="bg-primary text-primary-foreground button-hover"
            onClick={() => window.location.href = '/generate'}
          >
            <Sparkles className="mr-2 h-5 w-5" />
            Try Etchr
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <p className="text-sm text-muted-foreground mt-3">No sign up or payment required</p>
        </motion.section>
      </main>

      <footer className="border-t border-border text-center text-muted-foreground relative z-10 footer bg-card">
        <p>&copy; {new Date().getFullYear()} Etchr. All rights reserved.</p>
      </footer>
    </div>
  )
}

// const features = [
//   {
//     icon: FileChartPie,
//     title: "File Analysis",
//     description: "Automatic analysis of your repository's content to generate comprehensive documentation using Google's Gemini Flash."
//   },
//   {
//     icon: FileCode,
//     title: "Intuitive Editor",
//     description: "VS Code-inspired markdown editor, drag and drop files, easy embedding, and more quality of life features to streamline your workflow."
//   },
//   {
//     icon: Blocks,
//     title: "Customizable Sections",
//     description: "Easily generate, rearrange, customize, and edit sections to match your project's needs with AI-powered suggestions."
//   },
//   {
//     icon: ExcalidrawLogo,
//     title: "Diagram Integration",
//     description: "Built-in Excalidraw integration to create and embed professional diagrams, perfect for system architecture overviews and workflows."
//   }
// ]

type Highlight = {
  id: string;
  x: number;
  y: number;
  title: string;
  description: string;
  orientation: "bottom-right" | "top-right" | "top-left" | "bottom-left";
  icon: LucideIcon;
};

const highlights: Highlight[] = [
  { id: "1", x: 12, y: 25, title: "Section Management", description: "Intuitive drag-and-drop interface for organizing README sections with real-time markdown preview and full customization.", orientation: "bottom-right", icon: Boxes },
  { id: "3", x: 19.5, y: 63, title: "LLM Generation", description: "AI-powered content generation using Google's Gemini to create detailed, context-aware documentation from your codebase.", orientation: "bottom-right", icon: Sparkles },
  { id: "2", x: 11, y: 90, title: "Quick Add", description: "Rapidly insert pre-built template sections like Features, Installation, and API Documentation with AI-assisted content population.", orientation: "bottom-right", icon: PlusCircle },
  { id: "4", x: 40, y: 47, title: "Drag-and-Drop Files", description: "Seamlessly upload and embed images and files directly into your documentation with automatic GitHub repository storage.", orientation: "bottom-right", icon: Upload },
  { id: "5", x: 82, y: 79.5, title: "Excalidraw Integration", description: "Create and embed professional diagrams and sketches directly within your documentation using the built-in Excalidraw editor.", orientation: "bottom-right", icon: Pen },
  { id: "6", x: 86.5, y: 4.5, title: "GitHub Integration", description: "Direct integration with GitHub repositories for streamlined documentation management and version control.", orientation: "bottom-left", icon: Github }
]
