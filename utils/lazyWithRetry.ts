import React from 'react';

/**
 * Enhanced React.lazy with automatic retry on chunk loading failure.
 * Solves "TypeError: error loading dynamically imported module" during hot reloads,
 * dev server restarts, or transient network timeouts.
 */
export function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  retries = 2,
  interval = 800
): React.LazyExoticComponent<T> {
  return React.lazy(async () => {
    let lastError: any;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await factory();
      } catch (err) {
        lastError = err;
        if (attempt < retries) {
          // Wait before retrying (exponential backoff)
          await new Promise((resolve) => setTimeout(resolve, interval * Math.pow(1.5, attempt)));
        }
      }
    }
    throw lastError;
  });
}
