/**
 * Detect if running on macOS
 */
export function isMac(): boolean {
  if (typeof navigator !== "undefined") {
    return navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  }
  return false;
}

/**
 * Get the modifier key name for the current platform
 */
export function getModKey(): string {
  return isMac() ? "⌘" : "Ctrl";
}

/**
 * Format a keyboard shortcut for display
 */
export function formatShortcut(key: string, withShift = false): string {
  const mod = getModKey();
  if (withShift) {
    return isMac() ? `${mod}⇧${key}` : `${mod}+Shift+${key}`;
  }
  return isMac() ? `${mod}${key}` : `${mod}+${key}`;
}
