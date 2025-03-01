// frontend/lib/token-counter.ts
// frontend/lib/token-counter.ts
export function countFileTokens(content: string): number {
    // Handle Jupyter notebook content
    if (content.startsWith('# Jupyter Notebook Conversion')) {
      // Split into lines and filter out empty ones
      const lines = content.split('\n').filter(line => line.trim().length > 0);

      let totalTokens = 0;
      for (const line of lines) {
        // Split into words, handling code blocks and output blocks properly
        const words = line.split(/\s+/).filter(word => word.length > 0);

        for (const word of words) {
          if (word.length <= 4) {
            totalTokens += 1;
          } else {
            totalTokens += Math.ceil(word.length / 4);
          }
        }

        // Add tokens for special characters and formatting
        const specialChars = line.match(/[^a-zA-Z0-9\s]/g)?.length || 0;
        totalTokens += specialChars;
      }

      return totalTokens;
    }

    // Regular content handling
    const words = content.split(/\s+/);
    let totalTokens = 0;

    for (const word of words) {
      if (word.length <= 4) {
        totalTokens += 1;
      } else {
        totalTokens += Math.ceil(word.length / 4);
      }
    }

    const specialChars = content.match(/[^a-zA-Z0-9\s]/g)?.length || 0;
    totalTokens += specialChars;

    return totalTokens;
  }
