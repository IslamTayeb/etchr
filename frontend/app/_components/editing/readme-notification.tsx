'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileWarning, ArrowLeft, Replace, Copy } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

interface ReadmeNotificationProps {
  isOpen: boolean;
  onClose: () => void;
  onReplace: () => void;
  onKeepBoth: () => void;
  isSubmitting?: boolean;
}

export function ReadmeNotification({ isOpen, onClose, onReplace, onKeepBoth, isSubmitting }: ReadmeNotificationProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/80"
          onClick={onClose}
        >
          <div className="fixed inset-0 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{
                duration: 0.2,
                ease: [0.4, 0, 0.2, 1],
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <Card className="w-full max-w-md">
                <CardHeader>
                  <CardTitle className="flex items-center text-warning">
                    <FileWarning className="w-6 h-6 mr-2" />
                    Existing README.md Found
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isSubmitting ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
                      <p className="ml-3 text-muted-foreground">Submitting to GitHub...</p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">
                      An existing README.md file was found in the repository. What would you like to do?
                    </p>
                  )}
                </CardContent>
                <CardFooter className="flex flex-col space-y-2">
                  <Button
                    variant="default"
                    className="w-full justify-start"
                    onClick={onReplace}
                    disabled={isSubmitting}
                  >
                    <Replace className="w-4 h-4 mr-2" />
                    Replace Existing
                  </Button>
                  <Button
                    variant="secondary"
                    className="w-full justify-start"
                    onClick={onKeepBoth}
                    disabled={isSubmitting}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Keep Both
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={onClose}
                    disabled={isSubmitting}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Return to Editor
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
