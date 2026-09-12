'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

export function useKeyboardShortcuts() {
  const router = useRouter();
  const [showShortcutsModal, setShowShortcutsModal] = useState<boolean>(false);
  const pendingGKeyRef = useRef<boolean>(false);
  const gKeyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isTyping =
        activeElement &&
        (activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          (activeElement as HTMLElement).isContentEditable);

      // Handle Escape
      if (e.key === 'Escape') {
        if (showShortcutsModal) {
          setShowShortcutsModal(false);
        }
        return;
      }

      // If user is currently typing in an input/textarea, do not intercept normal keys
      if (isTyping) {
        return;
      }

      // Handle "?" (Shift + "/")
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setShowShortcutsModal((prev) => !prev);
        return;
      }

      // Handle "/" to focus active search input
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>(
          'input[type="text"], input[type="search"], input[placeholder*="Search" i], input[placeholder*="search" i]'
        );
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
        return;
      }

      // Handle 'g' sequence for quick navigation
      if (e.key === 'g' || e.key === 'G') {
        pendingGKeyRef.current = true;
        if (gKeyTimeoutRef.current) clearTimeout(gKeyTimeoutRef.current);
        gKeyTimeoutRef.current = setTimeout(() => {
          pendingGKeyRef.current = false;
        }, 1500);
        return;
      }

      if (pendingGKeyRef.current) {
        pendingGKeyRef.current = false;
        const key = e.key.toLowerCase();
        switch (key) {
          case 'o':
            router.push('/overview');
            break;
          case 'i':
            router.push('/incidents');
            break;
          case 'e':
            router.push('/employees');
            break;
          case 'd':
            router.push('/devices');
            break;
          case 't':
            router.push('/telemetry');
            break;
          case 'a':
            router.push('/anomalies');
            break;
          case 'r':
            router.push('/analytics');
            break;
          case 's':
            router.push('/settings');
            break;
          default:
            break;

        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (gKeyTimeoutRef.current) clearTimeout(gKeyTimeoutRef.current);
    };
  }, [router, showShortcutsModal]);

  return {
    showShortcutsModal,
    setShowShortcutsModal,
  };
}
