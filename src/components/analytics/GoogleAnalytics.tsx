'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

interface GoogleAnalyticsProps {
  measurementId: string;
}

export default function GoogleAnalytics({ measurementId }: GoogleAnalyticsProps) {
  const pathname = usePathname();
  const lastTrackedRef = useRef<string | null>(null);

  useEffect(() => {
    const currentRoute = pathname ?? '/';
    const trackingKey = `${measurementId}:${currentRoute}`;

    if (lastTrackedRef.current === trackingKey) {
      return;
    }

    lastTrackedRef.current = trackingKey;

    const sendPageView = (attempt = 0) => {
      const maxAttempts = 20;

      if (typeof window === 'undefined') {
        return;
      }

      window.dataLayer = window.dataLayer || [];
      window.gtag = window.gtag || function gtag(...args: unknown[]) {
        window.dataLayer.push(args);
      };

      if (typeof window.gtag === 'function') {
        window.gtag('config', measurementId, {
          page_path: currentRoute,
          page_location: window.location.href,
          page_title: document.title,
        });

        window.gtag('event', 'page_view', {
          page_path: currentRoute,
          page_location: window.location.href,
          page_title: document.title,
        });
        return;
      }

      if (attempt < maxAttempts) {
        window.setTimeout(() => sendPageView(attempt + 1), 100);
      }
    };

    sendPageView();
  }, [measurementId, pathname]);

  return null;
}
