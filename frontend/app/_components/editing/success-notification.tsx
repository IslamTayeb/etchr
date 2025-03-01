"use client"

import * as React from "react"
import { Plus, Github, CircleCheckBig, Coffee } from 'lucide-react'
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface SuccessNotificationProps {
  isOpen: boolean
  onClose: () => void
  onGenerateAnother: () => void
  repoUrl: string
}

export function SuccessNotification({
  isOpen,
  onClose,
  onGenerateAnother,
  repoUrl,
}: SuccessNotificationProps) {
  const handleViewRepo = () => {
    window.open(repoUrl, '_blank')
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center text-primary">
            {/* <Check className="mr-2 h-8 w-8 stroke-[3]" /> */}
            <CircleCheckBig className="mr-3 h-6 w-6 stroke-[2.5]" />
            Success!
          </DialogTitle>
        </DialogHeader>
        <div className="">
          <p className="text-lg mb-1.5 text-card-foreground">
            Your README.md file has been successfully exported to GitHub.
          </p>
          <p className="text-sm text-muted-foreground">
            What would you like to do next?
          </p>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex flex-row gap-4 mt-4">
            <Button onClick={onGenerateAnother} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" />
              Generate Another
            </Button>
            <Button onClick={handleViewRepo} variant="outline" className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90">
              <Github className="mr-2 h-4 w-4" />
              View on GitHub
            </Button>
          </div>
          <Button
            variant="outline"
            className="z-50 flex w-full bg-card"
            onClick={() => window.open("https://buymeacoffee.com/islamtayeb", "_blank")}
          >
            <Coffee className="h-4 w-4" />
            Buy me an API call!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
