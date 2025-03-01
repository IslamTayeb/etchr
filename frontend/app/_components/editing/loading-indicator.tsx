import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface LoadingIndicatorProps {
  messages: string[];
  currentIndex: number;
  tokenCount: number; // Remove optional
  isComplete?: boolean;
}

export default function LoadingIndicator({
  messages,
  currentIndex,
  tokenCount
}: LoadingIndicatorProps) {
  const showTokenCount = messages[currentIndex]?.includes("Generating README");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75"
    >
      <div className="w-96 p-6 rounded-lg bg-card border border-border shadow-lg">
        <div className="space-y-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={messages[currentIndex]}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="text-center"
            >
              <h2 className="text-lg font-semibold text-primary mb-4">
                {messages[currentIndex]}
                {showTokenCount && tokenCount > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Processing {tokenCount.toLocaleString()} tokens
                  </p>
                )}
              </h2>
              <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ x: "-100%" }}
                  animate={{ x: "100%" }}
                  transition={{
                    repeat: Infinity,
                    duration: 1,
                    ease: "linear"
                  }}
                />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
