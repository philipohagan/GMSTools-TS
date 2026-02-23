/**
 * Utility functions for console output
 */

/**
 * ANSI color codes for console output
 */
export const colors = {
  reset: '\x1b[0m',
  yellow: '\x1b[33m'
};

/**
 * Colorize text in yellow
 * @param text The text to colorize
 * @returns The colorized text
 */
export function yellow(text: string | number): string {
  return `${colors.yellow}${text}${colors.reset}`;
}
