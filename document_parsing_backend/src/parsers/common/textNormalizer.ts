export class TextNormalizer {
  /**
   * Normalizes newlines by replacing Windows \r\n with \n.
   */
  public static normalizeLineBreaks(text: string): string {
    return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  }

  /**
   * Collapses duplicate spaces, tabs, and trims the string.
   */
  public static normalizeWhitespace(text: string): string {
    return text.replace(/[ \t]+/g, ' ').trim();
  }

  /**
   * Performs full text cleanup (normalizes newlines, spaces, and trims).
   */
  public static cleanText(text: string): string {
    if (!text) return '';
    const unifiedBreaks = this.normalizeLineBreaks(text);
    // Remove extra trailing/leading space of each line, but keep line structure
    return unifiedBreaks
      .split('\n')
      .map((line) => this.normalizeWhitespace(line))
      .join('\n')
      .replace(/\n{3,}/g, '\n\n') // Collapse excessive blank lines to max 2 newlines
      .trim();
  }
}
export default TextNormalizer;
