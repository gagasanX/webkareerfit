'use client';

import { useEffect } from 'react';

export default function GrammarlyAttributesCleaner() {
  useEffect(() => {
    // Remove Grammarly attributes from body
    if (document.body.hasAttribute('data-new-gr-c-s-check-loaded')) {
      document.body.removeAttribute('data-new-gr-c-s-check-loaded');
    }
    if (document.body.hasAttribute('data-gr-ext-installed')) {
      document.body.removeAttribute('data-gr-ext-installed');
    }
    
    // Create a mutation observer to continuously remove these attributes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes') {
          if (mutation.attributeName === 'data-new-gr-c-s-check-loaded' ||
              mutation.attributeName === 'data-gr-ext-installed') {
            document.body.removeAttribute(mutation.attributeName);
          }
        }
      });
    });
    
    // Start observing
    observer.observe(document.body, { 
      attributes: true,
      attributeFilter: ['data-new-gr-c-s-check-loaded', 'data-gr-ext-installed']
    });
    
    // Cleanup observer on unmount
    return () => {
      observer.disconnect();
    };
  }, []);

  return null;
}