import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { BlurFade } from "@/components/ui/blur-fade"
import { LucideIcon } from "lucide-react"

interface Highlight {
    title: string
    id: string
    x: number
    y: number
    description: string
    orientation: "top-right" | "top-left" | "bottom-right" | "bottom-left"
    icon: LucideIcon
}

interface ImageHighlighterProps {
    imageSrc: string
    highlights: Highlight[]
}

export function ImageHighlighter({ imageSrc, highlights }: ImageHighlighterProps) {
    const [hoveredCard, setHoveredCard] = useState<string | null>(null)

    const getCardPosition = (orientation: string, x: number, y: number) => {
        switch (orientation) {
            case "top-right":
                return { left: `${x + 0.25}%`, top: `${y - 0.75}%` }
            case "top-left":
                return { right: `${100 - x + 0.25}%`, top: `${y - 0.75}%` }
            case "bottom-right":
                return { left: `${x + 0.25}%`, top: `${y + 0.75}%` }
            case "bottom-left":
                return { right: `${100 - x - 0.5}%`, top: `${y + 0.5}%` }
            default:
                return { left: `${x + 0.25}%`, top: `${y + 0.75}%` }
        }
    }

    return (
        <div className="relative max-w-7xl mx-auto">
            <BlurFade direction="up" blur="8px" offset={50} key={imageSrc} delay={0.3} duration={0.6} inView>
                <img src={imageSrc || "/placeholder.svg"} alt="Dashboard screenshot" className="w-full h-auto shadow-2xl shadow-card rounded-md" />
            </BlurFade>
            {highlights.map((highlight, index) => (
                <React.Fragment key={highlight.id}>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.1 + index * 0.1, duration: 0.2 }}
                        className="absolute w-2.5 h-2.5 bg-accent-foreground/80 rounded-full cursor-pointer backdrop-blur-sm z-50"
                        style={{ left: `${highlight.x}%`, top: `${highlight.y}%`, transform: "translate(-50%, -50%)" }}
                    />
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 0.7, y: 0 }}
                        transition={{ delay: 1.1 + index * 0.1, duration: 0.2 }}
                        className="absolute w-2.5 h-2.5 bg-accent-foreground/100 rounded-full blur-[8px]"
                        style={{ left: `${highlight.x}%`, top: `${highlight.y}%`, transform: "translate(-50%, -50%)" }}
                    />
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.1 + index * 0.1, duration: 0.2 }}
                        className="absolute z-10"
                        style={getCardPosition(highlight.orientation, highlight.x, highlight.y)}
                        onMouseEnter={() => setHoveredCard(highlight.id)}
                        onMouseLeave={() => setHoveredCard(null)}
                    >
                        <div className={`bg-card rounded-lg shadow-card drop-shadow-lg border border-dashed border-border hover:z-100 text-left max-w-[15rem] p-2 ${highlight.orientation === "top-left" || highlight.orientation === "bottom-left" ? "text-right" : ""}`}>
                            <h4 className="font-bold text-foreground text-nowrap gap-10">
                                <highlight.icon className="h-4 w-4 inline items-center mr-1.5 mb-0.5" />
                                <span className="text-base leading-none">{highlight.title}</span>
                            </h4>
                            <AnimatePresence>
                                {hoveredCard === highlight.id && (
                                    <motion.div
                                        initial={{ opacity: 0, width: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto", width: "auto", transition: { duration: 0.125 } }}
                                        exit={{ opacity: 0, height: 0, width: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <p className="text-sm text-muted-foreground mt-1 break-words">
                                            {highlight.description}
                                        </p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </React.Fragment>
            ))}
        </div>
    )
}
