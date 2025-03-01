"use client"
import React, { useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import styles from "./InfiniteFeedbackCarousel.module.css"

type Feedback = {
  id: number
  comment: string
  author: string
  role: string
  avatar: string
}

const feedbackData: Feedback[] = [
  {
    id: 1,
    comment: "Finally found a tool that makes maintaining documentation for open source contributions feel effortless.",
    author: "Aryan Mathur",
    role: "Software Engineer @ Roblox",
    avatar: "/aryan.jpeg?height=40&width=40",
  },
  {
    id: 2,
    comment: "Etchr helped me transform years of private projects into a polished GitHub portfolio.",
    author: "Irfan Yilmaz",
    role: "SWE Intern @ Google",
    avatar: "/irfan.jpeg?height=40&width=40",
  },
  {
    id: 3,
    comment: "Been using Etchr to clean up old side projects - it's surprisingly good at understanding codebases.",
    author: "Christian Okokhere",
    role: "Software Engineer @ Microsoft",
    avatar: "/christian.jpeg?height=40&width=40",
  },
  {
    id: 4,
    comment: "The ease of use saved me hours of documentation work for our internal repositories.",
    author: "Kartikeye Gupta",
    role: "Student Founder @ Resolve AI",
    avatar: "/tiki.jpeg?height=40&width=40",
  },
  {
    id: 5,
    comment: "Perfect for turning prototype code into properly documented projects - essential for onboarding interns.",
    author: "Perrin Myerson",
    role: "Founder @ GovGoose (YC W25)",
    avatar: "/perrin.jpeg?height=40&width=40",
  },
]

export default function InfiniteFeedbackCarousel() {
  const carouselRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const carousel = carouselRef.current
    if (carousel) {
      const scrollWidth = carousel.scrollWidth
      const animationDuration = scrollWidth / 50
      carousel.style.setProperty("--scroll-width", `${scrollWidth}px`)
      carousel.style.setProperty("--animation-duration", `${animationDuration}s`)
    }
  }, [])

  return (
    <div className={styles.carouselContainer}>
      <div className={styles.fadeLeft} />
      <div className={styles.fadeRight} />
      <div className={styles.carousel} ref={carouselRef}>
        <div className={styles.carouselTrack}>
          {[...feedbackData, ...feedbackData].map((feedback, index) => (
            <Card key={`${feedback.id}-${index}`} className={`${styles.feedbackCard} border-dashed`}>
              <CardContent className="p-4">
                <div className="flex items-center space-x-4 mb-2">
                  <Avatar>
                    <AvatarImage src={feedback.avatar} alt={feedback.author} />
                    <AvatarFallback>
                      {feedback.author
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold">{feedback.author}</p>
                    <p className="text-xs text-muted-foreground mt-[0.1rem]">{feedback.role}</p>
                  </div>
                </div>
                <p className="text-sm">{feedback.comment}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
