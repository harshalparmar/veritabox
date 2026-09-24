import { useEffect, useCallback, useState } from 'react';

// SECURITY NOTE: This hook is a UI-level deterrent only. It blocks common
// keyboard shortcuts and right-click but is trivially bypassed by DevTools,
// browser extensions, or disabling JavaScript. Do not rely on it for
// security-critical decisions. Server-side validation is the real boundary.

export function useLockdown(active: boolean) {
  const [isFocusLost, setIsFocusLost] = useState(false);

  const handleContextMenu = useCallback((e: MouseEvent) => {
    if (active) e.preventDefault();
  }, [active]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!active) return;

    // Block F12 (DevTools)
    if (e.key === 'F12') e.preventDefault();

    // Block Print Screen
    if (e.key === 'PrintScreen' || e.keyCode === 44) e.preventDefault();

    // Block Ctrl/Cmd shortcuts: C (copy), V (paste), U (view source), I/J (inspect)
    if (e.ctrlKey || e.metaKey) {
      if (['c', 'v', 'u', 'i', 'j'].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    }

    // Block Ctrl+Shift+I/J (inspect)
    if (e.ctrlKey && e.shiftKey) {
      if (['i', 'j'].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    }
  }, [active]);

  const handleWindowBlur = useCallback(() => {
    if (active) setIsFocusLost(true);
  }, [active]);

  const handleWindowFocus = useCallback(() => {
    setIsFocusLost(false);
  }, []);

  useEffect(() => {
    if (!active) {
      document.body.style.userSelect = 'auto';
      setIsFocusLost(false);
      return;
    }

    document.body.style.userSelect = 'none';

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      document.body.style.userSelect = 'auto';
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [active, handleContextMenu, handleKeyDown, handleWindowBlur, handleWindowFocus]);

  // Note: Alt+Tab, screen recording tools, and browser settings pages cannot be
  // blocked via JavaScript. The window.blur event is the best available signal.
  return { isFocusLost };
}
