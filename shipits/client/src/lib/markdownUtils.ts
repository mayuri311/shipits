/**
 * This utility provides functions for manipulating markdown strings,
 * specifically for creating clean, truncated previews.
 */

/**
 * Removes all markdown image tags and truncates the text to a specified length.
 * 
 * @param markdown - The input markdown string.
 * @param maxLength - The maximum length of the output string (default: 150).
 * @returns A string with images removed and text truncated.
 */
export const truncateMarkdown = (markdown: string, maxLength: number = 150): string => {
  if (!markdown) {
    return "";
  }

  // 1. Remove all markdown image tags (![...](...))
  const textOnly = markdown.replace(/!\[.*?\]\((.*?)\)/g, '');

  // 2. Remove any remaining HTML tags for safety
  const sanitizedText = textOnly.replace(/<[^>]*>/g, '');

  // 3. Trim whitespace from the beginning and end
  const trimmedText = sanitizedText.trim();

  // 4. Truncate the text if it's longer than the max length
  if (trimmedText.length <= maxLength) {
    return trimmedText;
  }

  // Find the last space within the maxLength to avoid cutting words
  const truncated = trimmedText.substring(0, maxLength);
  const lastSpaceIndex = truncated.lastIndexOf(' ');
  
  if (lastSpaceIndex > 0) {
    return truncated.substring(0, lastSpaceIndex) + '...';
  }
  
  // If no space is found, just cut the word and add ellipsis
  return truncated + '...';
};
