'use client';

import { useEffect, useRef } from 'react';

type HotkeyCallback = (keyboardEvent: KeyboardEvent) => void;

interface HotkeyOptions {
  allowInInputs?: boolean;
  preventDefault?: boolean;
}

export function useHotkeys(
  keyCombo: string,
  callback: HotkeyCallback,
  options: HotkeyOptions = {}
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const keysBuffer = useRef<string[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const { allowInInputs = false, preventDefault = true } = options;

      const target = event.target as HTMLElement;
      if (
        !allowInInputs &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      const key = event.key.toLowerCase();

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      keysBuffer.current.push(key);

      if (keysBuffer.current.length > 5) {
        keysBuffer.current.shift();
      }

      timeoutRef.current = setTimeout(() => {
        keysBuffer.current = [];
      }, 1000);

      const normalizedCombo = keyCombo.toLowerCase().trim();

      if (normalizedCombo.includes(' ')) {
        const sequence = normalizedCombo.split(' ');
        const bufferSlice = keysBuffer.current.slice(-sequence.length);
        const isMatch = sequence.every((val, index) => bufferSlice[index] === val);
        if (isMatch) {
          if (preventDefault) event.preventDefault();
          keysBuffer.current = [];
          callbackRef.current(event);
        }
      } else {
        const parts = normalizedCombo.split('+');
        let match = true;
        
        for (const part of parts) {
          if (part === 'ctrl' || part === 'control') {
            match = match && (event.ctrlKey || event.metaKey);
          } else if (part === 'meta' || part === 'cmd' || part === 'command') {
            match = match && event.metaKey;
          } else if (part === 'shift') {
            match = match && event.shiftKey;
          } else if (part === 'alt') {
            match = match && event.altKey;
          } else {
            match = match && (key === part || event.code.toLowerCase() === part);
          }
        }

        if (match) {
          if (preventDefault) event.preventDefault();
          keysBuffer.current = [];
          callbackRef.current(event);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [keyCombo, options]);
}
